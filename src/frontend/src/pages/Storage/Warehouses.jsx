import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { api } from "../../api/apiClient";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Modal from "../../components/Modal";
import MessageBox from "../../components/MessageBox";
import "../../styles/PagesStyles/baseListPage.css";

export default function Warehouses() {
    const navigate = useNavigate();
    const [warehouseItems, setWarehouseItems] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isDelayedRefresh, setIsDelayedRefresh] = useState(false);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [sortColumn, setSortColumn] = useState("");
    const [sortDirection, setSortDirection] = useState("asc");
    const [toast, setToast] = useState(null);

    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedItemIdToRestore, setSelectedItemIdToRestore] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [productAllLocations, setProductAllLocations] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showQuickLocationModal, setShowQuickLocationModal] = useState(false);

    const [categories, setCategories] = useState(new Map());
    const [activeProducts, setActiveProducts] = useState([]);
    const [allLocations, setAllLocations] = useState([]);

    // Add Product modal state
    const [addForm, setAddForm] = useState({
        productId: "",
        locationId: "",
        quantity: 1,
    });
    const [productSearchTerm, setProductSearchTerm] = useState("");
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [selectedProductLocations, setSelectedProductLocations] = useState([]);

    // Remove Product modal state
    const [removeForm, setRemoveForm] = useState({
        quantity: 1,
    });

    // Transfer Product modal state
    const [transferForm, setTransferForm] = useState({
        toLocationId: "",
        quantity: 1,
    });
    const [transferProductLocations, setTransferProductLocations] = useState([]);

    // Quick location creation state
    const [quickLocationForm, setQuickLocationForm] = useState({
        zone: "",
        col: "",
        shelf: "",
    });

    // Filters
    const [filters, setFilters] = useState({
        minPrice: "",
        maxPrice: "",
        categoryId: "",
        minQuantity: "",
        maxQuantity: "",
        locationId: "",
    });

    // Main search input
    const [searchQuery, setSearchQuery] = useState("");

    const observerRef = useRef(null);
    const filtersRef = useRef(null);

    // Fetch warehouse items from API (product-location combinations)
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

            // Build query params
            const params = {
                PageNumber: page,
                PageSize: 50,
            };

            if (currentSearchQuery) params.searchTerm = currentSearchQuery;
            if (currentFilters.categoryId) params.categoryId = currentFilters.categoryId;
            if (currentFilters.minPrice) params.minPrice = currentFilters.minPrice;
            if (currentFilters.maxPrice) params.maxPrice = currentFilters.maxPrice;
            if (currentFilters.minQuantity) params.minQuantity = currentFilters.minQuantity;
            if (currentFilters.maxQuantity) params.maxQuantity = currentFilters.maxQuantity;
            if (currentFilters.locationId) params.locationId = currentFilters.locationId;

            // Backend sorting (single column only)
            if (currentSortColumn) {
                params.orderBy = currentSortColumn;
                if (currentSortDirection) params.sortDirection = currentSortDirection;
            }

            const { items, totalPages } = await api.get("/products-in-warehouse/search-product-rows", {
                params,
                cancelToken: source.token,
            });

            if (items?.length) {
                let processedItems = items;

                // Apply client-side multi-level sorting when no sort is selected
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

                if (page === 1) {
                    setWarehouseItems(processedItems);
                } else {
                    setWarehouseItems((prev) => [...prev, ...processedItems]);
                }
                setHasMore(page < (totalPages || 1));

                // Restore selected item after fetch if needed
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
            if (axios.isCancel(err)) return;
            console.error(err);
            setToast({ message: "Failed to load warehouse items.", type: "error" });
        } finally {
            setLoading(false);
        }
    }, [selectedItemIdToRestore]);

    // Helper function to create row object from item
    const createRowFromItem = (item) => ({
        id: `${item.productId}-${item.locationId}`,
        productId: item.productId,
        locationId: item.locationId,
        productName: item.productName,
        locationCode: item.locationCode,
        productPrice: `$${item.productPrice.toFixed(2)}`,
        quantity: item.quantity,
        categoryName: item.categoryName,
        rawData: item,
    });

    // Fetch initial data (categories, active products, locations)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [categoriesRes, activeProductsRes, locationsRes] = await Promise.all([
                    api.get("/Categories"),
                    api.get("/products/active"),
                    api.get("/location", { params: { PageNumber: 1, PageSize: 1000 } }),
                ]);

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

    const immediateFetchWarehouseItems = useCallback(() => {
        if (!initialDataLoaded) return;
        setWarehouseItems([]);
        setPageNumber(1);
        fetchWarehouseItems(1, filters, searchQuery, sortColumn, sortDirection);
    }, [sortColumn, sortDirection, filters, searchQuery, initialDataLoaded, fetchWarehouseItems]);

    // Trigger fetch for filters/search
    useEffect(() => {
        if (isDelayedRefresh) {
            debouncedFetchWarehouseItems();
        } else {
            immediateFetchWarehouseItems();
        }
    }, [debouncedFetchWarehouseItems, immediateFetchWarehouseItems, isDelayedRefresh]);

    // Infinite scroll observer
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
            fetchWarehouseItems(pageNumber, filters, searchQuery, sortColumn, sortDirection);
        }
    }, [pageNumber, fetchWarehouseItems, filters, searchQuery, sortColumn, sortDirection]);

    // Columns for table
    const columns = [
        { key: "productName", label: "Product Name", width: "25%", sortable: true, sortKey: "productName" },
        { key: "locationCode", label: "Location Code", width: "20%", sortable: true, sortKey: "locationCode" },
        { key: "quantity", label: "Quantity", width: "15%", sortable: true, sortKey: "quantity" },
        { key: "categoryName", label: "Category", width: "25%", sortable: true, sortKey: "categoryName" },
        { key: "productPrice", label: "Price", width: "15%", sortable: true, sortKey: "productPrice" },
    ];

    const rows = warehouseItems.map((item) => createRowFromItem(item));

    const user = JSON.parse(localStorage.getItem("user"));

    // Updating search query
    const handleSearchChange = (value) => {
        setIsDelayedRefresh(true);
        setSearchQuery(value);
        setSelectedItem(null);
    };

    // Auto-updating filters
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "minPrice" || name === "maxPrice" || name === "minQuantity" || name === "maxQuantity") {
            setIsDelayedRefresh(true);
        } else {
            setIsDelayedRefresh(false);
        }
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    // Close filters when clicking outside
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

    // Handle row selection
    const handleRowSelect = (row) => {
        if (!row) {
            setSelectedItem(null);
            return;
        }
        setSelectedItem(row);
    };

    // Open details modal
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

    // Handle double-click on row to open modal
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

    // Add Product handlers
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

    const handleAddFormChange = (e) => {
        const { name, value } = e.target;
        setAddForm((prev) => ({ ...prev, [name]: value }));
    };

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

    const handleProductInputFocus = () => {
        if (activeProducts.length > 0) {
            setFilteredProducts(activeProducts);
            setShowProductDropdown(true);
        }
    };

    const handleProductInputBlur = () => {
        setTimeout(() => setShowProductDropdown(false), 200);
    };

    const handleProductDropdownKeyDown = (e) => {
        if (e.key === "Escape") {
            setShowProductDropdown(false);
        }
    };

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

    const handleAddModalKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmitAdd();
        }
    };

    // Remove Product handlers
    const handleOpenRemoveModal = () => {
        if (!selectedItem) return;
        setRemoveForm({ quantity: 1 });
        setShowRemoveModal(true);
    };

    const handleRemoveFormChange = (e) => {
        const { name, value } = e.target;
        setRemoveForm((prev) => ({ ...prev, [name]: value }));
    };

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

    const handleRemoveModalKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmitRemove();
        }
    };

    // Transfer Product handlers
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

    const handleTransferFormChange = (e) => {
        const { name, value } = e.target;
        setTransferForm((prev) => ({ ...prev, [name]: value }));
    };

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

            // Store item ID to reselect after fetch completes
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

    const handleTransferModalKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmitTransfer();
        }
    };

    // Quick location creation handlers
    const handleOpenQuickLocation = () => {
        setQuickLocationForm({ zone: "", col: "", shelf: "" });
        setShowQuickLocationModal(true);
    };

    const handleQuickLocationChange = (e) => {
        const { name, value } = e.target;
        setQuickLocationForm((prev) => ({ ...prev, [name]: value.toUpperCase().slice(0, 4) }));
    };

    const handleSubmitQuickLocation = async (e) => {
        e.preventDefault();
        try {
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

    // Navigate to Products page with SKU search
    const handleGoToProduct = () => {
        if (!selectedItem?.rawData?.productSKU) return;
        navigate(`/organization/products?search=${encodeURIComponent(selectedItem.rawData.productSKU)}`);
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
                <div className="base-list-wrapper">
                    <div className="base-list-container">
                        {/* === LEFT SIDEBAR === */}
                        <aside className="sidebar">
                            {/* Search */}
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

                            {/* Actions */}
                            <div className="action-buttons">
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

                                <button onClick={handleOpenAddModal} className="btn-action btn-add">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 5v14M5 12h14"/>
                                    </svg>
                                    Add Product
                                </button>

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

                    {loading && (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                        </div>
                    )}
                </div>

                {showFilters && (
                    <div className="filters-panel" ref={filtersRef}>
                        <h4>Filters</h4>

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

                        <select name="categoryId" value={filters.categoryId} onChange={handleInputChange}>
                            <option value="">All Categories</option>
                            {Array.from(categories.entries()).map(([id, name]) => (
                                <option key={id} value={id}>
                                    {name}
                                </option>
                            ))}
                        </select>

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

                <div ref={observerRef} style={{ height: "1px" }} />
                {loading && <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>}
            </main>

            {/* Details Modal */}
            {showDetailsModal && selectedItem && (
                <Modal
                    title="Warehouse Item Details"
                    onClose={() => {
                        setShowDetailsModal(false);
                        setProductAllLocations([]);
                    }}
                    wide
                >
                    <div className="product-details-modal">
                        <h3>Product Information</h3>
                        <ul>
                            <li>
                                <strong>Name:</strong> {selectedItem.rawData.productName}
                            </li>
                            <li>
                                <strong>SKU:</strong> {selectedItem.rawData.productSKU}
                            </li>
                            <li>
                                <strong>Price:</strong> ${selectedItem.rawData.productPrice.toFixed(2)}
                            </li>
                            <li>
                                <strong>Category:</strong> {selectedItem.rawData.categoryName}
                            </li>
                            <li>
                                <strong>Description:</strong> {selectedItem.rawData.productDescription || "—"}
                            </li>
                        </ul>

                        <h3>All Warehouse Locations</h3>
                        {productAllLocations.length > 0 ? (
                            <table className="data-table" style={{ marginTop: "1rem" }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: "60%" }}>Location Code</th>
                                        <th style={{ width: "40%", textAlign: "right" }}>Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productAllLocations.map((loc) => (
                                        <tr
                                            key={loc.locationId}
                                            className={loc.locationId === selectedItem.locationId ? "selected" : ""}
                                        >
                                            <td>
                                                {loc.locationCode}
                                                {loc.locationId === selectedItem.locationId && (
                                                    <span style={{ color: "var(--primary)", marginLeft: "0.5rem", fontWeight: "bold" }}>
                                                        (selected)
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: "right" }}>{loc.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                                No location data available
                            </p>
                        )}
                    </div>
                </Modal>
            )}

            {/* Add Product Modal */}
            {showAddModal && (
                <Modal title="Add Product to Warehouse" onClose={() => setShowAddModal(false)}>
                    <form onSubmit={handleSubmitAdd} onKeyPress={handleAddModalKeyPress}>
                        <div className="form-grid">
                            <label>
                                Product
                                <div className="product-dropdown-wrapper">
                                    <input
                                        type="text"
                                        placeholder="Search by SKU or name..."
                                        value={productSearchTerm}
                                        onChange={(e) => handleProductSearchChange(e.target.value)}
                                        onFocus={handleProductInputFocus}
                                        onBlur={handleProductInputBlur}
                                        onKeyDown={handleProductDropdownKeyDown}
                                        required={!addForm.productId}
                                        autoComplete="off"
                                    />
                                    <span className={`dropdown-arrow ${showProductDropdown ? "open" : ""}`}>▼</span>
                                    {showProductDropdown && filteredProducts.length > 0 && (
                                        <div className="product-dropdown">
                                            {filteredProducts.map((p) => (
                                                <div
                                                    key={p.productId}
                                                    className="product-dropdown-item"
                                                    onClick={() => handleProductSelect(p.productId)}
                                                >
                                                    {p.sku} - {p.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </label>

                            <label>
                                Location
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <select
                                        name="locationId"
                                        value={addForm.locationId}
                                        onChange={handleAddFormChange}
                                        required
                                        style={{ flex: 1 }}
                                        className="location-select"
                                    >
                                        <option value="">Select a location</option>
                                        {allLocations
                                            .filter((l) => l.isActive)
                                            .map((l) => {
                                                const existingLocation = selectedProductLocations.find(pl => pl.locationId === l.id);
                                                return (
                                                    <option key={l.id} value={l.id}>
                                                        {l.locationCode}{existingLocation ? ` (Qty: ${existingLocation.quantity})` : ""}
                                                    </option>
                                                );
                                            })}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleOpenQuickLocation}
                                        className="btn-action"
                                        style={{ padding: "0.5rem", minWidth: "40px" }}
                                    >
                                        +
                                    </button>
                                </div>
                            </label>

                            <label>
                                Quantity
                                <input
                                    type="number"
                                    name="quantity"
                                    value={addForm.quantity}
                                    onChange={handleAddFormChange}
                                    min="1"
                                    required
                                />
                            </label>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn-action" onClick={() => setShowAddModal(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-action btn-primary">
                                Save
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Remove Product Modal */}
            {showRemoveModal && selectedItem && (
                <Modal title="Remove Product from Warehouse" onClose={() => setShowRemoveModal(false)}>
                    <form onSubmit={handleSubmitRemove} onKeyPress={handleRemoveModalKeyPress}>
                        <div className="form-grid">
                            <label>
                                Product
                                <input
                                    type="text"
                                    value={`${selectedItem.rawData.productSKU} - ${selectedItem.rawData.productName}`}
                                    disabled
                                    style={{ background: "var(--bg-disabled)", cursor: "not-allowed" }}
                                />
                            </label>

                            <label>
                                Location
                                <input
                                    type="text"
                                    value={selectedItem.rawData.locationCode}
                                    disabled
                                    style={{ background: "var(--bg-disabled)", cursor: "not-allowed" }}
                                />
                            </label>

                            <label>
                                Quantity to Remove
                                <input
                                    type="number"
                                    name="quantity"
                                    value={removeForm.quantity}
                                    onChange={handleRemoveFormChange}
                                    min="1"
                                    max={selectedItem.quantity}
                                    required
                                />
                                <small style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                    Max: {selectedItem.quantity}
                                </small>
                            </label>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn-action" onClick={() => setShowRemoveModal(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-action btn-danger">
                                Remove
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Transfer Product Modal */}
            {showTransferModal && selectedItem && (
                <Modal
                    title={`${selectedItem.rawData.productSKU} - ${selectedItem.rawData.productName}`}
                    onClose={() => {
                        setShowTransferModal(false);
                        setTransferProductLocations([]);
                    }}
                >
                    <form onSubmit={handleSubmitTransfer} onKeyPress={handleTransferModalKeyPress}>
                        <div className="form-grid">
                            <label>
                                Move From
                                <input
                                    type="text"
                                    value={`${selectedItem.rawData.locationCode} (Qty: ${selectedItem.quantity})`}
                                    disabled
                                    style={{ background: "var(--bg-disabled)", cursor: "not-allowed" }}
                                />
                            </label>

                            <label>
                                Move To
                                <select
                                    name="toLocationId"
                                    value={transferForm.toLocationId}
                                    onChange={handleTransferFormChange}
                                    required
                                    className="location-select"
                                >
                                    <option value="">Select a location</option>
                                    {allLocations
                                        .filter((l) => l.isActive && l.id !== selectedItem.locationId)
                                        .map((l) => {
                                            const existingLocation = transferProductLocations.find(pl => pl.locationId === l.id);
                                            return (
                                                <option key={l.id} value={l.id}>
                                                    {l.locationCode}{existingLocation ? ` (Qty: ${existingLocation.quantity})` : ""}
                                                </option>
                                            );
                                        })}
                                </select>
                            </label>

                            <label>
                                Quantity to Move
                                <input
                                    type="number"
                                    name="quantity"
                                    value={transferForm.quantity}
                                    onChange={handleTransferFormChange}
                                    min="1"
                                    max={selectedItem.quantity}
                                    required
                                />
                                <small style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                    Max: {selectedItem.quantity}
                                </small>
                            </label>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn-action" onClick={() => {
                                setShowTransferModal(false);
                                setTransferProductLocations([]);
                            }}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-action btn-primary">
                                Move
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Quick Location Creation Modal */}
            {showQuickLocationModal && (
                <Modal title="Create New Location" onClose={() => setShowQuickLocationModal(false)}>
                    <form onSubmit={handleSubmitQuickLocation}>
                        <div className="form-grid">
                            <label>
                                Zone (4 characters)
                                <input
                                    type="text"
                                    name="zone"
                                    value={quickLocationForm.zone}
                                    onChange={handleQuickLocationChange}
                                    maxLength="4"
                                    placeholder="e.g., A001"
                                    required
                                />
                            </label>

                            <label>
                                Column (4 characters)
                                <input
                                    type="text"
                                    name="col"
                                    value={quickLocationForm.col}
                                    onChange={handleQuickLocationChange}
                                    maxLength="4"
                                    placeholder="e.g., B002"
                                    required
                                />
                            </label>

                            <label>
                                Shelf (4 characters)
                                <input
                                    type="text"
                                    name="shelf"
                                    value={quickLocationForm.shelf}
                                    onChange={handleQuickLocationChange}
                                    maxLength="4"
                                    placeholder="e.g., C003"
                                    required
                                />
                            </label>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-action"
                                onClick={() => setShowQuickLocationModal(false)}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn-action btn-primary">
                                Create Location
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

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
