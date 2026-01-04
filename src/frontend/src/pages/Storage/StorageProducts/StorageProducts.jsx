// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { api } from "../../../api/apiClient";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import MessageBox from "../../../components/MessageBox";
import ViewDetailsModal from "./Modals/ViewDetailsModal";
import AddModal from "./Modals/AddModal";
import RemoveModal from "./Modals/RemoveModal";
import TransferModal from "./Modals/TransferModal";
import QuickLocationModal from "./Modals/QuickLocationModal";
import "../../../styles/PagesStyles/baseListPage.css";

// === COMPONENT ===
/**
 * StorageProducts page - Manage products in warehouse locations
 * Displays aggregated view of products across all warehouse locations
 * Supports adding products to locations, removing from locations, and transferring between locations
 * Includes advanced filtering by price, category, location, and stock status
 * Features quick location creation and navigation to product details
 */
export default function StorageProducts() {
  // === STATE ===
  // Router
  const navigate = useNavigate(); // For navigation to product details page

  // Data state
  const [products, setProducts] = useState([]); // Array of products with location data from API
  const [pageNumber, setPageNumber] = useState(1); // Current page number for pagination
  const [hasMore, setHasMore] = useState(true); // Whether more pages are available
  const [loading, setLoading] = useState(false); // Loading indicator for API requests
  const [initialDataLoaded, setInitialDataLoaded] = useState(false); // Flag to prevent premature fetches

  // Selection state
  const [selectedProduct, setSelectedProduct] = useState(null); // Currently selected product row
  const [selectedProductIdToRestore, setSelectedProductIdToRestore] = useState(null); // Product ID to reselect after refresh

  // UI state
  const [showFilters, setShowFilters] = useState(false); // Toggle for filter panel visibility
  const [isDelayedRefresh, setIsDelayedRefresh] = useState(false); // Flag for debounced vs immediate fetch
  const [toast, setToast] = useState(null); // Toast notification state (message, type)

  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false); // Controls Details modal visibility
  const [showAddModal, setShowAddModal] = useState(false); // Controls Add Product modal visibility
  const [showRemoveModal, setShowRemoveModal] = useState(false); // Controls Remove Product modal visibility
  const [showTransferModal, setShowTransferModal] = useState(false); // Controls Transfer Product modal visibility
  const [showQuickLocationModal, setShowQuickLocationModal] = useState(false); // Controls Quick Location modal visibility

  // Reference data (loaded once at component mount)
  const [categories, setCategories] = useState(new Map()); // Map of category ID to name
  const [activeProducts, setActiveProducts] = useState([]); // List of all active products for Add modal dropdown
  const [allLocations, setAllLocations] = useState([]); // List of all warehouse locations

  // Add Product modal form state
  const [addForm, setAddForm] = useState({
    productId: "", // Selected product ID
    locationId: "", // Selected location ID
    quantity: 1, // Quantity to add
  });
  const [productSearchTerm, setProductSearchTerm] = useState(""); // Search input for product dropdown
  const [filteredProducts, setFilteredProducts] = useState([]); // Filtered products based on search
  const [showProductDropdown, setShowProductDropdown] = useState(false); // Controls product dropdown visibility

  // Remove Product modal form state
  const [removeForm, setRemoveForm] = useState({
    locationId: "", // Location to remove from
    quantity: 1, // Quantity to remove
  });

  // Transfer Product modal form state
  const [transferForm, setTransferForm] = useState({
    fromLocationId: "", // Source location
    toLocationId: "", // Destination location
    quantity: 1, // Quantity to transfer
  });

  // Quick Location modal form state
  const [quickLocationForm, setQuickLocationForm] = useState({
    zone: "", // Zone code (4 chars)
    col: "", // Column code (4 chars)
    shelf: "", // Shelf code (4 chars)
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState(""); // Main search input value
  const [filters, setFilters] = useState({
    minPrice: "", // Minimum price filter
    maxPrice: "", // Maximum price filter
    categoryId: "", // Category filter
    locationId: "", // Location filter
    minQuantity: "", // Minimum quantity filter
    maxQuantity: "", // Maximum quantity filter
    stockStatus: "", // Stock status filter (inStock, lowStock, outOfStock)
  });

  // Sort state
  const [sortColumn, setSortColumn] = useState("productName"); // Column to sort by (default: product name)
  const [sortDirection, setSortDirection] = useState("asc"); // Sort direction (default: ascending)

  // Refs
  const observerRef = useRef(null); // Ref for intersection observer (infinite scroll)
  const filtersRef = useRef(null); // Ref for filters panel (click-outside detection)

  // User context
  const user = JSON.parse(localStorage.getItem("user")); // Current logged-in user

  // === DATA FETCHING ===
  /**
   * Fetches products with warehouse location data from API
   * Supports pagination, filtering by search, category, location, price, and quantity
   * Handles stock status filtering (in stock, low stock, out of stock)
   * Restores selected product after fetch if selectedProductIdToRestore is set
   *
   * @param {number} page - Page number to fetch
   * @param {object} currentFilters - Filter values (minPrice, maxPrice, categoryId, locationId, minQuantity, maxQuantity, stockStatus)
   * @param {string} currentSearchQuery - Search query string
   * @param {string} currentSortColumn - Column to sort by
   * @param {string} currentSortDirection - Sort direction (asc/desc)
   */
  const fetchProducts = useCallback(async (
    page,
    currentFilters,
    currentSearchQuery,
    currentSortColumn,
    currentSortDirection
  ) => {
    try {
      setLoading(true);
      const source = axios.CancelToken.source();

      // Build API request parameters
      const params = {
        PageNumber: page,
        PageSize: 50,
      };

      // Add search term if provided
      if (currentSearchQuery) params.searchTerm = currentSearchQuery;

      // Add category filter if selected
      if (currentFilters.categoryId) params.categoryId = currentFilters.categoryId;

      // Add location filter if selected
      if (currentFilters.locationId) params.locationId = currentFilters.locationId;

      // Add price range filters if provided
      if (currentFilters.minPrice) params.minPrice = currentFilters.minPrice;
      if (currentFilters.maxPrice) params.maxPrice = currentFilters.maxPrice;

      // Handle stock status filter (converts to quantity ranges)
      if (currentFilters.stockStatus === "inStock") {
        params.minQuantity = 1; // At least 1 in stock
      } else if (currentFilters.stockStatus === "lowStock") {
        params.minQuantity = 1; // At least 1
        params.maxQuantity = 10; // But no more than 10 (low stock threshold)
      } else if (currentFilters.stockStatus === "outOfStock") {
        params.maxQuantity = 0; // Zero quantity
      } else {
        // Use custom quantity range if stock status not selected
        if (currentFilters.minQuantity) params.minQuantity = currentFilters.minQuantity;
        if (currentFilters.maxQuantity) params.maxQuantity = currentFilters.maxQuantity;
      }

      // Add sorting parameters
      if (currentSortColumn) params.orderBy = currentSortColumn;
      if (currentSortDirection) params.sortDirection = currentSortDirection;

      // Fetch from API
      const { items, totalPages } = await api.get("/products-in-warehouse/search-products-with-locations", {
        params,
        cancelToken: source.token,
      });

      if (items?.length) {
        setProducts(items);
        setHasMore(page < (totalPages || 1));

        // Restore selected product after fetch if needed (e.g., after add/remove/transfer)
        if (selectedProductIdToRestore) {
          const productToReselect = items.find(p => p.productId === selectedProductIdToRestore);
          if (productToReselect) {
            const row = {
              id: productToReselect.productId,
              productId: productToReselect.productId,
              productName: productToReselect.productName,
              productPrice: `$${productToReselect.productPrice.toFixed(2)}`,
              quantity: productToReselect.totalQuantity,
              locationCount: productToReselect.locations?.length || 0,
              categoryName: productToReselect.categoryName,
              rawData: productToReselect,
            };
            setSelectedProduct(row);
            // Details Modal will automatically show updated data if open
          }
          setSelectedProductIdToRestore(null);
        }
      } else {
        setProducts([]);
        setHasMore(false);
      }
    } catch (err) {
      // Ignore cancelled requests
      if (axios.isCancel(err)) return;
      console.error(err);
      setToast({ message: "Failed to load warehouse products.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedProductIdToRestore]);

  /**
   * Debounced fetch for search and number inputs
   * Adds 1000ms delay to avoid excessive API calls while typing
   */
  const debouncedFetchProducts = useCallback(() => {
    if (!initialDataLoaded) return;
    const delay = setTimeout(() => {
      setProducts([]);
      setPageNumber(1);
      fetchProducts(1, filters, searchQuery, sortColumn, sortDirection);
      setIsDelayedRefresh(false);
    }, 1000);

    return () => clearTimeout(delay);
  }, [filters, searchQuery, initialDataLoaded, sortColumn, sortDirection, fetchProducts]);

  /**
   * Immediate fetch for filter/sort changes
   * No debounce needed for explicit user actions (dropdowns, sorting)
   */
  const immediateFetchProducts = useCallback(() => {
    if (!initialDataLoaded) return;
    setProducts([]);
    setPageNumber(1);
    fetchProducts(1, filters, searchQuery, sortColumn, sortDirection);
  }, [sortColumn, sortDirection, filters, searchQuery, initialDataLoaded, fetchProducts]);

  // === EFFECTS ===
  /**
   * Fetch initial reference data on component mount
   * Loads categories, active products, and locations needed for dropdowns
   */
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [categoriesRes, activeProductsRes, locationsRes] = await Promise.all([
          api.get("/Categories"),
          api.get("/products/active"),
          api.get("/location", { params: { PageNumber: 1, PageSize: 1000 } }),
        ]);

        // Convert categories array to Map for O(1) lookup
        const categoriesMap = new Map(categoriesRes.items.map((c) => [c.id, c.name]));
        setCategories(categoriesMap);
        setActiveProducts(activeProductsRes || []);
        setAllLocations(locationsRes.items || []);
        setInitialDataLoaded(true);
      } catch (err) {
        console.error("Failed to fetch initial data", err);
        setToast({ message: "Failed to load initial page data.", type: "error" });
      }
    };

    fetchInitialData();
  }, []);

  /**
   * Trigger fetch based on delayed or immediate mode
   * Uses debounce for text/number inputs, immediate for dropdowns/sorting
   */
  useEffect(() => {
    if (isDelayedRefresh) {
      debouncedFetchProducts();
    } else {
      immediateFetchProducts();
    }
  }, [debouncedFetchProducts, immediateFetchProducts, isDelayedRefresh]);

  /**
   * Infinite scroll observer setup
   * Detects when user scrolls to bottom and loads next page
   */
  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setPageNumber((prev) => prev + 1);
      }
    });
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, hasMore]);

  /**
   * Load next page when pageNumber increments
   * Appends new data to existing products array
   */
  useEffect(() => {
    if (pageNumber > 1) {
      fetchProducts(pageNumber, filters, searchQuery, sortColumn, sortDirection);
    }
  }, [pageNumber, fetchProducts, filters, searchQuery, sortColumn, sortDirection]);

  /**
   * Close filters panel when clicking outside
   * Listens for clicks outside the filters panel and closes it if detected
   */
  useEffect(() => {
    if (!showFilters) return;

    const handleClickOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showFilters]);

  // === TABLE CONFIGURATION ===
  /**
   * Column definitions for the products table
   * Defines headers, widths, and sortability for each column
   */
  const columns = [
    { key: "productName", label: "Product Name", width: "20%", sortable: true },
    { key: "productSku", label: "SKU", width: "12%", sortable: true },
    { key: "productEan", label: "EAN", width: "12%", sortable: false },
    { key: "productPrice", label: "Price", width: "10%", sortable: true },
    { key: "quantity", label: "Total Quantity", width: "12%", sortable: true },
    { key: "locationCount", label: "No. of Locations", width: "12%", sortable: true },
    { key: "categoryName", label: "Category", width: "22%", sortable: true },
  ];

  /**
   * Transforms raw product data to table row format
   * Includes both display values and raw data for modals
   */
  const rows = products.map((product) => ({
    id: product.productId,
    productId: product.productId,
    productName: product.productName,
    productSku: product.productSKU || "—",
    productEan: product.productEAN || "—",
    productPrice: `$${product.productPrice.toFixed(2)}`,
    quantity: product.totalQuantity,
    locationCount: product.locations?.length || 0,
    categoryName: product.categoryName,
    rawData: product, // Full product data for modals
  }));

  // === EVENT HANDLERS ===
  /**
   * Handles search input changes
   * Uses debounced fetch to reduce API calls while typing
   * Clears selection when search query changes
   * @param {string} value - New search query value
   */
  const handleSearchChange = (value) => {
    setIsDelayedRefresh(true);
    setSearchQuery(value);
    setSelectedProduct(null);
  };

  /**
   * Handles filter input changes
   * Uses debounced fetch for number inputs (price, quantity)
   * Uses immediate fetch for dropdowns (category, location, stock status)
   * @param {Event} e - Change event from input/select elements
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Use debounce for number inputs to reduce API calls while typing
    if (name === "minPrice" || name === "maxPrice" || name === "minQuantity" || name === "maxQuantity") {
      setIsDelayedRefresh(true);
    } else {
      setIsDelayedRefresh(false);
    }
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handles row selection in the table
   * Toggles selection if null is passed
   * @param {object|null} row - Selected product row object
   */
  const handleRowSelect = (row) => {
    if (!row) {
      setSelectedProduct(null);
      return;
    }
    setSelectedProduct(row);
  };

  /**
   * Opens Details modal to view product information
   * Only works if a product is selected
   */
  const handleViewDetails = () => {
    if (selectedProduct) {
      setShowDetailsModal(true);
    }
  };

  /**
   * Handles double-click on row to open Details modal
   * Convenience method for quick access to product details
   * @param {object} row - Double-clicked product row object
   */
  const handleRowDoubleClick = (row) => {
    setSelectedProduct(row);
    setShowDetailsModal(true);
  };

  /**
   * Handles column header clicks for sorting
   * Cycles through: asc -> desc -> no sort
   * @param {string} column - Column key to sort by
   */
  const handleSort = (column) => {
    const colDef = columns.find((c) => c.key === column);
    if (!colDef || colDef.sortable === false) return;

    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // === ADD PRODUCT HANDLERS ===
  /**
   * Opens Add Product modal
   * Pre-fills product if one is selected from the list
   */
  const handleOpenAddModal = () => {
    // Pre-fill product if one is selected from the list
    if (selectedProduct?.rawData) {
      const product = activeProducts.find(p => p.productId === selectedProduct.productId);
      if (product) {
        setAddForm({
          productId: product.productId,
          locationId: "",
          quantity: 1
        });
        setProductSearchTerm(`${product.sku} - ${product.name}`);
      } else {
        setAddForm({ productId: "", locationId: "", quantity: 1 });
        setProductSearchTerm("");
      }
    } else {
      setAddForm({ productId: "", locationId: "", quantity: 1 });
      setProductSearchTerm("");
    }
    setFilteredProducts([]);
    setShowProductDropdown(false);
    setShowAddModal(true);
  };

  /**
   * Handles Add form field changes
   * Updates form state when user modifies fields
   * @param {Event} e - Change event from input/select elements
   */
  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handles product search input changes in Add modal
   * Filters products by SKU or name as user types
   * @param {string} value - New search term value
   */
  const handleProductSearchChange = (value) => {
    setProductSearchTerm(value);
    const term = value.toLowerCase();
    const filtered = activeProducts.filter(
      (p) =>
        p.sku.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term)
    );
    setFilteredProducts(filtered);
    setShowProductDropdown(true);
  };

  /**
   * Handles product selection from dropdown in Add modal
   * Sets selected product and updates search term display
   * @param {number} productId - Selected product ID
   */
  const handleProductSelect = (productId) => {
    setAddForm((prev) => ({ ...prev, productId }));
    const selectedProduct = activeProducts.find(p => p.productId === productId);
    if (selectedProduct) {
      setProductSearchTerm(`${selectedProduct.sku} - ${selectedProduct.name}`);
    }
    setShowProductDropdown(false);
    setFilteredProducts([]);
  };

  /**
   * Handles product input focus in Add modal
   * Shows all products in dropdown when input is focused
   */
  const handleProductInputFocus = () => {
    if (activeProducts.length > 0) {
      setFilteredProducts(activeProducts);
      setShowProductDropdown(true);
    }
  };

  /**
   * Handles product input blur in Add modal
   * Closes dropdown after short delay to allow click events to fire
   */
  const handleProductInputBlur = () => {
    setTimeout(() => setShowProductDropdown(false), 200);
  };

  /**
   * Handles keyboard events on product dropdown in Add modal
   * Closes dropdown when Escape key is pressed
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleProductDropdownKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowProductDropdown(false);
    }
  };

  /**
   * Submits Add Product form
   * Validates all fields are filled, then calls API to add product to warehouse
   * Refreshes product list after successful addition
   * @param {Event} e - Form submit event
   */
  const handleSubmitAdd = async (e) => {
    if (e) e.preventDefault();
    if (!addForm.productId || !addForm.locationId || !addForm.quantity) {
      setToast({ message: "Please fill all required fields.", type: "error" });
      return;
    }
    try {
      await api.post("/products-in-warehouse/add", {
        productId: parseInt(addForm.productId),
        locationId: parseInt(addForm.locationId),
        quantity: parseInt(addForm.quantity),
      });
      setToast({ message: "Product added to warehouse successfully!", type: "success" });
      setShowAddModal(false);
      immediateFetchProducts();
    } catch (err) {
      console.error(err);
      setToast({ message: err.response?.data?.message || "Failed to add product.", type: "error" });
    }
  };

  /**
   * Handles Enter key press in Add modal to submit form
   * Prevents default behavior and triggers form submission
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleAddModalKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAdd();
    }
  };

  // === REMOVE PRODUCT HANDLERS ===
  /**
   * Opens Remove Product modal
   * Only works if a product is selected
   * Resets form to default values
   */
  const handleOpenRemoveModal = () => {
    if (!selectedProduct) return;
    setRemoveForm({ locationId: "", quantity: 1 });
    setShowRemoveModal(true);
  };

  /**
   * Handles Remove form field changes
   * Updates form state when user modifies fields
   * @param {Event} e - Change event from input/select elements
   */
  const handleRemoveFormChange = (e) => {
    const { name, value } = e.target;
    setRemoveForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Submits Remove Product form
   * Validates all fields are filled, then calls API to remove product from warehouse
   * Fetches fresh product data after removal to update selection
   * Clears selection if product is completely removed from warehouse
   * @param {Event} e - Form submit event
   */
  const handleSubmitRemove = async (e) => {
    if (e) e.preventDefault();
    if (!removeForm.locationId || !removeForm.quantity) {
      setToast({ message: "Please fill all required fields.", type: "error" });
      return;
    }
    try {
      await api.post("/products-in-warehouse/remove", {
        productId: selectedProduct.productId,
        locationId: parseInt(removeForm.locationId),
        quantity: parseInt(removeForm.quantity),
      });
      setToast({ message: "Product removed from warehouse successfully!", type: "success" });
      setShowRemoveModal(false);

      // Fetch fresh product data immediately after removal
      try {
        const freshProductData = await api.get("/products-in-warehouse/search-products-with-locations", {
          params: {
            searchTerm: selectedProduct.rawData.productSKU,
            PageNumber: 1,
            PageSize: 1,
          },
        });

        // Update selectedProduct with fresh data if product still exists
        if (freshProductData.items?.length > 0) {
          const updatedProduct = freshProductData.items[0];
          const updatedRow = {
            id: updatedProduct.productId,
            productId: updatedProduct.productId,
            productName: updatedProduct.productName,
            productPrice: `$${updatedProduct.productPrice.toFixed(2)}`,
            quantity: updatedProduct.totalQuantity,
            locationCount: updatedProduct.locations?.length || 0,
            categoryName: updatedProduct.categoryName,
            rawData: updatedProduct,
          };
          setSelectedProduct(updatedRow);
          setSelectedProductIdToRestore(selectedProduct.productId);
        } else {
          // Product was completely removed from warehouse
          setSelectedProduct(null);
        }
      } catch {
        // If fetch fails, just clear selection
        setSelectedProduct(null);
      }

      immediateFetchProducts();
    } catch (err) {
      console.error(err);
      setToast({ message: err.response?.data?.message || "Failed to remove product.", type: "error" });
    }
  };

  /**
   * Handles Enter key press in Remove modal to submit form
   * Prevents default behavior and triggers form submission
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleRemoveModalKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitRemove();
    }
  };

  // === TRANSFER PRODUCT HANDLERS ===
  /**
   * Opens Transfer Product modal
   * Only works if a product is selected
   * Resets form to default values
   */
  const handleOpenTransferModal = () => {
    if (!selectedProduct) return;
    setTransferForm({ fromLocationId: "", toLocationId: "", quantity: 1 });
    setShowTransferModal(true);
  };

  /**
   * Handles Transfer form field changes
   * Updates form state when user modifies fields
   * @param {Event} e - Change event from input/select elements
   */
  const handleTransferFormChange = (e) => {
    const { name, value } = e.target;
    setTransferForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Submits Transfer Product form
   * Validates all fields are filled and source/destination are different
   * Calls API to transfer product between locations
   * Fetches fresh product data after transfer to update selection
   * @param {Event} e - Form submit event
   */
  const handleSubmitTransfer = async (e) => {
    if (e) e.preventDefault();
    if (!transferForm.fromLocationId || !transferForm.toLocationId || !transferForm.quantity) {
      setToast({ message: "Please fill all required fields.", type: "error" });
      return;
    }
    if (transferForm.fromLocationId === transferForm.toLocationId) {
      setToast({ message: "Source and destination locations must be different.", type: "error" });
      return;
    }
    try {
      await api.post("/products-in-warehouse/transfer", {
        productId: selectedProduct.productId,
        fromLocationId: parseInt(transferForm.fromLocationId),
        toLocationId: parseInt(transferForm.toLocationId),
        quantity: parseInt(transferForm.quantity),
      });
      setToast({ message: "Product transferred successfully!", type: "success" });
      setShowTransferModal(false);

      // Fetch fresh product data immediately after transfer
      const freshProductData = await api.get("/products-in-warehouse/search-products-with-locations", {
        params: {
          searchTerm: selectedProduct.rawData.productSKU,
          PageNumber: 1,
          PageSize: 1,
        },
      });

      // Update selectedProduct with fresh data if found
      if (freshProductData.items?.length > 0) {
        const updatedProduct = freshProductData.items[0];
        const updatedRow = {
          id: updatedProduct.productId,
          productId: updatedProduct.productId,
          productName: updatedProduct.productName,
          productPrice: `$${updatedProduct.productPrice.toFixed(2)}`,
          quantity: updatedProduct.totalQuantity,
          locationCount: updatedProduct.locations?.length || 0,
          categoryName: updatedProduct.categoryName,
          rawData: updatedProduct,
        };
        setSelectedProduct(updatedRow);
      }

      // Store productId to reselect after fetch completes
      setSelectedProductIdToRestore(selectedProduct.productId);

      immediateFetchProducts();
    } catch (err) {
      console.error(err);
      setToast({ message: err.response?.data?.message || "Failed to transfer product.", type: "error" });
    }
  };

  /**
   * Handles Enter key press in Transfer modal to submit form
   * Prevents default behavior and triggers form submission
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleTransferModalKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitTransfer();
    }
  };

  // === QUICK LOCATION HANDLERS ===
  /**
   * Opens Quick Location modal
   * Allows creating a new location without leaving the Add Product flow
   * Resets form to default values
   */
  const handleOpenQuickLocation = () => {
    setQuickLocationForm({ zone: "", col: "", shelf: "" });
    setShowQuickLocationModal(true);
  };

  /**
   * Handles Quick Location form field changes
   * Auto-converts input to uppercase and limits to 4 characters
   * @param {Event} e - Change event from input elements
   */
  const handleQuickLocationChange = (e) => {
    const { name, value } = e.target;
    setQuickLocationForm((prev) => ({ ...prev, [name]: value.toUpperCase().slice(0, 4) }));
  };

  /**
   * Submits Quick Location form
   * Checks if location already exists, then creates new location
   * Auto-selects the new location in the Add Product form
   * @param {Event} e - Form submit event
   */
  const handleSubmitQuickLocation = async (e) => {
    e.preventDefault();
    try {
      // Check if location already exists
      const exists = await api.get("/location/exists", {
        params: {
          zone: quickLocationForm.zone,
          col: quickLocationForm.col,
          shelf: quickLocationForm.shelf,
        },
      });

      if (exists) {
        setToast({ message: "Location already exists!", type: "error" });
        return;
      }

      // Create new location
      const response = await api.post("/location", {
        zone: quickLocationForm.zone,
        col: quickLocationForm.col,
        shelf: quickLocationForm.shelf,
      });

      const newLocation = response;
      setAllLocations((prev) => [...prev, newLocation]);
      setAddForm((prev) => ({ ...prev, locationId: newLocation.id }));
      setToast({ message: "Location created successfully!", type: "success" });
      setShowQuickLocationModal(false);
    } catch (err) {
      console.error(err);
      setToast({ message: err.response?.data?.message || "Failed to create location.", type: "error" });
    }
  };

  // === HELPER FUNCTIONS ===
  /**
   * Gets locations where the selected product exists
   * Used to populate dropdowns in Remove and Transfer modals
   * @returns {array} Array of location objects with locationId, locationCode, and quantity
   */
  const getProductLocations = () => {
    if (!selectedProduct?.rawData?.locations) return [];
    return selectedProduct.rawData.locations;
  };

  /**
   * Gets maximum quantity available at a specific location
   * Used to set max attribute on quantity inputs in Remove and Transfer modals
   * @param {number} locationId - Location ID to check
   * @returns {number} Maximum quantity at the location, or 0 if not found
   */
  const getMaxQuantityForLocation = (locationId) => {
    const loc = getProductLocations().find((l) => l.locationId === locationId);
    return loc ? loc.quantity : 0;
  };

  /**
   * Navigates to Products page with SKU search pre-filled
   * Allows quick access to full product details from warehouse view
   */
  const handleGoToProduct = () => {
    if (!selectedProduct?.rawData?.productSKU) return;
    navigate(`/organization/products?search=${encodeURIComponent(selectedProduct.rawData.productSKU)}`);
  };

  // === RENDER ===
  return (
    <div className="page-container">
      <Header
        user={user}
        onLogout={() => {
          localStorage.clear();
          window.location.href = "/";
        }}
      />
      <main className="page-content">
        <div className="base-list-wrapper">
          <div className="base-list-container">
            {/* === LEFT SIDEBAR === */}
            <aside className="sidebar">
              {/* Search Panel */}
              <div className="search-panel">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                <div className="search-buttons">
                  <button
                    className="btn-filter"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilters((prev) => !prev);
                    }}
                  >
                    Filters
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                {/* View Details Button */}
                <button
                  onClick={handleViewDetails}
                  className={`btn-action btn-view-details ${!selectedProduct ? "disabled" : ""}`}
                  disabled={!selectedProduct}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  View Details
                </button>

                <div className="button-group-spacer"></div>

                {/* Add Product Button */}
                <button onClick={handleOpenAddModal} className="btn-action btn-add">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 5v14M5 12h14"/>
                  </svg>
                  Add Product
                </button>

                {/* Remove Product Button */}
                <button
                  onClick={handleOpenRemoveModal}
                  className={`btn-action btn-confirm-negative ${!selectedProduct ? "disabled" : ""}`}
                  disabled={!selectedProduct}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M5 12h14"/>
                  </svg>
                  Remove Product
                </button>

                {/* Transfer Product Button */}
                <button
                  onClick={handleOpenTransferModal}
                  className={`btn-action btn-edit ${!selectedProduct ? "disabled" : ""}`}
                  disabled={!selectedProduct}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M7 16H5a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v2M15 12l3-3m0 0l-3-3m3 3l-6 6"/>
                  </svg>
                  Move product
                </button>

                <div className="button-group-spacer"></div>

                {/* Go to Product Button */}
                <button
                  onClick={handleGoToProduct}
                  className={`btn-action btn-go-to ${!selectedProduct ? "disabled" : ""}`}
                  disabled={!selectedProduct}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      d="M13 7l5 5-5 5M6 12h12"
                    />
                  </svg>
                  Go to Product
                </button>
              </div>
            </aside>

            {/* === MAIN TABLE SECTION === */}
            <main className="list-section">
              <h2>Warehouse Products List</h2>

              {/* Data Table */}
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((col, i) => {
                      const sortable = col.sortable !== false;
                      return (
                        <th
                          key={i}
                          onClick={() => sortable && handleSort(col.key)}
                          className={`${sortable ? "sortable" : ""} ${
                            sortable && sortColumn === col.key ? "sorted" : ""
                          }`}
                          style={{ width: col.width, cursor: sortable ? "pointer" : "default" }}
                        >
                          {col.label}
                          {sortable && sortColumn === col.key && (
                            <span
                              className={`sort-arrow ${
                                sortDirection === "asc" ? "asc" : "desc"
                              }`}
                            >
                              {sortDirection === "asc" ? " ▲" : " ▼"}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row, i) => (
                      <tr
                        key={i}
                        className={selectedProduct?.id === row.id ? "selected" : ""}
                        onClick={() => handleRowSelect(row)}
                        onDoubleClick={() => handleRowDoubleClick(row)}
                      >
                        {columns.map((col, j) => (
                          <td key={j}>{row[col.key]}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="no-data">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </main>
          </div>

          {/* Loading Overlay */}
          {loading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
            </div>
          )}
        </div>

        {/* === FILTERS PANEL === */}
        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>

            {/* Price Range Filter */}
            <div className="filters-row">
              <input
                type="number"
                name="minPrice"
                placeholder="Min price"
                value={filters.minPrice}
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="maxPrice"
                placeholder="Max price"
                value={filters.maxPrice}
                onChange={handleInputChange}
              />
            </div>

            {/* Category Filter */}
            <select name="categoryId" value={filters.categoryId} onChange={handleInputChange}>
              <option value="">All Categories</option>
              {Array.from(categories.entries()).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            {/* Location Filter */}
            <select name="locationId" value={filters.locationId} onChange={handleInputChange}>
              <option value="">All Locations</option>
              {allLocations
                .filter((l) => l.isActive)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.locationCode}
                  </option>
                ))}
            </select>

            {/* Stock Status Filter */}
            <select name="stockStatus" value={filters.stockStatus} onChange={handleInputChange}>
              <option value="">All Stock Levels</option>
              <option value="inStock">In Stock</option>
              <option value="lowStock">Low Stock (1-10)</option>
              <option value="outOfStock">Out of Stock</option>
            </select>

            {/* Custom Quantity Range (only shown when stock status not selected) */}
            {filters.stockStatus === "" && (
              <div className="filters-row">
                <input
                  type="number"
                  name="minQuantity"
                  placeholder="Min quantity"
                  value={filters.minQuantity}
                  onChange={handleInputChange}
                />
                <input
                  type="number"
                  name="maxQuantity"
                  placeholder="Max quantity"
                  value={filters.maxQuantity}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </div>
        )}

        {/* Intersection Observer sentinel for infinite scroll */}
        <div ref={observerRef} style={{ height: "1px" }} />
        {loading && <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>}
      </main>

      {/* === MODALS === */}
      {/* View Details Modal */}
      <ViewDetailsModal
        show={showDetailsModal}
        product={selectedProduct}
        onClose={() => setShowDetailsModal(false)}
      />

      {/* Add Product Modal */}
      <AddModal
        show={showAddModal}
        formData={addForm}
        productSearchTerm={productSearchTerm}
        filteredProducts={filteredProducts}
        showProductDropdown={showProductDropdown}
        allLocations={allLocations}
        selectedProduct={selectedProduct}
        onClose={() => setShowAddModal(false)}
        onFormChange={handleAddFormChange}
        onProductSearchChange={handleProductSearchChange}
        onProductSelect={handleProductSelect}
        onProductInputFocus={handleProductInputFocus}
        onProductInputBlur={handleProductInputBlur}
        onProductDropdownKeyDown={handleProductDropdownKeyDown}
        onSubmit={handleSubmitAdd}
        onKeyPress={handleAddModalKeyPress}
        onOpenQuickLocation={handleOpenQuickLocation}
      />

      {/* Remove Product Modal */}
      <RemoveModal
        show={showRemoveModal}
        selectedProduct={selectedProduct}
        formData={removeForm}
        onClose={() => setShowRemoveModal(false)}
        onFormChange={handleRemoveFormChange}
        onSubmit={handleSubmitRemove}
        onKeyPress={handleRemoveModalKeyPress}
        getProductLocations={getProductLocations}
        getMaxQuantityForLocation={getMaxQuantityForLocation}
      />

      {/* Transfer Product Modal */}
      <TransferModal
        show={showTransferModal}
        selectedProduct={selectedProduct}
        formData={transferForm}
        allLocations={allLocations}
        onClose={() => setShowTransferModal(false)}
        onFormChange={handleTransferFormChange}
        onSubmit={handleSubmitTransfer}
        onKeyPress={handleTransferModalKeyPress}
        getProductLocations={getProductLocations}
        getMaxQuantityForLocation={getMaxQuantityForLocation}
      />

      {/* Quick Location Creation Modal */}
      <QuickLocationModal
        show={showQuickLocationModal}
        formData={quickLocationForm}
        onClose={() => setShowQuickLocationModal(false)}
        onFormChange={handleQuickLocationChange}
        onSubmit={handleSubmitQuickLocation}
      />

      {/* === TOAST NOTIFICATIONS === */}
      {toast && (
        <MessageBox
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
          className="centered"
        />
      )}
    </div>
  );
}
