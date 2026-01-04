// === IMPORTS ===
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { api, apiRequest } from "../../../api/apiClient";
import Header from "../../../components/Header";
import BaseListPage from "../../BaseListPage";
import ConfirmDialog from "../../../components/ConfirmDialog";
import MessageBox from "../../../components/MessageBox";
import { shipmentStatusesData } from "../../../data/shipmentStatuses";
import { countries, getCountryValue } from "../../../data/countries";
import { userRolesData } from "../../../data/userRoles";
import { getValidStatusOptions } from "../../../utils/shipmentStatusUtils";
import AddModal from "./Modals/AddModal";
import EditModal from "./Modals/EditModal";
import CollectModal from "./Modals/CollectModal";
import ViewProductsModal from "./Modals/ViewProductsModal";
import "../../../styles/PagesStyles/shipments.css";

// === COMPONENT ===
/**
 * IncomingShipments page - Manage incoming shipments to warehouse
 *
 * This page handles the complete incoming shipment workflow:
 * - Register new incoming shipments with sender information
 * - Edit shipment details and product lists
 * - Collection workflow with barcode scanning and multi-location assignment
 * - View shipment products and collection summaries
 * - Status management with role-based permissions
 *
 * Key Features:
 * - Product search with infinite scroll dropdown
 * - Multi-location assignment during collection
 * - Real-time quantity validation (collected vs declared)
 * - Color-coded collection status (red/yellow/green)
 * - Extra product handling (products not in original shipment)
 * - Role-based status change permissions (DeputyManager+)
 * - Client and server-side sorting (volume and quantity = client-side)
 * - Advanced filtering (dates, statuses, search)
 *
 * Collection Workflow:
 * 1. Click "Collect" on a shipment (status must be ReadyToCollect)
 * 2. Scan or search products to add quantities
 * 3. Assign warehouse locations for each product
 * 4. System validates all products have locations assigned
 * 5. Finish collection to update inventory and mark as Delivered
 *
 * @returns {JSX.Element} The incoming shipments management page
 */
