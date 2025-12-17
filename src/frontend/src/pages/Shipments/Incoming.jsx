import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { api, apiRequest } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import MessageBox from "../../components/MessageBox";
import { shipmentStatusesData } from "../../data/shipmentStatuses";
import { countries, getCountryValue } from "../../data/countries";
import "../../styles/PagesStyles/shipments.css";

export default function IncomingShipments() {
  const [shipments, setShipments] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedShipmentDetails, setSelectedShipmentDetails] = useState(null);
  const [toast, setToast] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortColumn, setSortColumn] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  // Edit Shipment Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    type: 1,
    status: 1,
    sendDate: "",
    deliveryDate: "",
    description: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    senderName: "",
    senderTaxId: "",
    senderDetails: "",
    senderStreet: "",
    senderBuilding: "",
    senderPremises: "",
    senderPostalCode: "",
    senderCity: "",
    senderCountry: "",
    senderAddressId: null,
    receiverName: "",
    receiverTaxId: "",
    receiverDetails: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit modal product management state
  const [editSelectedProducts, setEditSelectedProducts] = useState([]);
  const [originalEditProducts, setOriginalEditProducts] = useState([]); // Track original products for comparison
  const [editProductSearch, setEditProductSearch] = useState("");
  const [editProductSuggestions, setEditProductSuggestions] = useState([]);
  const [showEditProductDropdown, setShowEditProductDropdown] = useState(false);
  const [editHighlightedIndex, setEditHighlightedIndex] = useState(0);
  const [editProductPageNumber, setEditProductPageNumber] = useState(1);
  const [hasMoreEditProducts, setHasMoreEditProducts] = useState(true);
  const [loadingEditProducts, setLoadingEditProducts] = useState(false);
  const editProductDropdownRef = useRef(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    sendDateFrom: "",
    sendDateTo: "",
    deliveryDateFrom: "",
    deliveryDateTo: "",
  });

  // Add Shipment Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    status: 1, // InPreparation
    sendDate: "",
    deliveryDate: "",
    description: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    senderName: "",
    senderTaxId: "",
    senderDetails: "",
    senderStreet: "",
    senderBuilding: "",
    senderPremises: "",
    senderPostalCode: "",
    senderCity: "",
    senderCountry: 141, // Default Poland (enum value)
    receiverDetails: "",
  });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [productPageNumber, setProductPageNumber] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const productDropdownRef = useRef(null);

  // Collection workflow state
  const [collectedProducts, setCollectedProducts] = useState([]);
  const [locationAssignments, setLocationAssignments] = useState({});
  const [scanInput, setScanInput] = useState("");
  const [locations, setLocations] = useState([]);

  const observerRef = useRef(null);
  const filtersRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));

  // State for status change confirmation
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  // State for View Products Modal
  const [showViewProductsModal, setShowViewProductsModal] = useState(false);
  const [viewProductsData, setViewProductsData] = useState([]);
  const [expandedProductLocations, setExpandedProductLocations] = useState({});

  // Fetch shipments data
  const fetchShipmentsData = async (page, currentFilters, currentSearchQuery, currentSortColumn, currentSortDirection) => {
    try {
      setLoading(true);
      const { items, totalPages } = await api.get("/Shipments", {
        params: {
          PageNumber: page,
          PageSize: 50,
          type: 1, // Incoming type
          ...(currentSearchQuery && { q: currentSearchQuery }),
          ...(currentFilters.status && { status: currentFilters.status }),
          ...(currentFilters.sendDateFrom && { sendDateFrom: currentFilters.sendDateFrom }),
          ...(currentFilters.sendDateTo && { sendDateTo: currentFilters.sendDateTo }),
          ...(currentFilters.deliveryDateFrom && { deliveryDateFrom: currentFilters.deliveryDateFrom }),
          ...(currentFilters.deliveryDateTo && { deliveryDateTo: currentFilters.deliveryDateTo }),
          ...(currentSortColumn && { orderBy: currentSortColumn }),
          ...(currentSortDirection && { sortDirection: currentSortDirection }),
        },
      });

      if (items?.length) {
        setShipments(items);
        setHasMore(page < (totalPages || 1));
      } else {
        setShipments([]);
        setHasMore(false);
      }
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error(err);
      setError("Failed to load shipments.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch locations for collection
  const fetchLocations = async () => {
    try {
      const response = await api.get("/location", {
        params: {
          pageNumber: 1,
          pageSize: 1000, // Get all locations for dropdown
        },
      });
      setLocations(response.items || []);
    } catch (err) {
      console.error("Failed to fetch locations", err);
    }
  };

  useEffect(() => {
    fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection);
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      setShipments([]);
      setPageNumber(1);
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection);
    }, 1000);
    return () => clearTimeout(delay);
  }, [filters, searchQuery, sortColumn, sortDirection]);

  // Infinite scroll
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

  // Load next page
  useEffect(() => {
    if (pageNumber > 1) {
      fetchShipmentsData(pageNumber, filters, searchQuery, sortColumn, sortDirection);
    }
  }, [pageNumber, filters, searchQuery, sortColumn, sortDirection]);

  // Close filters when clicking outside
  useEffect(() => {
    if (!showFilters) return;
    const handleClickOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showFilters]);


  // Format dates for display
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  // Get status label
  const getStatusLabel = (statusId) => {
    return shipmentStatusesData.find(s => s.id === statusId)?.value || "Unknown";
  };

  // Table columns
  const columns = [
    { key: "from", label: "From", width: "25%", sortable: false },
    { key: "size", label: "Size", width: "15%", sortable: false },
    { key: "totalQuantity", label: "Total Qty", width: "15%", sortable: false },
    { key: "sendDate", label: "Send Date", width: "15%", sortable: true },
    { key: "deliveryDate", label: "Delivery Date", width: "15%", sortable: true },
    { key: "status", label: "Status", width: "15%", sortable: false },
  ];

  const rows = shipments.map((s) => {
    return {
      id: s.id,
      from: `${s.senderName || "Unknown"}${s.senderTaxId ? ` (${s.senderTaxId})` : ""}`,
      size: s.length && s.width && s.height ? `${s.length} x ${s.width} x ${s.height}` : "—",
      totalQuantity: s.totalQuantity || 0,
      sendDate: s.sendDate,
      deliveryDate: s.deliveryDate,
      status: s.status,
      statusRaw: s.status,
    };
  });

  // Handle row selection
  const handleRowSelect = async (row) => {
    if (!row) {
      setSelectedRow(null);
      setSelectedShipmentDetails(null);
      return;
    }

    setSelectedRow(row);
    try {
      const full = await api.get(`/Shipments/${row.id}`);
      setSelectedShipmentDetails(full);
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to load shipment details.",
        type: "error",
      });
    }
  };

  // Handle status change request (shows confirmation)
  const handleStatusChangeRequest = (shipmentId, currentStatus, newStatus) => {
    const statusLabel = getStatusLabel(parseInt(newStatus));
    setPendingStatusChange({
      shipmentId,
      currentStatus,
      newStatus: parseInt(newStatus),
      statusLabel,
    });
  };

  // Execute status change after confirmation
  const executeStatusChange = async () => {
    if (!pendingStatusChange) return;

    const { shipmentId, newStatus } = pendingStatusChange;

    try {
      await api.patch(`/Shipments/${shipmentId}/status`, { status: newStatus });

      // Refresh the shipment
      const updated = await api.get(`/Shipments/${shipmentId}`);
      setSelectedShipmentDetails(updated);

      // Update in list
      setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: newStatus } : s));

      setToast({
        message: "Status updated successfully!",
        type: "success",
      });
    } catch (err) {
      console.error(err);

      // Handle 409 Conflict errors with specific message
      if (err.response?.status === 409) {
        setToast({
          message: err.response?.data?.message || err.response?.data || "Conflict: Cannot change to this status.",
          type: "error",
        });
      } else {
        setToast({
          message: err.response?.data?.message || err.response?.data || "Failed to update status.",
          type: "error",
        });
      }
    } finally {
      setPendingStatusChange(null);
    }
  };

  // Handle Add Shipment Modal Open
  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setAddForm({
      status: 1,
      sendDate: "",
      deliveryDate: "",
      description: "",
      length: "",
      width: "",
      height: "",
      weight: "",
      senderName: "",
      senderTaxId: "",
      senderDetails: "",
      senderStreet: "",
      senderBuilding: "",
      senderPremises: "",
      senderPostalCode: "",
      senderCity: "",
      senderCountry: 141, // Default Poland (enum value)
      receiverDetails: "",
    });
    setSelectedProducts([]);
    setProductSearch("");
    setProductSuggestions([]);
  };

  // Handle form input change
  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddForm(prev => ({ ...prev, [name]: value }));
  };

  // Product search with immediate results and warehouse stock data
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductSuggestions([]);
      setShowProductDropdown(false);
      setProductPageNumber(1);
      setHasMoreProducts(true);
      setHighlightedIndex(0);
      return;
    }

    const searchProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await api.get("/products-in-warehouse/search-product", {
          params: {
            pageNumber: 1,
            pageSize: 100, // Load 100 products initially
            searchTerm: productSearch,
          },
        });

        const products = response.items || [];
        setProductSuggestions(products);
        setShowProductDropdown(products.length > 0);
        setProductPageNumber(1);
        setHasMoreProducts(response.totalPages > 1);
        setHighlightedIndex(0);
      } catch (err) {
        console.error("Failed to search products", err);
        setProductSuggestions([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [productSearch]);

  // Lazy load more products when scrolling
  const loadMoreProducts = async () => {
    if (!hasMoreProducts || loadingProducts || !productSearch.trim()) return;

    try {
      setLoadingProducts(true);
      const nextPage = productPageNumber + 1;
      const response = await api.get("/products-in-warehouse/search-product", {
        params: {
          pageNumber: nextPage,
          pageSize: 100,
          searchTerm: productSearch,
        },
      });

      const newProducts = response.items || [];
      setProductSuggestions(prev => [...prev, ...newProducts]);
      setProductPageNumber(nextPage);
      setHasMoreProducts(nextPage < response.totalPages);
    } catch (err) {
      console.error("Failed to load more products", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Handle scroll in product dropdown for infinite loading
  const handleProductDropdownScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50;
    if (bottom && hasMoreProducts && !loadingProducts) {
      loadMoreProducts();
    }
  };

  // Add product to shipment list (matches POS pattern)
  const handleAddProduct = (product) => {
    const productId = product.productId || product.id;
    const existing = selectedProducts.find(p => p.id === productId);
    if (existing) {
      setToast({
        message: "Product already added to shipment",
        type: "error",
      });
      return;
    }

    setSelectedProducts(prev => [...prev, {
      id: productId,
      sku: product.sku,
      name: product.name,
      quantity: 1,
      currentStock: product.totalQuantity || 0,
    }]);
    setProductSearch("");
    setProductSuggestions([]);
    setShowProductDropdown(false);
    setHighlightedIndex(0);
  };

  // Handle keyboard navigation in product dropdown
  const handleProductSearchKeyDown = (e) => {
    if (!showProductDropdown || productSuggestions.length === 0) {
      // If Enter is pressed with no dropdown, try exact SKU match
      if (e.key === "Enter") {
        e.preventDefault();
        handleExactSKUMatch();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < productSuggestions.length - 1 ? prev + 1 : prev
        );
        scrollHighlightedIntoView(highlightedIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        scrollHighlightedIntoView(highlightedIndex - 1);
        break;
      case "Enter":
        e.preventDefault();
        if (productSuggestions[highlightedIndex]) {
          handleAddProduct(productSuggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowProductDropdown(false);
        setProductSearch("");
        break;
      default:
        break;
    }
  };

  // Scroll highlighted item into view
  const scrollHighlightedIntoView = (index) => {
    if (productDropdownRef.current) {
      const items = productDropdownRef.current.querySelectorAll(".product-suggestion-item");
      if (items[index]) {
        items[index].scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  };

  // Handle exact SKU match when Enter is pressed without dropdown
  const handleExactSKUMatch = async () => {
    const searchTerm = productSearch.trim();
    if (!searchTerm) return;

    try {
      // Search for exact SKU match
      const response = await api.get("/products-in-warehouse/search-product", {
        params: {
          pageNumber: 1,
          pageSize: 1,
          searchTerm: searchTerm,
        },
      });

      const products = response.items || [];
      // Check if first result is exact SKU match
      if (products.length > 0 && products[0].sku.toLowerCase() === searchTerm.toLowerCase()) {
        handleAddProduct(products[0]);
      } else {
        setToast({
          message: `No exact SKU match found for "${searchTerm}"`,
          type: "error",
        });
      }
    } catch (err) {
      console.error("Failed to search for exact SKU", err);
      setToast({
        message: "Failed to search for product",
        type: "error",
      });
    }
  };

  // Update product quantity in shipment
  const handleProductQuantityChange = (productId, newQuantity) => {
    setSelectedProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, quantity: Math.max(1, parseInt(newQuantity) || 1) } : p
    ));
  };

  // Remove product from shipment
  const handleRemoveProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  // === EDIT MODAL PRODUCT MANAGEMENT ===

  // Product search for edit modal
  useEffect(() => {
    if (!editProductSearch.trim()) {
      setEditProductSuggestions([]);
      setShowEditProductDropdown(false);
      setEditProductPageNumber(1);
      setHasMoreEditProducts(true);
      setEditHighlightedIndex(0);
      return;
    }

    const searchProducts = async () => {
      try {
        setLoadingEditProducts(true);
        const response = await api.get("/products-in-warehouse/search-product", {
          params: {
            pageNumber: 1,
            pageSize: 100,
            searchTerm: editProductSearch,
          },
        });

        const products = response.items || [];
        setEditProductSuggestions(products);
        setShowEditProductDropdown(products.length > 0);
        setEditProductPageNumber(1);
        setHasMoreEditProducts(response.totalPages > 1);
        setEditHighlightedIndex(0);
      } catch (err) {
        console.error("Failed to search products", err);
        setEditProductSuggestions([]);
      } finally {
        setLoadingEditProducts(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [editProductSearch]);

  // Lazy load more products for edit modal
  const loadMoreEditProducts = async () => {
    if (!hasMoreEditProducts || loadingEditProducts || !editProductSearch.trim()) return;

    try {
      setLoadingEditProducts(true);
      const nextPage = editProductPageNumber + 1;
      const response = await api.get("/products-in-warehouse/search-product", {
        params: {
          pageNumber: nextPage,
          pageSize: 100,
          searchTerm: editProductSearch,
        },
      });

      const newProducts = response.items || [];
      setEditProductSuggestions(prev => [...prev, ...newProducts]);
      setEditProductPageNumber(nextPage);
      setHasMoreEditProducts(nextPage < response.totalPages);
    } catch (err) {
      console.error("Failed to load more products", err);
    } finally {
      setLoadingEditProducts(false);
    }
  };

  // Handle scroll in edit product dropdown
  const handleEditProductDropdownScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50;
    if (bottom && hasMoreEditProducts && !loadingEditProducts) {
      loadMoreEditProducts();
    }
  };

  // Add product to edit shipment
  const handleEditAddProduct = (product) => {
    const productId = product.productId || product.id;
    const existing = editSelectedProducts.find(p => p.id === productId);
    if (existing) {
      setToast({
        message: "Product already added to shipment",
        type: "error",
      });
      return;
    }

    setEditSelectedProducts(prev => [...prev, {
      id: productId,
      sku: product.sku,
      name: product.name,
      quantity: 1,
      currentStock: product.totalQuantity || 0,
    }]);
    setEditProductSearch("");
    setEditProductSuggestions([]);
    setShowEditProductDropdown(false);
    setEditHighlightedIndex(0);
  };

  // Handle keyboard navigation in edit product dropdown
  const handleEditProductSearchKeyDown = (e) => {
    if (!showEditProductDropdown || editProductSuggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleEditExactSKUMatch();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setEditHighlightedIndex(prev =>
          prev < editProductSuggestions.length - 1 ? prev + 1 : prev
        );
        scrollEditHighlightedIntoView(editHighlightedIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        setEditHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        scrollEditHighlightedIntoView(editHighlightedIndex - 1);
        break;
      case "Enter":
        e.preventDefault();
        if (editProductSuggestions[editHighlightedIndex]) {
          handleEditAddProduct(editProductSuggestions[editHighlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowEditProductDropdown(false);
        setEditProductSearch("");
        break;
      default:
        break;
    }
  };

  // Scroll highlighted item into view for edit modal
  const scrollEditHighlightedIntoView = (index) => {
    if (editProductDropdownRef.current) {
      const items = editProductDropdownRef.current.querySelectorAll(".product-suggestion-item");
      if (items[index]) {
        items[index].scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  };

  // Handle exact SKU match for edit modal
  const handleEditExactSKUMatch = async () => {
    const searchTerm = editProductSearch.trim();
    if (!searchTerm) return;

    try {
      const response = await api.get("/products-in-warehouse/search-product", {
        params: {
          pageNumber: 1,
          pageSize: 1,
          searchTerm: searchTerm,
        },
      });

      const products = response.items || [];
      if (products.length > 0 && products[0].sku.toLowerCase() === searchTerm.toLowerCase()) {
        handleEditAddProduct(products[0]);
      } else {
        setToast({
          message: `No exact SKU match found for "${searchTerm}"`,
          type: "error",
        });
      }
    } catch (err) {
      console.error("Failed to search for exact SKU", err);
      setToast({
        message: "Failed to search for product",
        type: "error",
      });
    }
  };

  // Update product quantity in edit shipment
  const handleEditProductQuantityChange = (productId, newQuantity) => {
    setEditSelectedProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, quantity: Math.max(1, parseInt(newQuantity) || 1) } : p
    ));
  };

  // Remove product from edit shipment
  const handleEditRemoveProduct = (productId) => {
    setEditSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Save shipment
  const handleSaveShipment = async () => {
    // Validate required fields
    if (!addForm.status) {
      setToast({ message: "Status is required", type: "error" });
      return;
    }

    if (!addForm.senderName || !addForm.senderTaxId) {
      setToast({ message: "Sender name and Tax ID are required", type: "error" });
      return;
    }

    if (!addForm.senderStreet || !addForm.senderBuilding || !addForm.senderPostalCode || !addForm.senderCity || !addForm.senderCountry) {
      setToast({ message: "Complete sender address is required", type: "error" });
      return;
    }

    if (selectedProducts.length === 0) {
      setToast({ message: "At least one product is required", type: "error" });
      return;
    }

    try {
      setSavingShipment(true);

      // Step 1: Create sender address (backend expects Country enum as integer)
      const senderAddressPayload = {
        country: parseInt(addForm.senderCountry), // Already an enum value
        city: addForm.senderCity,
        street: addForm.senderStreet,
        building: addForm.senderBuilding,
        premises: addForm.senderPremises || null,
        postalCode: addForm.senderPostalCode,
      };

      const senderAddressResponse = await api.post("/Addresses", senderAddressPayload);
      const senderAddressId = senderAddressResponse.id;

      // Step 2: Get or create main company address for receiver
      let receiverAddressId = null;

      // Define main company address details
      const mainCompanyAddress = {
        street: "Main Street",
        building: "123",
        postalCode: "00-950",
        city: "Warszawa",
        country: 141, // Poland enum value
        premises: null,
      };

      try {
        // Check if main company address exists
        const addressExistsResponse = await api.get("/Addresses/exists", {
          params: mainCompanyAddress,
        });

        if (addressExistsResponse.exists && addressExistsResponse.id) {
          receiverAddressId = addressExistsResponse.id;
        } else {
          // Create main company address
          const receiverAddressResponse = await api.post("/Addresses", mainCompanyAddress);
          receiverAddressId = receiverAddressResponse.id;
        }

        if (!receiverAddressId) {
          throw new Error("Receiver address ID is null after creation/retrieval");
        }
      } catch (err) {
        console.error("Failed to get/create receiver address:", err);
        const errorMessage = err.response?.data?.message || err.response?.data || err.message;
        throw new Error(`Failed to set receiver address: ${errorMessage}`);
      }

      // Step 3: Create shipment
      const shipmentPayload = {
        type: 1, // Incoming
        status: parseInt(addForm.status),
        sendDate: addForm.sendDate || null,
        deliveryDate: addForm.deliveryDate || null,
        description: addForm.description || null,
        weight: addForm.weight ? parseFloat(addForm.weight) : null,
        length: addForm.length ? parseFloat(addForm.length) : null,
        width: addForm.width ? parseFloat(addForm.width) : null,
        height: addForm.height ? parseFloat(addForm.height) : null,
        senderName: addForm.senderName,
        senderTaxId: addForm.senderTaxId,
        senderDetails: addForm.senderDetails || null,
        senderAddressId: senderAddressId,
        receiverName: "Main Store",
        receiverTaxId: "1234567890",
        receiverAddressId: receiverAddressId,
        receiverDetails: addForm.receiverDetails || "Main Street 123, 00-950 Warszawa, Poland",
      };

      const shipmentResponse = await api.post("/Shipments", shipmentPayload);
      const shipmentId = shipmentResponse.id;

      // Step 4: Add products to shipment
      const productsPayload = {
        products: selectedProducts.map(p => ({
          productId: p.id,
          quantity: p.quantity,
        })),
      };

      await api.post(`/Shipments/${shipmentId}/products`, productsPayload);

      setToast({
        message: "Shipment created successfully!",
        type: "success",
      });

      setShowAddModal(false);
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection);
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to create shipment.",
        type: "error",
      });
    } finally {
      setSavingShipment(false);
    }
  };

  // Handle Edit Shipment Modal Open
  const handleOpenEditModal = async () => {
    if (!selectedShipmentDetails) {
      setToast({
        message: "Please select a shipment to edit.",
        type: "error",
      });
      return;
    }

    const senderAddress = selectedShipmentDetails.senderAddress || selectedShipmentDetails.SenderAddress || {};

    // Backend returns country as string name (e.g., "Poland"), need to convert to enum value for select
    const countryName = senderAddress.country || senderAddress.Country;
    const countryId = getCountryValue(countryName); // Convert name to enum value

    const formData = {
      id: selectedShipmentDetails.id,
      type: selectedShipmentDetails.type,
      status: selectedShipmentDetails.status,
      sendDate: selectedShipmentDetails.sendDate ? selectedShipmentDetails.sendDate.split('T')[0] : "",
      deliveryDate: selectedShipmentDetails.deliveryDate ? selectedShipmentDetails.deliveryDate.split('T')[0] : "",
      description: selectedShipmentDetails.description || "",
      length: selectedShipmentDetails.length || "",
      width: selectedShipmentDetails.width || "",
      height: selectedShipmentDetails.height || "",
      weight: selectedShipmentDetails.weight || "",
      senderName: selectedShipmentDetails.senderName || "",
      senderTaxId: selectedShipmentDetails.senderTaxId || "",
      senderDetails: selectedShipmentDetails.senderDetails || "",
      senderStreet: senderAddress.street || senderAddress.Street || "",
      senderBuilding: senderAddress.building || senderAddress.Building || "",
      senderPremises: senderAddress.premises || senderAddress.Premises || "",
      senderPostalCode: senderAddress.postalCode || senderAddress.PostalCode || "",
      senderCity: senderAddress.city || senderAddress.City || "",
      senderCountry: countryId !== null ? countryId : 141, // Default to Poland if conversion fails
      senderAddressId: selectedShipmentDetails.senderAddressId,
      receiverName: selectedShipmentDetails.receiverName || "",
      receiverTaxId: selectedShipmentDetails.receiverTaxId || "",
      receiverDetails: selectedShipmentDetails.receiverDetails || "",
    };

    setEditForm(formData);

    // Initialize products from shipment
    const productsWithStock = await Promise.all(
      (selectedShipmentDetails.shipmentProducts || []).map(async (sp) => {
        try {
          const response = await api.get("/products-in-warehouse/search-product", {
            params: {
              pageNumber: 1,
              pageSize: 1,
              searchTerm: sp.productSKU,
            },
          });
          const productData = response.items?.[0];
          return {
            id: sp.productId,
            sku: sp.productSKU,
            name: sp.productName,
            quantity: sp.quantity,
            currentStock: productData?.totalQuantity || 0,
          };
        } catch (err) {
          console.error("Failed to fetch stock for product", sp.productSKU, err);
          return {
            id: sp.productId,
            sku: sp.productSKU,
            name: sp.productName,
            quantity: sp.quantity,
            currentStock: 0,
          };
        }
      })
    );

    setEditSelectedProducts(productsWithStock);
    setOriginalEditProducts(productsWithStock); // Store original state for comparison
    setEditProductSearch("");
    setEditProductSuggestions([]);

    setShowEditModal(true);
  };

  // Handle edit form input change
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };


  // Save edited shipment
  const handleSaveEdit = async () => {
    // Validate required fields
    if (!editForm.status) {
      setToast({ message: "Status is required", type: "error" });
      return;
    }

    if (!editForm.senderName || !editForm.senderTaxId) {
      setToast({ message: "Sender name and Tax ID are required", type: "error" });
      return;
    }

    if (!editForm.senderStreet || !editForm.senderBuilding || !editForm.senderPostalCode || !editForm.senderCity || !editForm.senderCountry) {
      setToast({ message: "Complete sender address is required", type: "error" });
      return;
    }

    if (editSelectedProducts.length === 0) {
      setToast({ message: "At least one product is required", type: "error" });
      return;
    }

    try {
      setSavingEdit(true);

      // Step 1: Update sender address (backend expects Country enum as integer)
      const senderAddressPayload = {
        country: parseInt(editForm.senderCountry), // Already an enum value
        city: editForm.senderCity,
        street: editForm.senderStreet,
        building: editForm.senderBuilding,
        premises: editForm.senderPremises || null,
        postalCode: editForm.senderPostalCode,
      };

      await api.put(`/Addresses/${editForm.senderAddressId}`, senderAddressPayload);

      // Step 2: Update shipment
      const shipmentPayload = {
        type: 1, // Incoming - fixed for this page
        status: parseInt(editForm.status),
        sendDate: editForm.sendDate || null,
        deliveryDate: editForm.deliveryDate || null,
        description: editForm.description || null,
        weight: editForm.weight ? parseFloat(editForm.weight) : null,
        length: editForm.length ? parseFloat(editForm.length) : null,
        width: editForm.width ? parseFloat(editForm.width) : null,
        height: editForm.height ? parseFloat(editForm.height) : null,
        senderName: editForm.senderName,
        senderTaxId: editForm.senderTaxId,
        senderDetails: editForm.senderDetails || null,
        senderAddressId: editForm.senderAddressId,
        receiverName: editForm.receiverName,
        receiverTaxId: editForm.receiverTaxId,
        receiverDetails: editForm.receiverDetails,
      };

      await api.put(`/Shipments/${editForm.id}`, shipmentPayload);

      // Step 3: Update products - compare with original and add/remove as needed
      const originalProductIds = originalEditProducts.map(p => p.id);
      const newProductIds = editSelectedProducts.map(p => p.id);

      // Remove products that are no longer in the list
      const toRemove = originalProductIds.filter(id => !newProductIds.includes(id));
      if (toRemove.length > 0) {
        await apiRequest(`/Shipments/${editForm.id}/products`, "DELETE", {
          productIds: toRemove,
        });
      }

      // Add new products or update quantities
      // Since backend doesn't have update endpoint, we need to remove and re-add products with changed quantities
      const toAddOrUpdate = editSelectedProducts.filter(p => {
        const original = originalEditProducts.find(op => op.id === p.id);
        return !original || original.quantity !== p.quantity;
      });

      if (toAddOrUpdate.length > 0) {
        // Get IDs of products that need quantity updates (already exist but quantity changed)
        const toUpdate = toAddOrUpdate
          .filter(p => originalProductIds.includes(p.id))
          .map(p => p.id);

        // Remove existing products that need quantity updates
        if (toUpdate.length > 0) {
          await apiRequest(`/Shipments/${editForm.id}/products`, "DELETE", {
            productIds: toUpdate,
          });
        }

        // Add all new and updated products
        await api.post(`/Shipments/${editForm.id}/products`, {
          products: toAddOrUpdate.map(p => ({
            productId: p.id,
            quantity: p.quantity,
          })),
        });
      }

      setToast({
        message: "Shipment updated successfully!",
        type: "success",
      });

      setShowEditModal(false);

      // Refresh the shipment details and list
      const updated = await api.get(`/Shipments/${editForm.id}`);
      setSelectedShipmentDetails(updated);
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection);
    } catch (err) {
      console.error(err);

      // Handle 409 Conflict errors with specific message
      if (err.response?.status === 409) {
        setToast({
          message: err.response?.data?.message || err.response?.data || "Conflict: Cannot update shipment with these values.",
          type: "error",
        });
      } else {
        setToast({
          message: err.response?.data?.message || err.response?.data || "Failed to update shipment.",
          type: "error",
        });
      }
    } finally {
      setSavingEdit(false);
    }
  };

  // Start collection workflow
  const handleStartCollection = () => {
    if (!selectedShipmentDetails || selectedShipmentDetails.status !== 5) {
      setToast({
        message: "Only delivered shipments can be collected.",
        type: "error",
      });
      return;
    }

    // Initialize collected products with shipment quantities
    const initialCollected = selectedShipmentDetails.shipmentProducts.map(sp => ({
      productId: sp.productId,
      productSKU: sp.productSKU,
      productName: sp.productName,
      shipmentQuantity: sp.quantity,
      collectedQuantity: 0,
      warehouseQuantity: 0, // Will be fetched
      locationId: null,
    }));

    setCollectedProducts(initialCollected);
    setLocationAssignments({});
    setShowCollectModal(true);

    // Fetch warehouse quantities
    fetchWarehouseQuantities(initialCollected);
  };

  // Fetch current warehouse quantities
  const fetchWarehouseQuantities = async (products) => {
    try {
      for (const product of products) {
        const warehouseData = await api.get(`/ProductsInWarehouse/product/${product.productId}`);
        const totalQty = warehouseData.reduce((sum, w) => sum + w.quantity, 0);

        setCollectedProducts(prev => prev.map(p =>
          p.productId === product.productId ? { ...p, warehouseQuantity: totalQty } : p
        ));
      }
    } catch (err) {
      console.error("Failed to fetch warehouse quantities", err);
    }
  };

  // Handle scan input (SKU/name search)
  const handleScanApply = () => {
    if (!scanInput.trim()) return;

    const term = scanInput.trim().toLowerCase();
    const matchedProduct = collectedProducts.find(p =>
      p.productSKU.toLowerCase().includes(term) || p.productName.toLowerCase().includes(term)
    );

    if (matchedProduct) {
      handleCollectedChange(matchedProduct.productId, matchedProduct.collectedQuantity + 1);
      setScanInput("");
    } else {
      setToast({
        message: "Product not found in shipment",
        type: "error",
      });
    }
  };

  // Handle manual quantity change
  const handleCollectedChange = (productId, newQuantity) => {
    const product = collectedProducts.find(p => p.productId === productId);
    if (!product) return;

    const oldQuantity = product.collectedQuantity;
    const difference = newQuantity - oldQuantity;

    if (difference > 0) {
      // Ask for location assignment for added products
      setLocationAssignments(prev => ({
        ...prev,
        [productId]: prev[productId] || null,
      }));
    }

    setCollectedProducts(prev => prev.map(p =>
      p.productId === productId ? { ...p, collectedQuantity: newQuantity } : p
    ));
  };

  // Handle location assignment
  const handleLocationChange = (productId, locationId) => {
    setLocationAssignments(prev => ({
      ...prev,
      [productId]: locationId,
    }));
  };

  // Finish collection
  const handleFinishCollection = async () => {
    // Validate all collected
    const incomplete = collectedProducts.filter(p => p.collectedQuantity !== p.shipmentQuantity);
    if (incomplete.length > 0) {
      setToast({
        message: "Some products are not fully collected. Please verify quantities.",
        type: "error",
      });
      return;
    }

    // Validate all have locations
    for (const product of collectedProducts) {
      if (product.collectedQuantity > 0 && !locationAssignments[product.productId]) {
        setToast({
          message: `Please assign a location for ${product.productName}`,
          type: "error",
        });
        return;
      }
    }

    setShowConfirmFinish(true);
  };

  // Confirm and execute collection
  const executeCollection = async () => {
    try {
      setLoading(true);

      // Add products to warehouse locations
      for (const product of collectedProducts) {
        if (product.collectedQuantity > 0) {
          await api.post("/ProductsInWarehouse", {
            productId: product.productId,
            locationId: locationAssignments[product.productId],
            quantity: product.collectedQuantity,
          });
        }
      }

      // Update shipment status to "Collected" (status 3)
      await api.patch(`/Shipments/${selectedShipmentDetails.id}/status`, { status: 3 });

      setToast({
        message: "Collection completed successfully!",
        type: "success",
      });

      setShowCollectModal(false);
      setShowConfirmFinish(false);

      // Refresh the shipment list
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection);
      setSelectedRow(null);
      setSelectedShipmentDetails(null);
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to complete collection.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Render status dropdown - available to all users with confirmation dialog
  const renderStatusCell = (row) => {
    const shipment = shipments.find(s => s.id === row.id);
    if (!shipment) return getStatusLabel(row.statusRaw);

    const currentStatus = shipment.status;

    // All users can change status, confirmation dialog will be shown
    return (
      <select
        value={currentStatus}
        onChange={(e) => {
          e.stopPropagation();
          const newStatus = e.target.value;
          // Only trigger if actually changed
          if (parseInt(newStatus) !== currentStatus) {
            handleStatusChangeRequest(row.id, currentStatus, newStatus);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="status-select"
      >
        {shipmentStatusesData.map(s => {
          // Only show current status and higher statuses
          if (s.id < currentStatus) {
            return null;
          }
          return <option key={s.id} value={s.id}>{s.value}</option>;
        })}
      </select>
    );
  };

  // Custom row renderer to include status dropdown
  const customRows = rows.map((row) => ({
    ...row,
    status: renderStatusCell(row),
  }));

  const handleSort = (column) => {
    const colDef = columns.find(c => c.key === column);
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

  // Helper to get status badge class
  const getStatusBadgeClass = (statusId) => {
    switch (statusId) {
      case 0: return "badge-unspecified"; // gray
      case 1: return "badge-in-preparation"; // blue
      case 2: return "badge-ready-to-collect"; // yellow
      case 3: return "badge-collected"; // orange
      case 4: return "badge-in-transit"; // purple
      case 5: return "badge-delivered"; // green
      case 6: return "badge-cancelled"; // red
      case 7: return "badge-returned"; // brown
      default: return "badge-unspecified";
    }
  };

  const detailsConfig = {
    status: {
      key: "status",
      render: (data) => (
        <div className={`badge ${getStatusBadgeClass(data.status)}`}>
          {getStatusLabel(data.status)}
        </div>
      ),
    },
    fields: [
      { label: "ID", key: "id" },
      { label: "Sender Name", key: "senderName" },
      { label: "Sender Tax ID", key: "senderTaxId" },
      { label: "Sender Address", key: "senderAddress", render: (data) => {
        if (!data.senderAddress) return "—";
        const addr = data.senderAddress;
        // Backend returns country as string name (e.g., "Poland"), not enum value
        const countryName = addr.country || addr.Country || "Unknown";
        return `${addr.street} ${addr.building}${addr.premises ? `/${addr.premises}` : ""}, ${addr.postalCode} ${addr.city}, ${countryName}`;
      }},
      { label: "Receiver Name", key: "receiverName" },
      { label: "Receiver Tax ID", key: "receiverTaxId" },
      { label: "Receiver Details", key: "receiverDetails" },
      { label: "Weight (kg)", key: "weight", render: (data) => data.weight ? `${data.weight} kg` : "—" },
      { label: "Dimensions (cm)", key: "dimensions", render: (data) =>
        data.length && data.width && data.height ? `${data.length} x ${data.width} x ${data.height}` : "—"
      },
      { label: "Send Date", key: "sendDate", render: (data) => formatDate(data.sendDate) },
      { label: "Delivery Date", key: "deliveryDate", render: (data) => formatDate(data.deliveryDate) },
      { label: "Description", key: "description", isColumn: true },
    ],
    hideActions: true,
  };

  // Handle View Products button click
  const handleViewProducts = async () => {
    if (!selectedShipmentDetails) {
      setToast({
        message: "Please select a shipment to view products.",
        type: "error",
      });
      return;
    }

    // Fetch warehouse stock for each product
    try {
      const productsWithStock = await Promise.all(
        (selectedShipmentDetails.shipmentProducts || []).map(async (sp) => {
          try {
            const response = await api.get("/products-in-warehouse/search-product", {
              params: {
                pageNumber: 1,
                pageSize: 1,
                searchTerm: sp.productSKU,
              },
            });
            const productData = response.items?.[0];
            return {
              ...sp,
              warehouseStock: productData?.totalQuantity || 0,
              productId: sp.productId,
            };
          } catch (err) {
            console.error("Failed to fetch stock for product", sp.productSKU, err);
            return {
              ...sp,
              warehouseStock: 0,
              productId: sp.productId,
            };
          }
        })
      );

      setViewProductsData(productsWithStock);
      setExpandedProductLocations({});
      setShowViewProductsModal(true);
    } catch (err) {
      console.error("Failed to fetch product warehouse data", err);
      setToast({
        message: "Failed to load product warehouse information.",
        type: "error",
      });
    }
  };

  // Handle toggle location view for a product (accordion behavior - only one open at a time)
  const handleToggleProductLocations = async (productId) => {
    if (expandedProductLocations[productId]) {
      // Collapse - close all
      setExpandedProductLocations({});
    } else {
      // Expand - close all others and fetch locations for this product
      try {
        const locations = await api.get(`/products-in-warehouse/product/${productId}`);
        // Close all other products and open only this one
        setExpandedProductLocations({ [productId]: locations });
      } catch (err) {
        console.error("Failed to fetch locations for product", productId, err);
        setToast({
          message: "Failed to load product locations.",
          type: "error",
        });
      }
    }
  };

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
        <BaseListPage
          title="Incoming Shipments"
          columns={columns}
          data={customRows}
          loading={loading}
          error={error}
          selectedRow={selectedRow}
          onSelectRow={handleRowSelect}
          detailsData={selectedShipmentDetails}
          detailsConfig={detailsConfig}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onAdd={handleOpenAddModal}
          onEdit={handleOpenEditModal}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSearchChange={setSearchQuery}
          searchValue={searchQuery}
          hideDeleteButton={true}
          hideAddButton={false}
          disableEdit={!selectedRow}
          changePasswordButtonLabel="Collect"
          changePasswordButtonClass="btn-go-to"
          changePasswordDisabled={!selectedRow || selectedRow.statusRaw !== 5}
          onChangePassword={handleStartCollection}
          changePasswordButtonIcon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          }
          changeLoginButtonLabel="View Products"
          changeLoginButtonClass="btn-view"
          changeLoginDisabled={!selectedRow}
          onChangeLogin={handleViewProducts}
          changeLoginButtonIcon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 4h4m-4 3h4m-4 3h4"/>
            </svg>
          }
        />

        {/* Filters panel */}
        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>
            <div className="filter-group">
              <select
                id="status-filter"
                name="status"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="filter-input"
              >
                <option value="">All Statuses</option>
                {shipmentStatusesData.map(s => (
                  <option key={s.id} value={s.id}>{s.value}</option>
                ))}
              </select>
            </div>

            <div className="filter-date-group">
              <label>Send Date</label>
              <div className="filter-date-inputs">
                <input
                  type="date"
                  name="sendDateFrom"
                  placeholder="From"
                  value={filters.sendDateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, sendDateFrom: e.target.value }))}
                  className="filter-input"
                />
                <span className="date-separator">to</span>
                <input
                  type="date"
                  name="sendDateTo"
                  placeholder="To"
                  value={filters.sendDateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, sendDateTo: e.target.value }))}
                  className="filter-input"
                />
              </div>
            </div>

            <div className="filter-date-group">
              <label>Delivery Date</label>
              <div className="filter-date-inputs">
                <input
                  type="date"
                  name="deliveryDateFrom"
                  placeholder="From"
                  value={filters.deliveryDateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, deliveryDateFrom: e.target.value }))}
                  className="filter-input"
                />
                <span className="date-separator">to</span>
                <input
                  type="date"
                  name="deliveryDateTo"
                  placeholder="To"
                  value={filters.deliveryDateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, deliveryDateTo: e.target.value }))}
                  className="filter-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={observerRef} style={{ height: "1px" }} />
      </main>

      {/* Add Shipment Modal */}
      {showAddModal && (
        <Modal
          title="Register Incoming Shipment"
          onClose={() => setShowAddModal(false)}
          wide
        >
          <div className="add-shipment-modal">
            <form onSubmit={(e) => { e.preventDefault(); handleSaveShipment(); }}>
              <div className="form-content">
                {/* Section A: Basic Information */}
                <div className="form-section">
                <h4 className="section-title">Basic Information</h4>
                <div className="form-grid-2col">
                  <div className="form-field">
                    <label htmlFor="status">Status *</label>
                    <select
                      id="status"
                      name="status"
                      value={addForm.status}
                      onChange={handleAddFormChange}
                      required
                    >
                      <option value={0}>Unspecified</option>
                      <option value={1}>In Preparation</option>
                      <option value={2}>Ready to Collect</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="sendDate">Send Date</label>
                    <input
                      type="date"
                      id="sendDate"
                      name="sendDate"
                      value={addForm.sendDate}
                      onChange={handleAddFormChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="deliveryDate">Delivery Date</label>
                    <input
                      type="date"
                      id="deliveryDate"
                      name="deliveryDate"
                      value={addForm.deliveryDate}
                      onChange={handleAddFormChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="weight">Weight (kg)</label>
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={addForm.weight}
                      onChange={handleAddFormChange}
                    />
                  </div>
                </div>

                <div className="form-grid-3col">
                  <div className="form-field">
                    <label htmlFor="length">Length (cm)</label>
                    <input
                      type="number"
                      id="length"
                      name="length"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={addForm.length}
                      onChange={handleAddFormChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="width">Width (cm)</label>
                    <input
                      type="number"
                      id="width"
                      name="width"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={addForm.width}
                      onChange={handleAddFormChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="height">Height (cm)</label>
                    <input
                      type="number"
                      id="height"
                      name="height"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={addForm.height}
                      onChange={handleAddFormChange}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    placeholder="Enter shipment description..."
                    value={addForm.description}
                    onChange={handleAddFormChange}
                  />
                </div>
              </div>

              {/* Section B: Sender Information */}
              <div className="form-section">
                <h4 className="section-title">Sender Information</h4>
                <div className="form-grid-2col">
                  <div className="form-field">
                    <label htmlFor="senderName">Name *</label>
                    <input
                      type="text"
                      id="senderName"
                      name="senderName"
                      placeholder="Company or person name"
                      value={addForm.senderName}
                      onChange={handleAddFormChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="senderTaxId">Tax ID *</label>
                    <input
                      type="text"
                      id="senderTaxId"
                      name="senderTaxId"
                      placeholder="Tax identification number"
                      value={addForm.senderTaxId}
                      onChange={handleAddFormChange}
                      required
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="senderDetails">Sender Details</label>
                    <textarea
                      id="senderDetails"
                      name="senderDetails"
                      rows="2"
                      placeholder="Additional notes about sender (optional)"
                      value={addForm.senderDetails}
                      onChange={handleAddFormChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="senderStreet">Street *</label>
                    <input
                      type="text"
                      id="senderStreet"
                      name="senderStreet"
                      placeholder="Street name"
                      value={addForm.senderStreet}
                      onChange={handleAddFormChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="senderBuilding">Building *</label>
                    <input
                      type="text"
                      id="senderBuilding"
                      name="senderBuilding"
                      placeholder="Building number"
                      value={addForm.senderBuilding}
                      onChange={handleAddFormChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="senderPremises">Premises</label>
                    <input
                      type="text"
                      id="senderPremises"
                      name="senderPremises"
                      placeholder="Apartment/Suite (optional)"
                      value={addForm.senderPremises}
                      onChange={handleAddFormChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="senderPostalCode">Postal Code *</label>
                    <input
                      type="text"
                      id="senderPostalCode"
                      name="senderPostalCode"
                      placeholder="12-345"
                      value={addForm.senderPostalCode}
                      onChange={handleAddFormChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="senderCity">City *</label>
                    <input
                      type="text"
                      id="senderCity"
                      name="senderCity"
                      placeholder="City name"
                      value={addForm.senderCity}
                      onChange={handleAddFormChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="senderCountry">Country *</label>
                    <select
                      id="senderCountry"
                      name="senderCountry"
                      value={addForm.senderCountry}
                      onChange={handleAddFormChange}
                      required
                    >
                      {Object.entries(countries).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section C: Receiver Information (Display Only) */}
              <div className="form-section">
                <h4 className="section-title">Receiver Information (Store)</h4>
                <div className="receiver-info-display">
                  <div className="info-row">
                    <span className="info-label">Name:</span>
                    <span className="info-value">Main Store</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Tax ID:</span>
                    <span className="info-value">1234567890</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Address:</span>
                    <span className="info-value">Main Street 123, 00-950 Warszawa, Poland</span>
                  </div>
                </div>
                <div className="form-field" style={{ marginTop: "15px" }}>
                  <label htmlFor="receiverDetails">Receiver Details</label>
                  <textarea
                    id="receiverDetails"
                    name="receiverDetails"
                    rows="2"
                    placeholder="Additional notes about receiver (optional)"
                    value={addForm.receiverDetails}
                    onChange={handleAddFormChange}
                  />
                </div>
              </div>

              {/* Section E: Product Selection */}
              <div className="form-section">
                <h4 className="section-title">Products *</h4>
                <div className="product-search-panel">
                  <input
                    type="text"
                    placeholder="Search products by name or SKU... (Type full SKU and press Enter for exact match)"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={handleProductSearchKeyDown}
                    onFocus={() => productSuggestions.length > 0 && setShowProductDropdown(true)}
                    className="product-search-input"
                    autoComplete="off"
                  />
                  {showProductDropdown && productSuggestions.length > 0 && (
                    <div
                      className="product-suggestions"
                      ref={productDropdownRef}
                      onScroll={handleProductDropdownScroll}
                    >
                      {productSuggestions.map((product, index) => (
                        <div
                          key={product.productId || product.id}
                          className={`product-suggestion-item ${index === highlightedIndex ? "highlighted" : ""}`}
                          onClick={() => handleAddProduct(product)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          <div className="product-suggestion-main">
                            <strong>{product.name}</strong>
                            <span className="product-sku">{product.sku}</span>
                          </div>
                          <span className="product-stock">Stock: {product.totalQuantity || 0}</span>
                        </div>
                      ))}
                      {loadingProducts && (
                        <div className="product-suggestion-item loading-item">
                          Loading more products...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedProducts.length > 0 ? (
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Amount in Shipment</th>
                        <th>Amount in Store</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.map(product => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>{product.sku}</td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={product.quantity}
                              onChange={(e) => handleProductQuantityChange(product.id, e.target.value)}
                              className="quantity-input"
                            />
                          </td>
                          <td>{product.currentStock}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(product.id)}
                              className="btn-remove-product"
                              title="Remove product"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-products-message">No products added. Search and select products above.</p>
                )}
              </div>
              </div>

              {/* Section F: Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-cancel"
                  disabled={savingShipment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm"
                  disabled={savingShipment}
                >
                  {savingShipment ? "Saving..." : "Save Shipment"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Edit Shipment Modal */}
      {showEditModal && (
        <Modal
          title="Edit Shipment"
          onClose={() => setShowEditModal(false)}
          wide
        >
          <div className="edit-shipment-modal">
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              <div className="form-content" style={{ flex: 1, overflowY: "auto", paddingBottom: "20px" }}>
                {/* Section A: Basic Information */}
                <div className="form-section">
                  <h4 className="section-title">Basic Information</h4>
                  <div className="form-grid-2col">
                    <div className="form-field">
                      <label htmlFor="edit-status">Status *</label>
                      <select
                        id="edit-status"
                        name="status"
                        value={editForm.status}
                        onChange={handleEditFormChange}
                        required
                      >
                        {shipmentStatusesData.map(status => (
                          <option key={status.id} value={status.id}>{status.value}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-sendDate">Send Date</label>
                      <input
                        type="date"
                        id="edit-sendDate"
                        name="sendDate"
                        value={editForm.sendDate}
                        onChange={handleEditFormChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-deliveryDate">Delivery Date</label>
                      <input
                        type="date"
                        id="edit-deliveryDate"
                        name="deliveryDate"
                        value={editForm.deliveryDate}
                        onChange={handleEditFormChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-weight">Weight (kg)</label>
                      <input
                        type="number"
                        id="edit-weight"
                        name="weight"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={editForm.weight}
                        onChange={handleEditFormChange}
                      />
                    </div>
                  </div>

                  <div className="form-grid-3col">
                    <div className="form-field">
                      <label htmlFor="edit-length">Length (cm)</label>
                      <input
                        type="number"
                        id="edit-length"
                        name="length"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={editForm.length}
                        onChange={handleEditFormChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-width">Width (cm)</label>
                      <input
                        type="number"
                        id="edit-width"
                        name="width"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={editForm.width}
                        onChange={handleEditFormChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-height">Height (cm)</label>
                      <input
                        type="number"
                        id="edit-height"
                        name="height"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={editForm.height}
                        onChange={handleEditFormChange}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-description">Description</label>
                    <textarea
                      id="edit-description"
                      name="description"
                      rows="3"
                      placeholder="Enter shipment description..."
                      value={editForm.description}
                      onChange={handleEditFormChange}
                    />
                  </div>
                </div>

                {/* Section B: Sender Information */}
                <div className="form-section">
                  <h4 className="section-title">Sender Information</h4>
                  <div className="form-grid-2col">
                    <div className="form-field">
                      <label htmlFor="edit-senderName">Name *</label>
                      <input
                        type="text"
                        id="edit-senderName"
                        name="senderName"
                        placeholder="Company or person name"
                        value={editForm.senderName}
                        onChange={handleEditFormChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-senderTaxId">Tax ID *</label>
                      <input
                        type="text"
                        id="edit-senderTaxId"
                        name="senderTaxId"
                        placeholder="Tax identification number"
                        value={editForm.senderTaxId}
                        onChange={handleEditFormChange}
                        required
                      />
                    </div>

                    <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                      <label htmlFor="edit-senderDetails">Sender Details</label>
                      <textarea
                        id="edit-senderDetails"
                        name="senderDetails"
                        rows="2"
                        placeholder="Additional notes about sender (optional)"
                        value={editForm.senderDetails}
                        onChange={handleEditFormChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-senderStreet">Street *</label>
                      <input
                        type="text"
                        id="edit-senderStreet"
                        name="senderStreet"
                        placeholder="Street name"
                        value={editForm.senderStreet}
                        onChange={handleEditFormChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-senderBuilding">Building *</label>
                      <input
                        type="text"
                        id="edit-senderBuilding"
                        name="senderBuilding"
                        placeholder="Building number"
                        value={editForm.senderBuilding}
                        onChange={handleEditFormChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-senderPremises">Premises</label>
                      <input
                        type="text"
                        id="edit-senderPremises"
                        name="senderPremises"
                        placeholder="Apartment/Suite (optional)"
                        value={editForm.senderPremises}
                        onChange={handleEditFormChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-senderPostalCode">Postal Code *</label>
                      <input
                        type="text"
                        id="edit-senderPostalCode"
                        name="senderPostalCode"
                        placeholder="12-345"
                        value={editForm.senderPostalCode}
                        onChange={handleEditFormChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-senderCity">City *</label>
                      <input
                        type="text"
                        id="edit-senderCity"
                        name="senderCity"
                        placeholder="City name"
                        value={editForm.senderCity}
                        onChange={handleEditFormChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="edit-senderCountry">Country *</label>
                      <select
                        id="edit-senderCountry"
                        name="senderCountry"
                        value={editForm.senderCountry}
                        onChange={handleEditFormChange}
                        required
                      >
                        {Object.entries(countries).map(([id, name]) => (
                          <option key={id} value={id}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section C: Receiver Information (Display Only) */}
                <div className="form-section">
                  <h4 className="section-title">Receiver Information (Read Only)</h4>
                  <div className="receiver-info-display">
                    <div className="info-row">
                      <span className="info-label">Name:</span>
                      <span className="info-value">{editForm.receiverName || "—"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Tax ID:</span>
                      <span className="info-value">{editForm.receiverTaxId || "—"}</span>
                    </div>
                  </div>
                  <div className="form-field" style={{ marginTop: "15px" }}>
                    <label htmlFor="edit-receiverDetails">Receiver Details</label>
                    <textarea
                      id="edit-receiverDetails"
                      name="receiverDetails"
                      rows="2"
                      placeholder="Additional notes about receiver (optional)"
                      value={editForm.receiverDetails}
                      onChange={handleEditFormChange}
                    />
                  </div>
                </div>

                {/* Section D: Product Management */}
                <div className="form-section">
                  <h4 className="section-title">Products *</h4>
                  <div className="product-search-panel">
                    <input
                      type="text"
                      placeholder="Search products by name or SKU... (Type full SKU and press Enter for exact match)"
                      value={editProductSearch}
                      onChange={(e) => setEditProductSearch(e.target.value)}
                      onKeyDown={handleEditProductSearchKeyDown}
                      onFocus={() => editProductSuggestions.length > 0 && setShowEditProductDropdown(true)}
                      className="product-search-input"
                      autoComplete="off"
                    />
                    {showEditProductDropdown && editProductSuggestions.length > 0 && (
                      <div
                        className="product-suggestions"
                        ref={editProductDropdownRef}
                        onScroll={handleEditProductDropdownScroll}
                      >
                        {editProductSuggestions.map((product, index) => (
                          <div
                            key={product.productId || product.id}
                            className={`product-suggestion-item ${index === editHighlightedIndex ? "highlighted" : ""}`}
                            onClick={() => handleEditAddProduct(product)}
                            onMouseEnter={() => setEditHighlightedIndex(index)}
                          >
                            <div className="product-suggestion-main">
                              <strong>{product.name}</strong>
                              <span className="product-sku">{product.sku}</span>
                            </div>
                            <span className="product-stock">Stock: {product.totalQuantity || 0}</span>
                          </div>
                        ))}
                        {loadingEditProducts && (
                          <div className="product-suggestion-item loading-item">
                            Loading more products...
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {editSelectedProducts.length > 0 ? (
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>SKU</th>
                          <th>Amount in Shipment</th>
                          <th>Amount in Store</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editSelectedProducts.map(product => (
                          <tr key={product.id}>
                            <td>{product.name}</td>
                            <td>{product.sku}</td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={product.quantity}
                                onChange={(e) => handleEditProductQuantityChange(product.id, e.target.value)}
                                className="quantity-input"
                              />
                            </td>
                            <td>{product.currentStock}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => handleEditRemoveProduct(product.id)}
                                className="btn-remove-product"
                                title="Remove product"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="no-products-message">No products added. Search and select products above.</p>
                  )}
                </div>
              </div>

              {/* Section E: Actions */}
              <div className="form-actions" style={{ flexShrink: 0, paddingTop: "10px", borderTop: "1px solid #ddd" }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-cancel"
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Collection Modal */}
      {showCollectModal && (
        <Modal
          title="Collect Shipment Products"
          onClose={() => setShowCollectModal(false)}
          wide
        >
          <div className="collection-modal">
            <div className="scan-panel">
              <input
                type="text"
                placeholder="Scan or enter product SKU/name"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleScanApply()}
              />
              <button onClick={handleScanApply} className="btn-action btn-primary">
                Add +1
              </button>
            </div>

            <table className="collection-table">
              <thead>
                <tr>
                  <th>Product (SKU)</th>
                  <th>Shipment Qty</th>
                  <th>Collected</th>
                  <th>In Store</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {collectedProducts.map(product => {
                  const isComplete = product.collectedQuantity === product.shipmentQuantity;
                  const isError = product.collectedQuantity !== product.shipmentQuantity;
                  const rowClass = isComplete ? "row-success" : (isError ? "row-error" : "");

                  return (
                    <tr key={product.productId} className={rowClass}>
                      <td>{product.productName} ({product.productSKU})</td>
                      <td>{product.shipmentQuantity}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={product.collectedQuantity}
                          onChange={(e) => handleCollectedChange(product.productId, parseInt(e.target.value) || 0)}
                          className="collected-input"
                        />
                      </td>
                      <td>{product.warehouseQuantity}</td>
                      <td>
                        <select
                          value={locationAssignments[product.productId] || ""}
                          onChange={(e) => handleLocationChange(product.productId, parseInt(e.target.value))}
                          disabled={product.collectedQuantity === 0}
                        >
                          <option value="">Select location</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>
                              {loc.zone}-{loc.col}-{loc.shelf}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <button onClick={handleFinishCollection} className="btn-action btn-success finish-btn">
              Finish Collection
            </button>
          </div>
        </Modal>
      )}

      {/* View Products Modal */}
      {showViewProductsModal && (
        <Modal
          title="Products in Shipment"
          onClose={() => setShowViewProductsModal(false)}
          wide
        >
          <div className="view-products-modal">
            {viewProductsData && viewProductsData.length > 0 ? (
              <>
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>Quantity in Shipment</th>
                      <th>Number in Storage</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewProductsData.map((product, index) => (
                      <React.Fragment key={index}>
                        <tr>
                          <td>{product.productName}</td>
                          <td>{product.productSKU}</td>
                          <td>{product.quantity}</td>
                          <td>{product.warehouseStock}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleToggleProductLocations(product.productId)}
                              className="btn-action btn-view"
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                            >
                              {expandedProductLocations[product.productId] ? "Hide Locations" : "View Locations"}
                            </button>
                          </td>
                        </tr>
                        {expandedProductLocations[product.productId] && (
                          <tr>
                            <td colSpan="5" style={{ backgroundColor: "#f9f9f9", padding: "10px" }}>
                              <div className="locations-list">
                                {expandedProductLocations[product.productId].length > 0 ? (
                                  <table style={{ marginTop: "10px", width: "100%", fontSize: "13px" }}>
                                    <thead>
                                      <tr>
                                        <th>Zone</th>
                                        <th>Column</th>
                                        <th>Shelf</th>
                                        <th>Quantity</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {expandedProductLocations[product.productId].map((loc, idx) => (
                                        <tr key={idx}>
                                          <td>{loc.zone}</td>
                                          <td>{loc.col}</td>
                                          <td>{loc.shelf}</td>
                                          <td>{loc.quantity}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p style={{ marginTop: "10px", fontStyle: "italic", color: "#666" }}>
                                    No locations found for this product.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginBottom: "2rem" }}></div>
              </>
            ) : (
              <p className="no-products-message">No products in this shipment.</p>
            )}
            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowViewProductsModal(false)}
                className="btn-confirm"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Finish Dialog */}
      {showConfirmFinish && (
        <ConfirmDialog
          title="Confirm Collection"
          message="Are you sure? This action is irreversible. Products will be added to warehouse locations."
          confirmText="Confirm"
          onConfirm={executeCollection}
          onCancel={() => setShowConfirmFinish(false)}
        />
      )}

      {/* Confirm Status Change Dialog */}
      {pendingStatusChange && (
        <ConfirmDialog
          title="Confirm Status Change"
          message={`Are you sure you want to change status to ${pendingStatusChange.statusLabel}?`}
          confirmText="Confirm"
          confirmButtonClass="dialog-btn-confirm-positive"
          onConfirm={executeStatusChange}
          onCancel={() => setPendingStatusChange(null)}
        />
      )}

      {/* Toast messages */}
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
