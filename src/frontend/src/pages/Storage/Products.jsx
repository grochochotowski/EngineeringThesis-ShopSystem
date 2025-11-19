import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function Products() {
    const [showModal, setShowModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);


    const [products, setProducts] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

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
    const clearSelectionRef = useRef(null);
    const filtersRef = useRef(null);

    // Fetch products from API with filters
    const fetchProducts = useCallback(
        async (page = 1) => {
            if (loadedPages.current.has(page)) return;
            loadedPages.current.add(page);

            try {
                setLoading(true);
                const { items, totalPages } = await api.get("/Products", {
                    params: {
                        PageNumber: page,
                        PageSize: 50,
                        ...(searchQuery && { q: searchQuery }),
                        ...(filters.minPrice && { minPrice: filters.minPrice }),
                        ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
                        ...(filters.categoryId && { categoryId: filters.categoryId }),
                        ...(filters.defective !== "" && { defective: filters.defective }),
                        ...(filters.isActive !== "" && { isActive: filters.isActive }),
                    },
                });

                if (items?.length) {
                    setProducts(items);
                    setHasMore(page < (totalPages || 1));
                } else {
                    setProducts([]);
                    setHasMore(false);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load products.");
            } finally {
                setLoading(false);
            }
        },
        [filters, searchQuery]
    );

    // Reset and reload when filters or search change
    useEffect(() => {
        const delay = setTimeout(() => {
            setProducts([]);
            loadedPages.current.clear();
            setPageNumber(1);
            fetchProducts(1);
        }, 1000);

        return () => clearTimeout(delay);
    }, [filters, searchQuery, fetchProducts]);

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
        if (pageNumber > 1) fetchProducts(pageNumber);
    }, [pageNumber, fetchProducts]);

    // Columns for table
    const columns = [
        { key: "sku", label: "SKU" },
        { key: "name", label: "Name" },
        { key: "price", label: "Price" },
        { key: "defective", label: "Defective" },
        { key: "categoryId", label: "Category ID" },
        { key: "isActive", label: "Active" },
    ];

    const rows = products.map((p) => ({
        sku: p.sku,
        name: p.name,
        price: p.price.toFixed(2),
        defective: p.defective ? "Yes" : "No",
        categoryId: p.categoryId,
        isActive: p.isActive ? "Yes" : "No",
    }));

    const user = JSON.parse(localStorage.getItem("user"));

    // Updating search query
    const typingTimeout = useRef(null);

    const handleSearchChange = (value) => {
        setSearchQuery(value);

        if (clearSelectionRef.current) clearSelectionRef.current();
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            setProducts([]);
            loadedPages.current.clear();
            setPageNumber(1);
            fetchProducts(1);

        }, 1000);
    };

    // Auto-updating filters
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleBooleanChange = (e) => {
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
                    onAdd={() => {
                        setSelectedProduct(null);
                        setShowModal(true);
                    }}
                    onEdit={(row) => {
                        setSelectedProduct(row);
                        setShowModal(true);
                    }}
                    onDelete={(row) => {
                        setSelectedProduct(row);
                        setShowConfirm(true);
                    }}
                    onToggleFilters={() => setShowFilters((prev) => !prev)}
                    onSearchChange={handleSearchChange}
                    searchValue={searchQuery}
                    onClearSelection={(fn) => (clearSelectionRef.current = fn)}
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
                        <input
                            type="number"
                            name="categoryId"
                            placeholder="Category ID"
                            value={filters.categoryId}
                            onChange={handleInputChange}
                        />
                        <select
                            name="defective"
                            value={filters.defective}
                            onChange={handleBooleanChange}
                        >
                            <option value="">All products</option>
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
                    title={selectedProduct ? "Edit Product" : "Add Product"}
                    onClose={() => setShowModal(false)}
                >
                    <p>
                        {selectedProduct
                            ? `Editing product: ${selectedProduct.name}`
                            : "Creating new product"}
                    </p>
                    {/* TODO: tutaj pójdzie ProductForm */}
                    <div style={{ marginTop: "1rem", textAlign: "right" }}>
                        <button className="btn-cancel" onClick={() => setShowModal(false)}>
                            Close
                        </button>
                    </div>
                </Modal>
            )}

            {/* === CONFIRM DIALOG: Delete / Deactivate === */}
            {showConfirm && (
                <ConfirmDialog
                    title={
                        selectedProduct?.isActive === "Yes"
                            ? "Deactivate Product"
                            : "Delete Product"
                    }
                    message={
                        selectedProduct?.isActive === "Yes"
                            ? `Are you sure you want to deactivate "${selectedProduct.name}"?`
                            : `Are you sure you want to permanently delete "${selectedProduct.name}"?`
                    }
                    confirmText={selectedProduct?.isActive === "Yes" ? "Deactivate" : "Delete"}
                    onConfirm={() => {
                        console.log("Confirmed action for:", selectedProduct);
                        setShowConfirm(false);
                    }}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </div>
    );
}
