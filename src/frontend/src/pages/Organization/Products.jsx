import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { api } from "../../api/apiClient";
import { useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import ProductForm from "../../components/Forms/ProductForm";
import MessageBox from "../../components/MessageBox";

export default function Products() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [showModal, setShowModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedProductDetails, setSelectedProductDetails] = useState(null);
    const [selectedRow, setSelectedRow] = useState(null);
    const [toast, setToast] = useState(null);
    const [actionableProduct, setActionableProduct] = useState(null);

    const [categories, setCategories] = useState(new Map());
    const [taxRates, setTaxRates] = useState(new Map());


    const [products, setProducts] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [isDelayedRefresh, setIsDelayedRefresh] = useState(false);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [sortColumn, setSortColumn] = useState("name");
    const [sortDirection, setSortDirection] = useState("asc");

    // Filters
    const [filters, setFilters] = useState({
        minPrice: "",
        maxPrice: "",
        categoryId: "",
        defective: "",
        isActive: "",
    });

    // Main search input
    const [searchQuery, setSearchQuery] = useState(""); 

    const observerRef = useRef(null);
    const loadedPages = useRef(new Set());
    const filtersRef = useRef(null);

    // Helper function to fetch products from API
    const fetchProductsData = async (
        page,
        currentFilters,
        currentSearchQuery,
        currentSortColumn,
        currentSortDirection
    ) => {
        try {
            setLoading(true);
            const source = axios.CancelToken.source(); // Use CancelToken for cancellation
            const { items, totalPages } = await api.get("/Products", {
                params: {
                    PageNumber: page,
                    PageSize: 50,
                    ...(currentSearchQuery && { q: currentSearchQuery }),
                    ...(currentFilters.minPrice && { minPrice: currentFilters.minPrice }),
                    ...(currentFilters.maxPrice && { maxPrice: currentFilters.maxPrice }),
                    ...(currentFilters.categoryId && { categoryId: currentFilters.categoryId }),
                    ...(currentFilters.defective !== "" && { defective: currentFilters.defective }),
                    ...(currentFilters.isActive !== "" && { isActive: currentFilters.isActive }),
                    ...(currentSortColumn && { orderBy: currentSortColumn }),
                    ...(currentSortDirection && { sortDirection: currentSortDirection }),
                },
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
            if (axios.isCancel(err)) {
                // Ignore if request was cancelled
                return;
            }
            console.error(err);
            setError("Failed to load products.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [categoriesRes, taxRatesRes] = await Promise.all([
                    api.get("/Categories"),
                    api.get("/TaxRate"),
                ]);

                const categoriesMap = new Map(categoriesRes.items.map(c => [c.id, c.name]));
                const taxRatesMap = new Map(taxRatesRes.map(t => [t.id, t.rate]));

                setCategories(categoriesMap);
                setTaxRates(taxRatesMap);
                setInitialDataLoaded(true);
            } catch (err) {
                console.error("Failed to fetch initial data", err);
                setError("Failed to load initial page data.");
            }
        };

        fetchInitialData();
    }, []);

    // Handle auto-search from query parameters
    useEffect(() => {
        const searchParam = searchParams.get("search");
        if (searchParam && initialDataLoaded) {
            setSearchQuery(searchParam);
            setIsDelayedRefresh(false);
            // Clear the search param after using it
            setSearchParams({});
        }
    }, [searchParams, initialDataLoaded, setSearchParams]);

    const debouncedFetchProducts = useCallback(() => {
        if (!initialDataLoaded) return;
        const delay = setTimeout(() => {
            setProducts([]);
            loadedPages.current.clear();
            setPageNumber(1);
            fetchProductsData(1, filters, searchQuery, sortColumn, sortDirection);
            setIsDelayedRefresh(false);
        }, 1000);

        return () => clearTimeout(delay);
    }, [filters, searchQuery, initialDataLoaded, sortColumn, sortDirection]);

    const immediateFetchProducts = useCallback(() => {
        if (!initialDataLoaded) return;
        setProducts([]);
        loadedPages.current.clear();
        setPageNumber(1);
        fetchProductsData(1, filters, searchQuery, sortColumn, sortDirection);
    }, [sortColumn, sortDirection, filters, searchQuery, initialDataLoaded]);

    // Trigger debounced fetch for filters/search
    useEffect(() => {
        if(isDelayedRefresh) {
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
            fetchProductsData(pageNumber, filters, searchQuery, sortColumn, sortDirection);
        }
    }, [pageNumber, filters, searchQuery, sortColumn, sortDirection]);

    // Columns for table
    const columns = [
        { key: "sku", label: "SKU", width: "15%", sortable: true },
        { key: "ean", label: "EAN", width: "15%", sortable: false },
        { key: "name", label: "Name", width: "25%", sortable: true },
        { key: "price", label: "Price", width: "15%", sortable: true },
        { key: "defective", label: "Defective", width: "15%", sortable: true },
        { key: "category", label: "Category", width: "10%", sortable: true },
        { key: "isactive", label: "Active", width: "10%", sortable: true },
    ];

    const rows = products.map((p) => ({
        id: p.id,
        sku: p.sku,
        ean: p.ean || "—",
        name: p.name,
        price: p.price.toFixed(2),
        defective: p.defective ? "Yes" : "No",
        category: categories.get(p.categoryId) || "—",
        isactive: p.isActive ? "Yes" : "No",
    }));

    const user = JSON.parse(localStorage.getItem("user"));

    // Updating search query
    const handleSearchChange = (value) => {
        setIsDelayedRefresh(true);
        setSearchQuery(value);
        setSelectedRow(null);
        setSelectedProductDetails(null);
    };

    // Auto-updating filters
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "minPrice" || name === "maxPrice") {
            setIsDelayedRefresh(true);
        } else {
            setIsDelayedRefresh(false);
        }
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleBooleanChange = (e) => {
        setIsDelayedRefresh(false);
        const { name, value } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value === "" ? "" : value === "true",
        }));
    };

    // === Close filters when clicking outside ===
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

    // === Handle row selection to load full product details ===
    const handleRowSelect = async (row) => {
        if (!row) {
            setSelectedRow(null);
            setSelectedProductDetails(null);
            return;
        }

        setSelectedRow(row);
        try {
            const full = await api.get(`/Products/${row.id}`);
            setSelectedProductDetails(full);
        } catch (err) {
            console.error(err);
            setToast({
                message: err.response?.data?.message || "Failed to load product details.",
                type: "error",
            });
        }
    };

    const productDetailsConfig = {
        status: {
            key: "isActive",
            activeLabel: "Active",
            inactiveLabel: "Inactive",
        },
        fields: [
            { label: "Id", key: "id" },
            { label: "SKU", key: "sku" },
            { label: "EAN", key: "ean" },
            { label: "Name", key: "name" },
            { label: "Price", key: "price" },
                        {
                            label: "Category",
                            key: "categoryId",
                            render: (data) => categories.get(data.categoryId) || "—",
                        },
                        {
                            label: "Tax Rate",
                            key: "taxRateId",
                            render: (data) => {
                                const rate = taxRates.get(data.taxRateId);
                                return rate !== undefined ? `${(rate * 100).toFixed(0)}%` : "—";
                            },
                        },
                        { label: "Defective", key: "defective", isColumn: true },
                        { label: "Description", key: "description", isColumn: true },
                    ],
                };
    const handleSort = (column) => {
        // Find the column definition to check if it's sortable
        const colDef = columns.find(c => c.key === column);
        if (!colDef || colDef.sortable === false) return; // Only sort sortable columns

        if (sortColumn === column) { // If clicking the currently sorted column
            if (sortDirection === "asc") {
                setSortDirection("desc"); // 1st click -> asc, 2nd click -> desc
            } else {
                // 3rd click -> remove sort
                setSortColumn(null);
                setSortDirection(null);
            }
        } else { // If clicking a new column
            setSortColumn(column);
            setSortDirection("asc"); // New column -> sort asc
        }
    };

    // === Render ===
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
                    title="Products"
                    columns={columns}
                    data={rows}
                    loading={loading}
                    error={error}
                    selectedRow={selectedRow}
                    onSelectRow={handleRowSelect}
                    detailsData={selectedProductDetails}
                    detailsConfig={initialDataLoaded ? productDetailsConfig : null}
                    onSort={handleSort}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onAdd={() => {
                        setSelectedRow(null);
                        setSelectedProductDetails(null);
                        setShowModal(true);
                    }}
                    onEdit={async (row) => {
                        if (selectedProductDetails && selectedProductDetails.id === row.id && selectedProductDetails.description) {
                            setShowModal(true);
                            return;
                        }

                        try {
                            const full = await api.get(`/Products/${row.id}`);
                            setSelectedProductDetails(full);
                            setShowModal(true);
                        } catch (err) {
                            console.error(err);
                            setToast({
                                message: err.response?.data?.message || "Failed to load full product details.",
                                type: "error",
                            });
                        }
                    }}
                    onDelete={(row) => {
                        setActionableProduct({ ...row, isActive: row.isactive === "Yes" });
                        setShowConfirm(true);
                    }}
                    onToggleFilters={() => setShowFilters((prev) => !prev)}
                    onSearchChange={handleSearchChange}
                    searchValue={searchQuery}
                    deleteButtonLabel={!selectedRow || selectedRow.isactive === "Yes" ? "Deactivate" : "Activate"}
                    deleteButtonIcon={
                        !selectedRow || selectedRow.isactive === "Yes" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                <path fill="none" stroke="currentColor" strokeWidth="2" d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                <path fill="none" stroke="currentColor" strokeWidth="2" d="M20 6L9 17l-5-5"/>
                            </svg>
                        )
                    }
                    deleteButtonClass={
                        !selectedRow || selectedRow.isactive === "Yes"
                            ? "btn-confirm-negative"
                            : "btn-confirm-positive"
                    }
                />

                {/* --- Sidebar filter panel (visible only when toggled) --- */}
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
                                                <select
                                                    name="categoryId"
                                                    value={filters.categoryId}
                                                    onChange={handleInputChange}
                                                >
                                                    <option value="">All Categories</option>
                                                    {Array.from(categories.entries()).map(([id, name]) => (
                                                        <option key={id} value={id}>
                                                            {name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    name="defective"
                                                    value={filters.defective}
                                                    onChange={handleBooleanChange}
                                                >                            <option value="">All products</option>
                            <option value="true">Only defective</option>
                            <option value="false">Only non-defective</option>
                        </select>
                        <select
                            name="isActive"
                            value={filters.isActive}
                            onChange={handleBooleanChange}
                        >
                            <option value="">All statuses</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                )}

                {/* Infinite scroll sentinel */}
                <div ref={observerRef} style={{ height: "1px" }} />
                {loading && (
                    <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>
                )}
            </main>
            {/* === MODAL: Add / Edit === */}
            {showModal && (
                <Modal
                    title={selectedProductDetails ? "Edit Product" : "Add Product"}
                    onClose={() => setShowModal(false)}
                    wide
                >
                    <p>
                        {selectedProductDetails
                            ? `Editing product: ${selectedProductDetails.name}`
                            : "Creating new product"}
                    </p>
                    <ProductForm
                        product={selectedProductDetails}
                        categories={categories}
                        taxRates={taxRates}
                        onSuccess={async (productId) => {
                            setShowModal(false);

                            if (productId) {
                                try {
                                    const full = await api.get(`/Products/${productId}`);
                                    setSelectedProductDetails(full);
                                    setSelectedRow({
                                        id: full.id,
                                        sku: full.sku,
                                        name: full.name,
                                        price: full.price.toFixed(2),
                                        defective: full.defective ? "Yes" : "No",
                                        category: categories.get(full.categoryId) || "—",
                                        isactive: full.isActive ? "Yes" : "No",
                                    });
                                } catch (err) {
                                    console.error("Failed to re-fetch updated product details:", err);
                                }
                            }
                            
                            // Refresh the main list in the background
                            loadedPages.current.clear();
                            setPageNumber(1);
                            immediateFetchProducts();

                            setToast({
                                message: productId
                                    ? "Product updated successfully!"
                                    : "Product created successfully!",
                                type: "success",
                            });
                        }}
                    />
                </Modal>
            )}

            {/* === CONFIRM DIALOG: Delete / Deactivate === */}
                        {showConfirm && (
                <ConfirmDialog
                    title={
                        actionableProduct?.isActive
                            ? "Deactivate Product"
                            : "Activate Product"
                    }
                    message={
                        actionableProduct?.isActive
                            ? `Are you sure you want to deactivate "${actionableProduct.name}"?`
                            : `Are you sure you want to activate "${actionableProduct.name}"?`
                    }
                    confirmText={actionableProduct?.isActive ? "Deactivate" : "Activate"}
                    confirmButtonClass={
                        actionableProduct?.isActive
                            ? "dialog-btn-confirm-negative"
                            : "dialog-btn-confirm-positive"
                    }
                    onConfirm={async () => {
                        if (!actionableProduct) return;
                        
                        try {
                            setLoading(true);
                            let newStatus;
                            if (actionableProduct.isActive) {
                                await api.delete(`/Products/${actionableProduct.id}`);
                                newStatus = false;
                                setToast({
                                    message: "Product deactivated successfully!",
                                    type: "success",
                                });
                            } else {
                                await api.post(`/Products/${actionableProduct.id}/restore`);
                                newStatus = true;
                                setToast({
                                    message: "Product activated successfully!",
                                    type: "success",
                                });
                            }

                            // Manually update the states for immediate feedback
                            const newIsActiveString = newStatus ? "Yes" : "No";
                            if (selectedRow && selectedRow.id === actionableProduct.id) {
                                setSelectedRow(prev => ({ ...prev, isactive: newIsActiveString }));
                            }
                            if (selectedProductDetails && selectedProductDetails.id === actionableProduct.id) {
                                setSelectedProductDetails(prev => ({ ...prev, isActive: newStatus }));
                            }

                            // Refresh the product list in the background
                            loadedPages.current.clear();
                            setPageNumber(1);
                            immediateFetchProducts();

                        } catch (err) {
                            console.error(err);
                            setToast({
                                message: err.response?.data?.message || "Failed to update the product.",
                                type: "error",
                            });
                        } finally {
                            setLoading(false);
                            setShowConfirm(false);
                            setActionableProduct(null);
                        }
                    }}
                    onCancel={() => setShowConfirm(false)}
                />
            )}            {toast && (
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