export default function IncomingShipments() {
  // === STATE ===
  // Main data state
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
  const [selectedStatuses, setSelectedStatuses] = useState([1, 2, 3, 4]); // Default: InPreparation, AwaitingPickup, InTransit, Delivered
  const [filters, setFilters] = useState({
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
  const [collectedQuantities, setCollectedQuantities] = useState({}); // { productId: [{ quantity: 5, locationId: 123 }] }
  const [scanInput, setScanInput] = useState("");
  const [locations, setLocations] = useState([]);
  const [isCollectionValid, setIsCollectionValid] = useState(false);

  const observerRef = useRef(null);
  const filtersRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const userRole = user?.role;
  const userRoleLevel = userRolesData.find(r => r.value === userRole)?.id || 0;

  // Helper: get role level by name
  const getRoleLevel = (roleName) => {
    return userRolesData.find(r => r.value === roleName)?.id || 0;
  };

  // Check if user can change shipment status (DeputyManager and above = level 4+)
  const deputyManagerLevel = getRoleLevel("DeputyManager");
  const canChangeShipmentStatus = userRoleLevel >= deputyManagerLevel;

  // State for status change confirmation
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  // State for View Products Modal
  const [showViewProductsModal, setShowViewProductsModal] = useState(false);
  const [viewProductsData, setViewProductsData] = useState([]);
  const [expandedProductLocations, setExpandedProductLocations] = useState({});

  // Table columns - ID, From, Size, Total Qty, Send Date, Delivery Date, Status
  const columns = [
    { key: "id", label: "ID", width: "8%", sortable: true, sortKey: "id" },
    { key: "senderName", label: "From", width: "22%", sortable: true, sortKey: "sendername" },
    { key: "volume", label: "Size", width: "13%", sortable: true, clientSort: true }, // Client-side sort only
    { key: "totalQuantity", label: "Total Qty", width: "12%", sortable: true, clientSort: true }, // Client-side sort only
    { key: "sendDate", label: "Send Date", width: "13%", sortable: true, sortKey: "senddate" },
    { key: "deliveryDate", label: "Delivery Date", width: "13%", sortable: true, sortKey: "deliverydate" },
    { key: "status", label: "Status", width: "13%", sortable: true, sortKey: "status" },
  ];

  // Fetch shipments data
  const fetchShipmentsData = async (page, currentFilters, currentSearchQuery, currentSortColumn, currentSortDirection, currentSelectedStatuses) => {
    try {
      setLoading(true);

      // Check if the column is client-side sorted
      const columnDef = columns.find(c => c.key === currentSortColumn);
      const isClientSort = columnDef?.clientSort === true;

      // Translate frontend column key to backend sort key (skip if client-side sort)
      const backendSortKey = !isClientSort && currentSortColumn
        ? columnDef?.sortKey || currentSortColumn
        : null;

      // Build params object with multiple statuses
      const params = {
        PageNumber: page,
        PageSize: 50,
        type: 1, // Incoming type
        ...(currentSearchQuery && { q: currentSearchQuery }),
        ...(currentFilters.sendDateFrom && { sendDateFrom: currentFilters.sendDateFrom }),
        ...(currentFilters.sendDateTo && { sendDateTo: currentFilters.sendDateTo }),
        ...(currentFilters.deliveryDateFrom && { deliveryDateFrom: currentFilters.deliveryDateFrom }),
        ...(currentFilters.deliveryDateTo && { deliveryDateTo: currentFilters.deliveryDateTo }),
        ...(backendSortKey && { orderBy: backendSortKey }),
        ...(backendSortKey && currentSortDirection && { sortDirection: currentSortDirection }),
      };

      // Add multiple status parameters if any are selected
      if (currentSelectedStatuses && currentSelectedStatuses.length > 0) {
        currentSelectedStatuses.forEach(statusId => {
          if (!params.statuses) {
            params.statuses = [];
          }
          params.statuses.push(statusId);
        });
      }

      const { items, totalPages } = await api.get("/Shipments", { params });

      if (items?.length) {
        // Apply client-side sorting if needed
        let sortedItems = items;
        if (isClientSort && currentSortColumn && currentSortDirection) {
          sortedItems = [...items].sort((a, b) => {
            let aValue, bValue;

            // For volume column, calculate volume from dimensions
            if (currentSortColumn === 'volume') {
              aValue = (a.length && a.width && a.height)
                ? a.length * a.width * a.height
                : 0;
              bValue = (b.length && b.width && b.height)
                ? b.length * b.width * b.height
                : 0;
            } else {
              aValue = a[currentSortColumn];
              bValue = b[currentSortColumn];

              // Handle null/undefined values
              if (aValue == null) aValue = 0;
              if (bValue == null) bValue = 0;

              // For totalQuantity, ensure numeric comparison
              if (currentSortColumn === 'totalQuantity') {
                aValue = Number(aValue) || 0;
                bValue = Number(bValue) || 0;
              }
            }

            if (currentSortDirection === 'asc') {
              return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
              return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
          });
        }

        setShipments(sortedItems);
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
    fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Instant update for sorting and filtering (no delay)
  useEffect(() => {
    setShipments([]);
    setPageNumber(1);
    fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortColumn, sortDirection, selectedStatuses]);

  // Debounced search (500ms delay for text input)
  useEffect(() => {
    const delay = setTimeout(() => {
      setShipments([]);
      setPageNumber(1);
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
    }, 500);
    return () => clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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
      fetchShipmentsData(pageNumber, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
    }
  }, [pageNumber, filters, searchQuery, sortColumn, sortDirection, selectedStatuses]);

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


  // Format dates for display as DD/MM/YYYY - HH:MM
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  };

  // Get status label
  const getStatusLabel = (statusId) => {
    return shipmentStatusesData.find(s => s.id === statusId)?.value || "Unknown";
  };

  // Helper to get status badge class
  const getStatusBadgeClass = (statusId) => {
    switch (statusId) {
      case 0: return "badge-unspecified"; // gray
      case 1: return "badge-in-preparation"; // blue
      case 2: return "badge-ready-to-collect"; // yellow
      case 3: return "badge-in-transit"; // purple
      case 4: return "badge-delivered"; // green
      case 5: return "badge-cancelled"; // red
      case 6: return "badge-returned"; // brown
      default: return "badge-unspecified";
    }
  };

  const rows = shipments.map((s) => {
    // Calculate volume (length × width × height) in cm³
    // Dimensions are in cm, so volume = length × width × height (no conversion needed)
    const volumeCalc = s.length && s.width && s.height
      ? s.length * s.width * s.height
      : 0;

    return {
      id: s.id,
      senderName: `${s.senderName || "Unknown"}${s.senderTaxId ? ` (${s.senderTaxId})` : ""}`,
      volume: s.length && s.width && s.height
        ? `${s.length} x ${s.width} x ${s.height} (${volumeCalc.toLocaleString()} cm³)`
        : "—",
      volumeValue: volumeCalc, // Store numeric value for sorting
      totalQuantity: s.totalQuantity || 0,
      sendDate: formatDate(s.sendDate),
      deliveryDate: formatDate(s.deliveryDate),
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

      // Refresh the shipment details
      const updated = await api.get(`/Shipments/${shipmentId}`);
      setSelectedShipmentDetails(updated);

      // Update in list
      setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: newStatus } : s));

      // Reload the main list to get updated dates and other fields
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);

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
      ean: product.ean || null,
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
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
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

    // Auto-set send date when status changes to InTransit (3) or higher
    if (name === "status") {
      const newStatus = parseInt(value);
      setEditForm(prev => {
        const updates = { [name]: value };

        // If changing to InTransit or higher and no send date set, auto-set to today
        if (newStatus >= 3 && !prev.sendDate) {
          const today = new Date().toISOString().split('T')[0];
          updates.sendDate = today;
        }

        // If changing to Delivered and no delivery date set, auto-set to today
        if (newStatus >= 4 && !prev.deliveryDate) {
          const today = new Date().toISOString().split('T')[0];
          updates.deliveryDate = today;
        }

        return { ...prev, ...updates };
      });
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
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
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
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
    if (!selectedShipmentDetails || selectedShipmentDetails.status !== 4) {
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
      warehouseQuantity: 0, // Will be fetched
    }));

    setCollectedProducts(initialCollected);

    // Initialize collectedQuantities with one empty row per product
    const initialQuantities = {};
    initialCollected.forEach(product => {
      initialQuantities[product.productId] = [{ quantity: 0, locationId: null }];
    });
    setCollectedQuantities(initialQuantities);

    setShowCollectModal(true);

    // Fetch warehouse quantities
    fetchWarehouseQuantities(initialCollected);
  };

  // Fetch current warehouse quantities
  const fetchWarehouseQuantities = async (products) => {
    try {
      const promises = products.map(async (product) => {
        try {
          const warehouseData = await api.get(`/products-in-warehouse/product/${product.productId}`);
          const totalQty = Array.isArray(warehouseData) ? warehouseData.reduce((sum, w) => sum + w.quantity, 0) : 0;
          return { productId: product.productId, totalQty };
        } catch (err) {
          console.error(`Failed to fetch warehouse quantity for product ${product.productId}`, err);
          return { productId: product.productId, totalQty: 0 };
        }
      });

      const results = await Promise.all(promises);

      setCollectedProducts(prev => prev.map(p => {
        const result = results.find(r => r.productId === p.productId);
        return result ? { ...p, warehouseQuantity: result.totalQty } : p;
      }));
    } catch (err) {
      console.error("Failed to fetch warehouse quantities", err);
    }
  };

  // Handle scan input (SKU/name search)
  const handleScanApply = async () => {
    if (!scanInput.trim()) return;

    const term = scanInput.trim().toLowerCase();
    const matchedProduct = collectedProducts.find(p =>
      p.productSKU.toLowerCase().includes(term) || p.productName.toLowerCase().includes(term)
    );

    if (matchedProduct) {
      // Add 1 to the first location row (overage is allowed)
      const currentRows = collectedQuantities[matchedProduct.productId] || [];

      // Add 1 to the first row
      const updatedRows = [...currentRows];
      if (updatedRows.length > 0) {
        updatedRows[0] = { ...updatedRows[0], quantity: (parseInt(updatedRows[0].quantity) || 0) + 1 };
      }

      setCollectedQuantities(prev => ({
        ...prev,
        [matchedProduct.productId]: updatedRows,
      }));

      setScanInput("");
    } else {
      // Product not in shipment - try to lookup in database
      try {
        const response = await api.get("/products-in-warehouse/search-product", {
          params: {
            pageNumber: 1,
            pageSize: 1,
            searchTerm: term,
          },
        });

        const products = response.items || [];
        // Check if we found a matching product
        if (products.length > 0 && products[0].sku.toLowerCase() === term) {
          const foundProduct = products[0];
          const productId = foundProduct.productId || foundProduct.id;

          // Check if this product is already in collected products
          const alreadyCollected = collectedProducts.find(p => p.productId === productId);
          if (alreadyCollected) {
            // Already exists, just add 1
            const currentRows = collectedQuantities[productId] || [];
            const updatedRows = [...currentRows];
            if (updatedRows.length > 0) {
              updatedRows[0] = { ...updatedRows[0], quantity: (parseInt(updatedRows[0].quantity) || 0) + 1 };
            } else {
              updatedRows.push({ quantity: 1, locationId: null });
            }

            setCollectedQuantities(prev => ({
              ...prev,
              [productId]: updatedRows,
            }));

            setScanInput("");
            setToast({
              message: `+1 added to ${foundProduct.name}`,
              type: "success",
            });
            return;
          }

          // Add new product to collection (not in original shipment)
          const newProduct = {
            productId: productId,
            productSKU: foundProduct.sku,
            productName: foundProduct.name,
            shipmentQuantity: 0, // Not in original shipment
            warehouseQuantity: foundProduct.totalQuantity || 0,
            isExtraProduct: true, // Flag to indicate this wasn't in the shipment
          };

          setCollectedProducts(prev => [...prev, newProduct]);

          // Initialize with 1 quantity in first row
          setCollectedQuantities(prev => ({
            ...prev,
            [productId]: [{ quantity: 1, locationId: null }],
          }));

          setScanInput("");
          setToast({
            message: `Added "${foundProduct.name}" to collection (not in shipment)`,
            type: "success",
          });
        } else {
          setToast({
            message: "Product not found in shipment or database",
            type: "error",
          });
        }
      } catch (err) {
        console.error("Failed to search for product", err);
        setToast({
          message: "Product not found in shipment",
          type: "error",
        });
      }
    }
  };

  // Handle quantity change for a specific location row
  const handleLocationQuantityChange = (productId, rowIndex, newQuantity) => {
    const product = collectedProducts.find(p => p.productId === productId);
    if (!product) return;

    const currentRows = collectedQuantities[productId] || [];
    const updatedRows = [...currentRows];

    // Update the quantity for this specific row - allow any positive number (overage is allowed)
    updatedRows[rowIndex] = { ...updatedRows[rowIndex], quantity: Math.max(0, parseInt(newQuantity) || 0) };

    setCollectedQuantities(prev => ({
      ...prev,
      [productId]: updatedRows,
    }));
  };

  // Handle location selection for a specific row
  const handleLocationChange = (productId, rowIndex, locationId) => {
    const currentRows = collectedQuantities[productId] || [];
    const updatedRows = [...currentRows];

    // Check if this location is already selected for this product (in another row)
    const isDuplicate = updatedRows.some((row, idx) => idx !== rowIndex && row.locationId === parseInt(locationId));

    if (isDuplicate && locationId) {
      setToast({
        message: "This location is already selected for this product",
        type: "error",
      });
      return;
    }

    updatedRows[rowIndex] = { ...updatedRows[rowIndex], locationId: locationId ? parseInt(locationId) : null };

    setCollectedQuantities(prev => ({
      ...prev,
      [productId]: updatedRows,
    }));
  };

  // Add a new location row for a product
  const handleAddLocationRow = (productId) => {
    const currentRows = collectedQuantities[productId] || [];

    // Add new row (overage is allowed, so no quantity restriction)
    const updatedRows = [...currentRows, { quantity: 0, locationId: null }];

    setCollectedQuantities(prev => ({
      ...prev,
      [productId]: updatedRows,
    }));
  };

  // Remove a location row (only if more than one row exists)
  const handleRemoveLocationRow = (productId, rowIndex) => {
    const currentRows = collectedQuantities[productId] || [];

    if (currentRows.length <= 1) {
      setToast({
        message: "Cannot remove the last location row",
        type: "error",
      });
      return;
    }

    const updatedRows = currentRows.filter((_, idx) => idx !== rowIndex);

    setCollectedQuantities(prev => ({
      ...prev,
      [productId]: updatedRows,
    }));
  };

  useEffect(() => {
    // Validate that all rows with quantity > 0 have locations assigned
    // Allow finishing collection even when all quantities are 0 (empty parcel scenario)
    let allProductsValid = true;

    for (const product of collectedProducts) {
      const rows = collectedQuantities[product.productId] || [];

      // Check each row for validation
      for (const row of rows) {
        const qty = parseInt(row.quantity) || 0;

        // Only validate location if quantity > 0
        if (qty > 0 && !row.locationId) {
          allProductsValid = false;
          break;
        }
      }

      if (!allProductsValid) break;
    }

    // Button is enabled if all quantities with qty > 0 have locations assigned
    // Empty parcels (all quantities = 0) are allowed
    setIsCollectionValid(allProductsValid);
  }, [collectedProducts, collectedQuantities]);

  // Finish collection
  const handleFinishCollection = async () => {
    // Only validate that all rows with quantity > 0 have locations assigned
    for (const product of collectedProducts) {
      const rows = collectedQuantities[product.productId] || [];

      // Validate all rows with quantity > 0 have locations
      for (const row of rows) {
        if ((parseInt(row.quantity) || 0) > 0 && !row.locationId) {
          setToast({
            message: `Please assign a location for all quantities of "${product.productName}"`,
            type: "error",
          });
          return;
        }
      }
    }

    setShowConfirmFinish(true);
  };

  // Confirm and execute collection
  const executeCollection = async () => {
    try {
      setLoading(true);

      // Build collection data for backend (new simplified API)
      const collectedProductsData = [];

      // Get first available location as fallback for missing products
      const fallbackLocationId = locations.length > 0 ? locations[0].id : null;

      if (!fallbackLocationId) {
        setToast({
          message: "No locations available. Please create at least one warehouse location first.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      for (const product of collectedProducts) {
        const rows = collectedQuantities[product.productId] || [];

        // Calculate total collected quantity for this product
        const totalCollected = rows.reduce((sum, row) => sum + (parseInt(row.quantity) || 0), 0);

        // Collect all location IDs where quantity > 0
        const locationIds = rows
          .filter(row => row.locationId && (parseInt(row.quantity) || 0) > 0)
          .map(row => row.locationId);

        // If no locations with quantity, but we want to record a 0-quantity collection
        if (locationIds.length === 0 && totalCollected === 0) {
          locationIds.push(fallbackLocationId);
        }

        // Only add product if it has at least one location
        if (locationIds.length > 0) {
          collectedProductsData.push({
            productId: product.productId,
            collectedQuantity: totalCollected,
            locationIds: locationIds
          });
        }
      }

      // Call the simplified complete-collection endpoint
      // This will:
      // 1. Update ShipmentProduct.CollectedQuantity (or create new record for extra products)
      // 2. Update ProductsInWarehouse inventory across multiple locations
      // 3. Change shipment status to Collected
      await api.post(`/Shipments/${selectedShipmentDetails.id}/complete-collection`, {
        collectedProducts: collectedProductsData
      });

      setToast({
        message: "Collection completed successfully!",
        type: "success",
      });

      setShowCollectModal(false);
      setShowConfirmFinish(false);

      // Refresh the shipment list
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
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

  // Render status cell with select dropdown for status changes (DeputyManager and above)
  const renderStatusCell = (row) => {
    const shipment = shipments.find(s => s.id === row.id);
    if (!shipment) return getStatusLabel(row.statusRaw);

    const currentStatus = shipment.status;

    // For users with DeputyManager role and above (level 4+), show select dropdown
    if (canChangeShipmentStatus) {
      // Get valid status options based on current status and shipment type (1 = Incoming)
      const validStatuses = getValidStatusOptions(currentStatus, 1, shipmentStatusesData);

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
          {validStatuses.map(s => (
            <option key={s.id} value={s.id}>
              {s.value}
            </option>
          ))}
        </select>
      );
    }

    // For lower roles: show badge only (read-only)
    return (
      <div className={`badge ${getStatusBadgeClass(currentStatus)}`}>
        {getStatusLabel(currentStatus)}
      </div>
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

  // Handle status checkbox toggle
  const handleStatusToggle = (statusId, checked) => {
    if (checked) {
      setSelectedStatuses(prev => [...prev, statusId]);
    } else {
      setSelectedStatuses(prev => prev.filter(id => id !== statusId));
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

    try {
      // Check if shipment is collected (status 5) - if so, fetch collection data
      if (selectedShipmentDetails.status === 5) {
        // Fetch collection data from new endpoint
        const collectionData = await api.get(`/Shipments/${selectedShipmentDetails.id}/collection`);

        // collectionData is array of GetShipmentProductCollectionGroupedDto
        // Transform to include variance info for color coding
        const productsWithCollection = collectionData.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productSKU: item.productSku,
          declaredQuantity: item.totalDeclaredQuantity,
          collectedQuantity: item.totalCollectedQuantity,
          variance: item.variance,
          varianceType: item.varianceType,
          locations: item.locations, // Array of { locationId, locationCode, quantity }
          isCollectionData: true, // Flag to differentiate from regular product data
        }));

        setViewProductsData(productsWithCollection);
        setExpandedProductLocations({});
        setShowViewProductsModal(true);
      } else {
        // For non-collected shipments, show regular product list with warehouse stock
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
                isCollectionData: false,
              };
            } catch (err) {
              console.error("Failed to fetch stock for product", sp.productSKU, err);
              return {
                ...sp,
                warehouseStock: 0,
                productId: sp.productId,
                isCollectionData: false,
              };
            }
          })
        );

        setViewProductsData(productsWithStock);
        setExpandedProductLocations({});
        setShowViewProductsModal(true);
      }
    } catch (err) {
      console.error("Failed to fetch product data", err);
      setToast({
        message: "Failed to load product information.",
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
          disableEdit={!selectedRow || selectedRow.statusRaw === 5}
          changePasswordButtonLabel="Collect"
          changePasswordButtonClass="btn-go-to"
          changePasswordDisabled={!selectedRow || selectedRow.statusRaw !== 4}
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
              <label>Filter by Status:</label>
              <div className="status-checkbox-group">
                {shipmentStatusesData
                  .filter(s => s.id !== 0) // Exclude Unspecified
                  .map(s => (
                    <label key={s.id} className="status-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(s.id)}
                        onChange={(e) => handleStatusToggle(s.id, e.target.checked)}
                      />
                      <span>{s.value}</span>
                    </label>
                  ))}
              </div>
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
      <AddModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        addForm={addForm}
        handleAddFormChange={handleAddFormChange}
        handleSaveShipment={handleSaveShipment}
        savingShipment={savingShipment}
        productSearch={productSearch}
        setProductSearch={setProductSearch}
        handleProductSearchKeyDown={handleProductSearchKeyDown}
        showProductDropdown={showProductDropdown}
        setShowProductDropdown={setShowProductDropdown}
        productSuggestions={productSuggestions}
        productDropdownRef={productDropdownRef}
        handleProductDropdownScroll={handleProductDropdownScroll}
        highlightedIndex={highlightedIndex}
        setHighlightedIndex={setHighlightedIndex}
        handleAddProduct={handleAddProduct}
        loadingProducts={loadingProducts}
        selectedProducts={selectedProducts}
        handleProductQuantityChange={handleProductQuantityChange}
        handleRemoveProduct={handleRemoveProduct}
      />

      {/* Edit Shipment Modal */}
      <EditModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        editForm={editForm}
        handleEditFormChange={handleEditFormChange}
        handleSaveEdit={handleSaveEdit}
        savingEdit={savingEdit}
        shipmentStatusesData={shipmentStatusesData}
        editProductSearch={editProductSearch}
        setEditProductSearch={setEditProductSearch}
        handleEditProductSearchKeyDown={handleEditProductSearchKeyDown}
        showEditProductDropdown={showEditProductDropdown}
        setShowEditProductDropdown={setShowEditProductDropdown}
        editProductSuggestions={editProductSuggestions}
        editProductDropdownRef={editProductDropdownRef}
        handleEditProductDropdownScroll={handleEditProductDropdownScroll}
        editHighlightedIndex={editHighlightedIndex}
        setEditHighlightedIndex={setEditHighlightedIndex}
        handleEditAddProduct={handleEditAddProduct}
        loadingEditProducts={loadingEditProducts}
        editSelectedProducts={editSelectedProducts}
        handleEditProductQuantityChange={handleEditProductQuantityChange}
        handleEditRemoveProduct={handleEditRemoveProduct}
      />

      {/* Collection Modal */}
      <CollectModal
        show={showCollectModal}
        onClose={() => setShowCollectModal(false)}
        selectedShipmentDetails={selectedShipmentDetails}
        scanInput={scanInput}
        setScanInput={setScanInput}
        handleScanApply={handleScanApply}
        collectedProducts={collectedProducts}
        collectedQuantities={collectedQuantities}
        handleLocationQuantityChange={handleLocationQuantityChange}
        handleAddLocationRow={handleAddLocationRow}
        handleLocationChange={handleLocationChange}
        locations={locations}
        handleRemoveLocationRow={handleRemoveLocationRow}
        handleFinishCollection={handleFinishCollection}
        isCollectionValid={isCollectionValid}
      />

      {/* View Products Modal */}
      <ViewProductsModal
        show={showViewProductsModal}
        onClose={() => setShowViewProductsModal(false)}
        viewProductsData={viewProductsData}
        expandedProductLocations={expandedProductLocations}
        setExpandedProductLocations={setExpandedProductLocations}
        handleToggleProductLocations={handleToggleProductLocations}
      />


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
