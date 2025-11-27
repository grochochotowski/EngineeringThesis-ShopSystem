import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { api } from "../../api/apiClient";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Modal from "../../components/Modal";
import MessageBox from "../../components/MessageBox";
import "../../styles/PagesStyles/baseListPage.css";

export default function StorageProducts() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isDelayedRefresh, setIsDelayedRefresh] = useState(false);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [sortColumn, setSortColumn] = useState("productName");
    const [sortDirection, setSortDirection] = useState("asc");
    const [toast, setToast] = useState(null);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
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

    // Remove Product modal state
    const [removeForm, setRemoveForm] = useState({
        locationId: "",
        quantity: 1,
    });

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
        stockStatus: "",
    });

    // Main search input
    const [searchQuery, setSearchQuery] = useState("");

    const observerRef = useRef(null);
    const filtersRef = useRef(null);

    // Fetch products from API (aggregated by product)
    const fetchProducts = async (
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

            // Handle stock status filter
            if (currentFilters.stockStatus === "inStock") {
                params.minQuantity = 1;
            } else if (currentFilters.stockStatus === "lowStock") {
                params.minQuantity = 1;
                params.maxQuantity = 10;
            } else if (currentFilters.stockStatus === "outOfStock") {
                params.maxQuantity = 0;
            } else {
                if (currentFilters.minQuantity) params.minQuantity = currentFilters.minQuantity;
                if (currentFilters.maxQuantity) params.maxQuantity = currentFilters.maxQuantity;
            }

            if (currentSortColumn) params.orderBy = currentSortColumn;
            if (currentSortDirection) params.sortDirection = currentSortDirection;

            const { items, totalPages } = await api.get("/products-in-warehouse/search-products-with-locations", {
                params,
                cancelToken: source.token,
            });

            if (items?.length) {
                setProducts(items);
                setHasMore(page < (totalPages || 1));
            } else {
                setProducts([]);
                setHasMore(false);
            }
        } catch (err) {
            if (axios.isCancel(err)) return;
            console.error(err);
            setToast({ message: "Failed to load warehouse products.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

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

    const debouncedFetchProducts = useCallback(() => {
        if (!initialDataLoaded) return;
        const delay = setTimeout(() => {
            setProducts([]);
            setPageNumber(1);
            fetchProducts(1, filters, searchQuery, sortColumn, sortDirection);
            setIsDelayedRefresh(false);
        }, 1000);

        return () => clearTimeout(delay);
    }, [filters, searchQuery, initialDataLoaded, sortColumn, sortDirection]);

    const immediateFetchProducts = useCallback(() => {
        if (!initialDataLoaded) return;
        setProducts([]);
        setPageNumber(1);
        fetchProducts(1, filters, searchQuery, sortColumn, sortDirection);
    }, [sortColumn, sortDirection, filters, searchQuery, initialDataLoaded]);

    // Trigger fetch for filters/search
    useEffect(() => {
        if (isDelayedRefresh) {
            debouncedFetchProducts();
        } else {
            immediateFetchProducts();
        }
    }, [debouncedFetchProducts, immediateFetchProducts, isDelayedRefresh]);

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
            fetchProducts(pageNumber, filters, searchQuery, sortColumn, sortDirection);
        }
    }, [pageNumber]);

    // Columns for table
    const columns = [
        { key: "productName", label: "Product Name", width: "30%", sortable: true },
        { key: "productPrice", label: "Price", width: "13%", sortable: true },
        { key: "quantity", label: "Total Quantity", width: "15%", sortable: true },
        { key: "locationCount", label: "Locations No.", width: "12%", sortable: true },
        { key: "categoryName", label: "Category", width: "30%", sortable: true },
    ];

    const rows = products.map((product) => ({
        id: product.productId,
        productId: product.productId,
        productName: product.productName,
        productPrice: `$${product.productPrice.toFixed(2)}`,
        quantity: product.totalQuantity,
        locationCount: product.locations?.length || 0,
        categoryName: product.categoryName,
        rawData: product,
    }));

    const user = JSON.parse(localStorage.getItem("user"));

    // Updating search query
    const handleSearchChange = (value) => {
        setIsDelayedRefresh(true);
        setSearchQuery(value);
        setSelectedProduct(null);
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
            setSelectedProduct(null);
            return;
        }
        setSelectedProduct(row);
    };

    // Open details modal
    const handleViewDetails = () => {
        if (selectedProduct) {
            setShowDetailsModal(true);
        }
    };

    // Handle double-click on row to open modal
    const handleRowDoubleClick = (row) => {
        setSelectedProduct(row);
        setShowDetailsModal(true);
    };

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

    // Add Product handlers
    const handleOpenAddModal = () => {
        setAddForm({ productId: "", locationId: "", quantity: 1 });
        setProductSearchTerm("");
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

    const handleProductSelect = (productId) => {
        setAddForm((prev) => ({ ...prev, productId }));
        const selectedProduct = activeProducts.find(p => p.productId === productId);
        if (selectedProduct) {
            setProductSearchTerm(`${selectedProduct.sku} - ${selectedProduct.name}`);
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
            immediateFetchProducts();
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
        if (!selectedProduct) return;
        setRemoveForm({ locationId: "", quantity: 1 });
        setShowRemoveModal(true);
    };

    const handleRemoveFormChange = (e) => {
        const { name, value } = e.target;
        setRemoveForm((prev) => ({ ...prev, [name]: value }));
    };

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
            immediateFetchProducts();
            setSelectedProduct(null);
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

    // Get locations where selected product exists
    const getProductLocations = () => {
        if (!selectedProduct?.rawData?.locations) return [];
        return selectedProduct.rawData.locations;
    };

    const getMaxQuantityForLocation = (locationId) => {
        const loc = getProductLocations().find((l) => l.locationId === locationId);
        return loc ? loc.quantity : 0;
    };

    // Navigate to Products page with SKU search
    const handleGoToProduct = () => {
        if (!selectedProduct?.rawData?.productSKU) return;
        navigate(`/organization/products?search=${encodeURIComponent(selectedProduct.rawData.productSKU)}`);
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

                            {/* Actions */}
                            <div className="action-buttons">
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

                                <button onClick={handleOpenAddModal} className="btn-action btn-add">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 5v14M5 12h14"/>
                                    </svg>
                                    Add Product
                                </button>

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

                                <div className="button-group-spacer"></div>

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

                        <select name="stockStatus" value={filters.stockStatus} onChange={handleInputChange}>
                            <option value="">All Stock Levels</option>
                            <option value="inStock">In Stock</option>
                            <option value="lowStock">Low Stock (1-10)</option>
                            <option value="outOfStock">Out of Stock</option>
                        </select>

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

                <div ref={observerRef} style={{ height: "1px" }} />
                {loading && <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>}
            </main>

            {/* Details Modal */}
            {showDetailsModal && selectedProduct && (
                <Modal
                    title="Product Location Details"
                    onClose={() => {
                        setShowDetailsModal(false);
                    }}
                    wide
                >
                    <div className="product-details-modal">
                        <h3>Product Information</h3>
                        <ul>
                            <li>
                                <strong>Name:</strong> {selectedProduct.rawData.productName}
                            </li>
                            <li>
                                <strong>SKU:</strong> {selectedProduct.rawData.productSKU}
                            </li>
                            <li>
                                <strong>Price:</strong> ${selectedProduct.rawData.productPrice.toFixed(2)}
                            </li>
                            <li>
                                <strong>Category:</strong> {selectedProduct.rawData.categoryName}
                            </li>
                            <li>
                                <strong>Total Quantity:</strong> {selectedProduct.rawData.totalQuantity}
                            </li>
                            <li>
                                <strong>Locations:</strong> Located in {selectedProduct.rawData.locations?.length || 0} warehouse location{selectedProduct.rawData.locations?.length !== 1 ? "s" : ""}
                            </li>
                            <li>
                                <strong>Description:</strong> {selectedProduct.rawData.productDescription || "—"}
                            </li>
                        </ul>

                        <h3>Warehouse Locations</h3>
                        {selectedProduct.rawData.locations && selectedProduct.rawData.locations.length > 0 ? (
                            <table className="locations-table">
                                <thead>
                                    <tr>
                                        <th>Location Code</th>
                                        <th>Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProduct.rawData.locations.map((loc, idx) => (
                                        <tr key={idx}>
                                            <td>{loc.locationCode}</td>
                                            <td>{loc.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No locations found for this product.</p>
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
                                            .map((l) => (
                                                <option key={l.id} value={l.id}>
                                                    {l.locationCode}
                                                </option>
                                            ))}
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
            {showRemoveModal && selectedProduct && (
                <Modal title="Remove Product from Warehouse" onClose={() => setShowRemoveModal(false)}>
                    <form onSubmit={handleSubmitRemove} onKeyPress={handleRemoveModalKeyPress}>
                        <div className="form-grid">
                            <label>
                                Location
                                <select
                                    name="locationId"
                                    value={removeForm.locationId}
                                    onChange={handleRemoveFormChange}
                                    required
                                    className="location-select"
                                >
                                    <option value="">Select a location</option>
                                    {getProductLocations().map((loc) => (
                                        <option key={loc.locationId} value={loc.locationId}>
                                            {loc.locationCode} (Qty: {loc.quantity})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Quantity to Remove
                                <input
                                    type="number"
                                    name="quantity"
                                    value={removeForm.quantity}
                                    onChange={handleRemoveFormChange}
                                    min="1"
                                    max={removeForm.locationId ? getMaxQuantityForLocation(parseInt(removeForm.locationId)) : 1}
                                    required
                                />
                                {removeForm.locationId && (
                                    <small style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                        Max: {getMaxQuantityForLocation(parseInt(removeForm.locationId))}
                                    </small>
                                )}
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
