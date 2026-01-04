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
 * Warehouses page - Manage warehouse inventory by location
 * Displays location-centric view of warehouse (each row is product-location combination)
 * Supports adding products to locations, removing from locations, and transferring between locations
 * Includes advanced filtering by price, category, location, and quantity
 * Features quick location creation and navigation to product details
 * Uses multi-level default sorting (product name → location code → quantity)
 */
export default function Warehouses() {
  // === STATE ===
  // Router
  const navigate = useNavigate(); // For navigation to product details page

  // Data state
  const [warehouseItems, setWarehouseItems] = useState([]); // Array of product-location combinations from API
  const [pageNumber, setPageNumber] = useState(1); // Current page number for pagination
  const [hasMore, setHasMore] = useState(true); // Whether more pages are available
  const [loading, setLoading] = useState(false); // Loading indicator for API requests
  const [initialDataLoaded, setInitialDataLoaded] = useState(false); // Flag to prevent premature fetches

  // Selection state
  const [selectedItem, setSelectedItem] = useState(null); // Currently selected warehouse item row
  const [selectedItemIdToRestore, setSelectedItemIdToRestore] = useState(null); // Item IDs to reselect after refresh

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
  const [productAllLocations, setProductAllLocations] = useState([]); // All locations for product in Details modal

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
  const [selectedProductLocations, setSelectedProductLocations] = useState([]); // Locations where selected product exists

  // Remove Product modal form state
  const [removeForm, setRemoveForm] = useState({
    quantity: 1, // Quantity to remove
  });

  // Transfer Product modal form state
  const [transferForm, setTransferForm] = useState({
    toLocationId: "", // Destination location ID
    quantity: 1, // Quantity to transfer
  });
  const [transferProductLocations, setTransferProductLocations] = useState([]); // All locations for product being transferred

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
    minQuantity: "", // Minimum quantity filter
    maxQuantity: "", // Maximum quantity filter
    locationId: "", // Location filter
  });

  // Sort state
  const [sortColumn, setSortColumn] = useState("locationCode"); // Column to sort by (default: location code)
  const [sortDirection, setSortDirection] = useState("asc"); // Sort direction (default: ascending)

  // Refs
  const observerRef = useRef(null); // Ref for intersection observer (infinite scroll)
  const filtersRef = useRef(null); // Ref for filters panel (click-outside detection)

  // User context
  const user = JSON.parse(localStorage.getItem("user")); // Current logged-in user

  // === HELPER FUNCTIONS ===
  /**
   * Creates a row object from warehouse item data
   * Transforms API data into table-friendly format
   * @param {object} item - Raw warehouse item from API
   * @returns {object} Formatted row object for table display
   */
  const createRowFromItem = (item) => ({
    id: `${item.productId}-${item.locationId}`, // Composite key
    productId: item.productId,
    locationId: item.locationId,
    productName: item.productName,
    productSku: item.productSKU || "—",
    productEan: item.productEAN || "—",
    locationCode: item.locationCode,
    productPrice: `$${item.productPrice.toFixed(2)}`,
    quantity: item.quantity,
    categoryName: item.categoryName,
    rawData: item, // Full item data for modals
  });

  // === DATA FETCHING ===
  /**
   * Fetches warehouse items (product-location combinations) from API
   * Supports pagination, filtering by search, category, location, price, and quantity
   * Applies multi-level client-side sorting when no explicit sort is selected
   * Restores selected item after fetch if selectedItemIdToRestore is set
   *
   * @param {number} page - Page number to fetch
   * @param {object} currentFilters - Filter values (minPrice, maxPrice, categoryId, minQuantity, maxQuantity, locationId)
   * @param {string} currentSearchQuery - Search query string
   * @param {string} currentSortColumn - Column to sort by (empty string = multi-level sort)
   * @param {string} currentSortDirection - Sort direction (asc/desc)
   */
  const fetchWarehouseItems = useCallback(async (
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

      // Add price range filters if provided
      if (currentFilters.minPrice) params.minPrice = currentFilters.minPrice;
      if (currentFilters.maxPrice) params.maxPrice = currentFilters.maxPrice;

      // Add quantity range filters if provided
      if (currentFilters.minQuantity) params.minQuantity = currentFilters.minQuantity;
      if (currentFilters.maxQuantity) params.maxQuantity = currentFilters.maxQuantity;

      // Add location filter if selected
      if (currentFilters.locationId) params.locationId = currentFilters.locationId;

      // Add backend sorting parameters (single column only)
      if (currentSortColumn) {
        params.orderBy = currentSortColumn;
        if (currentSortDirection) params.sortDirection = currentSortDirection;
      }

      // Fetch from API
      const { items, totalPages } = await api.get("/products-in-warehouse/search-product-rows", {
        params,
        cancelToken: source.token,
      });

      if (items?.length) {
        let processedItems = items;

        // Apply client-side multi-level sorting when no explicit sort is selected
        // Default sort: Product Name (asc) → Location Code (asc) → Quantity (asc)
        if (!currentSortColumn) {
          processedItems = [...items].sort((a, b) => {
            // Primary: Product Name (ascending)
            const nameCompare = a.productName.localeCompare(b.productName);
            if (nameCompare !== 0) return nameCompare;

            // Secondary: Location Code (ascending)
            const locationCompare = a.locationCode.localeCompare(b.locationCode);
            if (locationCompare !== 0) return locationCompare;

            // Tertiary: Quantity (ascending)
            return a.quantity - b.quantity;
          });
        }

        // Set or append items based on page number
        if (page === 1) {
          setWarehouseItems(processedItems);
        } else {
          setWarehouseItems((prev) => [...prev, ...processedItems]);
        }
        setHasMore(page < (totalPages || 1));

        // Restore selected item after fetch if needed (e.g., after transfer)
        if (selectedItemIdToRestore) {
          const itemToReselect = items.find(
            (item) => item.productId === selectedItemIdToRestore.productId &&
              item.locationId === selectedItemIdToRestore.locationId
          );
          if (itemToReselect) {
            const row = createRowFromItem(itemToReselect);
            setSelectedItem(row);
          }
          setSelectedItemIdToRestore(null);
        }
      } else {
        if (page === 1) {
          setWarehouseItems([]);
        }
        setHasMore(false);
      }
    } catch (err) {
      // Ignore cancelled requests
      if (axios.isCancel(err)) return;
      console.error(err);
      setToast({ message: "Failed to load warehouse items.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedItemIdToRestore]);

  /**
   * Debounced fetch for search and number inputs
   * Adds 1000ms delay to avoid excessive API calls while typing
   */
  const debouncedFetchWarehouseItems = useCallback(() => {
    if (!initialDataLoaded) return;
    const delay = setTimeout(() => {
      setWarehouseItems([]);
      setPageNumber(1);
      fetchWarehouseItems(1, filters, searchQuery, sortColumn, sortDirection);
      setIsDelayedRefresh(false);
    }, 1000);

    return () => clearTimeout(delay);
  }, [filters, searchQuery, initialDataLoaded, sortColumn, sortDirection, fetchWarehouseItems]);

  /**
   * Immediate fetch for filter/sort changes
   * No debounce needed for explicit user actions (dropdowns, sorting)
   */
  const immediateFetchWarehouseItems = useCallback(() => {
    if (!initialDataLoaded) return;
    setWarehouseItems([]);
    setPageNumber(1);
    fetchWarehouseItems(1, filters, searchQuery, sortColumn, sortDirection);
  }, [sortColumn, sortDirection, filters, searchQuery, initialDataLoaded, fetchWarehouseItems]);

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
      debouncedFetchWarehouseItems();
    } else {
      immediateFetchWarehouseItems();
    }
  }, [debouncedFetchWarehouseItems, immediateFetchWarehouseItems, isDelayedRefresh]);

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
   * Appends new data to existing warehouse items array
   */
  useEffect(() => {
    if (pageNumber > 1) {
      fetchWarehouseItems(pageNumber, filters, searchQuery, sortColumn, sortDirection);
    }
  }, [pageNumber, fetchWarehouseItems, filters, searchQuery, sortColumn, sortDirection]);

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
   * Column definitions for the warehouse items table
   * Defines headers, widths, sortability, and backend sort keys
   */
  const columns = [
    { key: "productName", label: "Product Name", width: "20%", sortable: true, sortKey: "productName" },
    { key: "productSku", label: "SKU", width: "12%", sortable: true, sortKey: "productSku" },
    { key: "locationCode", label: "Location Code", width: "18%", sortable: true, sortKey: "locationCode" },
    { key: "quantity", label: "Quantity", width: "12%", sortable: true, sortKey: "quantity" },
    { key: "categoryName", label: "Category", width: "23%", sortable: true, sortKey: "categoryName" },
    { key: "productPrice", label: "Price", width: "15%", sortable: true, sortKey: "productPrice" },
  ];

  /**
   * Transforms raw warehouse items to table row format
   * Maps each item through createRowFromItem helper
   */
  const rows = warehouseItems.map((item) => createRowFromItem(item));

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
    setSelectedItem(null);
  };

  /**
   * Handles filter input changes
   * Uses debounced fetch for number inputs (price, quantity)
   * Uses immediate fetch for dropdowns (category, location)
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
   * @param {object|null} row - Selected warehouse item row object
   */
  const handleRowSelect = (row) => {
    if (!row) {
      setSelectedItem(null);
      return;
    }
    setSelectedItem(row);
  };

  /**
   * Opens Details modal and fetches all locations for the product
   * Shows comprehensive view of product across all warehouse locations
   * Falls back to just current location if API call fails
   */
  const handleViewDetails = async () => {
    if (!selectedItem) return;

    try {
      // Fetch all locations for this product
      const response = await api.get("/products-in-warehouse/search-products-with-locations", {
        params: {
          searchTerm: selectedItem.rawData.productSKU,
          pageNumber: 1,
          pageSize: 1000,
        }
      });

      // Find the product in the response
      const productData = response.items?.find(p => p.productId === selectedItem.productId);

      if (productData && productData.locations) {
        setProductAllLocations(productData.locations);
      } else {
        // Fallback: if product not found, show just the current location
        setProductAllLocations([{
          locationId: selectedItem.locationId,
          locationCode: selectedItem.locationCode,
          quantity: selectedItem.quantity
        }]);
      }

      setShowDetailsModal(true);
    } catch (err) {
      console.error("Failed to fetch product locations", err);
      setToast({ message: "Failed to load product location details.", type: "error" });
      // Show modal with just current location
      setProductAllLocations([{
        locationId: selectedItem.locationId,
        locationCode: selectedItem.locationCode,
        quantity: selectedItem.quantity
      }]);
      setShowDetailsModal(true);
    }
  };

  /**
   * Handles double-click on row to open Details modal
   * Convenience method for quick access to product details
   * Fetches all location data before opening modal
   * @param {object} row - Double-clicked warehouse item row object
   */
  const handleRowDoubleClick = async (row) => {
    if (!row) return;

    try {
      // Fetch all locations for this product
      const response = await api.get("/products-in-warehouse/search-products-with-locations", {
        params: {
          searchTerm: row.rawData.productSKU,
          pageNumber: 1,
          pageSize: 1000,
        }
      });

      // Find the product in the response
      const productData = response.items?.find(p => p.productId === row.productId);

      if (productData && productData.locations) {
        setProductAllLocations(productData.locations);
      } else {
        // Fallback: if product not found, show just the current location
        setProductAllLocations([{
          locationId: row.locationId,
          locationCode: row.locationCode,
          quantity: row.quantity
        }]);
      }

      setSelectedItem(row);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Failed to fetch product locations", err);
      setToast({ message: "Failed to load product location details.", type: "error" });
      // Show modal with just current location
      setProductAllLocations([{
        locationId: row.locationId,
        locationCode: row.locationCode,
        quantity: row.quantity
      }]);
      setSelectedItem(row);
      setShowDetailsModal(true);
    }
  };

  /**
   * Handles column header clicks for sorting
   * Cycles through: asc -> desc -> multi-level default sort
   * Uses sortKey from column definition for backend sorting
   * @param {string} column - Column key to sort by
   */
  const handleSort = (column) => {
    const colDef = columns.find((c) => c.key === column);
    if (!colDef || colDef.sortable === false) return;

    // Get the actual sort key (some columns might have different backend key)
    const sortKey = colDef.sortKey || column;

    if (sortColumn === sortKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        // Reset to default multi-level sort
        setSortColumn("");
        setSortDirection("asc");
      }
    } else {
      setSortColumn(sortKey);
      setSortDirection("asc");
    }
  };

  // === ADD PRODUCT HANDLERS ===
  /**
   * Opens Add Product modal
   * Pre-fills product if one is selected from the list
   * Fetches and displays existing location data for selected product
   */
  const handleOpenAddModal = async () => {
    // Pre-fill product if one is selected from the list
    if (selectedItem?.rawData) {
      const product = activeProducts.find(p => p.productId === selectedItem.productId);
      if (product) {
        setAddForm({
          productId: product.productId,
          locationId: "",
          quantity: 1
        });
        setProductSearchTerm(`${product.sku} - ${product.name}`);

        // Fetch location data for pre-filled product
        try {
          const response = await api.get("/products-in-warehouse/search-products-with-locations", {
            params: {
              searchTerm: product.sku,
              pageNumber: 1,
              pageSize: 1,
            }
          });

          const productData = response.items?.find(p => p.productId === product.productId);
          if (productData && productData.locations) {
            setSelectedProductLocations(productData.locations);
          } else {
            setSelectedProductLocations([]);
          }
        } catch (err) {
          console.error("Failed to fetch product locations", err);
          setSelectedProductLocations([]);
        }
      } else {
        setAddForm({ productId: "", locationId: "", quantity: 1 });
        setProductSearchTerm("");
        setSelectedProductLocations([]);
      }
    } else {
      setAddForm({ productId: "", locationId: "", quantity: 1 });
      setProductSearchTerm("");
      setSelectedProductLocations([]);
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
   * Sets selected product and fetches its existing location data
   * @param {number} productId - Selected product ID
   */
  const handleProductSelect = async (productId) => {
    setAddForm((prev) => ({ ...prev, productId }));
    const selectedProduct = activeProducts.find(p => p.productId === productId);
    if (selectedProduct) {
      setProductSearchTerm(`${selectedProduct.sku} - ${selectedProduct.name}`);

      // Fetch location data for this product
      try {
        const response = await api.get("/products-in-warehouse/search-products-with-locations", {
          params: {
            searchTerm: selectedProduct.sku,
            pageNumber: 1,
            pageSize: 1,
          }
        });

        const productData = response.items?.find(p => p.productId === productId);
        if (productData && productData.locations) {
          setSelectedProductLocations(productData.locations);
        } else {
          setSelectedProductLocations([]);
        }
      } catch (err) {
        console.error("Failed to fetch product locations", err);
        setSelectedProductLocations([]);
      }
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
   * Refreshes warehouse items list after successful addition
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
      immediateFetchWarehouseItems();
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
   * Only works if a warehouse item is selected
   * Resets form to default values
   */
  const handleOpenRemoveModal = () => {
    if (!selectedItem) return;
    setRemoveForm({ quantity: 1 });
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
   * Validates quantity is filled, then calls API to remove product from warehouse
   * Clears selection and refreshes list after successful removal
   * @param {Event} e - Form submit event
   */
  const handleSubmitRemove = async (e) => {
    if (e) e.preventDefault();
    if (!removeForm.quantity) {
      setToast({ message: "Please fill all required fields.", type: "error" });
      return;
    }
    try {
      await api.post("/products-in-warehouse/remove", {
        productId: selectedItem.productId,
        locationId: selectedItem.locationId,
        quantity: parseInt(removeForm.quantity),
      });
      setToast({ message: "Product removed from warehouse successfully!", type: "success" });
      setShowRemoveModal(false);
      setSelectedItem(null);
      immediateFetchWarehouseItems();
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
   * Fetches all locations where the product exists to show in destination dropdown
   * Only works if a warehouse item is selected
   */
  const handleOpenTransferModal = async () => {
    if (!selectedItem) return;

    // Fetch all locations for this product
    try {
      const response = await api.get("/products-in-warehouse/search-products-with-locations", {
        params: {
          searchTerm: selectedItem.rawData.productSKU,
          pageNumber: 1,
          pageSize: 1000,
        }
      });

      const productData = response.items?.find(p => p.productId === selectedItem.productId);
      if (productData && productData.locations) {
        setTransferProductLocations(productData.locations);
      } else {
        setTransferProductLocations([]);
      }
    } catch (err) {
      console.error("Failed to fetch product locations for transfer", err);
      setTransferProductLocations([]);
    }

    setTransferForm({ toLocationId: "", quantity: 1 });
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
   * Validates all fields and ensures source/destination are different
   * Calls API to transfer product between locations
   * Reselects the item at destination location after successful transfer
   * @param {Event} e - Form submit event
   */
  const handleSubmitTransfer = async (e) => {
    if (e) e.preventDefault();
    if (!transferForm.toLocationId || !transferForm.quantity) {
      setToast({ message: "Please fill all required fields.", type: "error" });
      return;
    }
    if (selectedItem.locationId === parseInt(transferForm.toLocationId)) {
      setToast({ message: "Source and destination locations must be different.", type: "error" });
      return;
    }
    try {
      await api.post("/products-in-warehouse/transfer", {
        productId: selectedItem.productId,
        fromLocationId: selectedItem.locationId,
        toLocationId: parseInt(transferForm.toLocationId),
        quantity: parseInt(transferForm.quantity),
      });
      setToast({ message: "Product transferred successfully!", type: "success" });
      setShowTransferModal(false);

      // Store item ID to reselect after fetch completes (at destination location)
      setSelectedItemIdToRestore({
        productId: selectedItem.productId,
        locationId: parseInt(transferForm.toLocationId)
      });

      immediateFetchWarehouseItems();
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

  /**
   * Navigates to Products page with SKU search pre-filled
   * Allows quick access to full product details from warehouse view
   */
  const handleGoToProduct = () => {
    if (!selectedItem?.rawData?.productSKU) return;
    navigate(`/organization/products?search=${encodeURIComponent(selectedItem.rawData.productSKU)}`);
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
                  placeholder="Search products or locations..."
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
                  className={`btn-action btn-view-details ${!selectedItem ? "disabled" : ""}`}
                  disabled={!selectedItem}
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
                  className={`btn-action btn-confirm-negative ${!selectedItem ? "disabled" : ""}`}
                  disabled={!selectedItem}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M5 12h14"/>
                  </svg>
                  Remove Product
                </button>

                {/* Transfer Product Button */}
                <button
                  onClick={handleOpenTransferModal}
                  className={`btn-action btn-edit ${!selectedItem ? "disabled" : ""}`}
                  disabled={!selectedItem}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M7 16H5a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v2M15 12l3-3m0 0l-3-3m3 3l-6 6"/>
                  </svg>
                  Move Product
                </button>

                <div className="button-group-spacer"></div>

                {/* Go to Product Button */}
                <button
                  onClick={handleGoToProduct}
                  className={`btn-action btn-go-to ${!selectedItem ? "disabled" : ""}`}
                  disabled={!selectedItem}
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
              <h2>Warehouse Inventory</h2>

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
                        className={selectedItem?.id === row.id ? "selected" : ""}
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

            {/* Quantity Range Filter */}
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
        selectedItem={selectedItem}
        productAllLocations={productAllLocations}
        onClose={() => {
          setShowDetailsModal(false);
          setProductAllLocations([]);
        }}
      />

      {/* Add Product Modal */}
      <AddModal
        show={showAddModal}
        formData={addForm}
        productSearchTerm={productSearchTerm}
        filteredProducts={filteredProducts}
        showProductDropdown={showProductDropdown}
        allLocations={allLocations}
        selectedProductLocations={selectedProductLocations}
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
        selectedItem={selectedItem}
        formData={removeForm}
        onClose={() => setShowRemoveModal(false)}
        onFormChange={handleRemoveFormChange}
        onSubmit={handleSubmitRemove}
        onKeyPress={handleRemoveModalKeyPress}
      />

      {/* Transfer Product Modal */}
      <TransferModal
        show={showTransferModal}
        selectedItem={selectedItem}
        formData={transferForm}
        allLocations={allLocations}
        transferProductLocations={transferProductLocations}
        onClose={() => {
          setShowTransferModal(false);
          setTransferProductLocations([]);
        }}
        onFormChange={handleTransferFormChange}
        onSubmit={handleSubmitTransfer}
        onKeyPress={handleTransferModalKeyPress}
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
