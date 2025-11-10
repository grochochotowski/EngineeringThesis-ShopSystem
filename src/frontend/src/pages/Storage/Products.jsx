import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";

export default function Products() {
    const [products, setProducts] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        q: "",
        minPrice: "",
        maxPrice: "",
        categoryId: "",
        defective: "",
        isActive: "",
    });

    const observerRef = useRef(null);
    const loadedPages = useRef(new Set());

    // Fetch products from API
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
                        ...filters,
                    },
                });

                if (items?.length) {
                    setProducts((prev) => {
                        const merged = [...prev, ...items];
                        const unique = merged.filter(
                            (v, i, arr) => arr.findIndex((x) => x.sku === v.sku) === i
                        );
                        return unique;
                    });
                    setHasMore(page < (totalPages || 1));
                } else {
                    setHasMore(false);
                }
            } catch (err) {
                setError("Failed to load products.");
            } finally {
                setLoading(false);
            }
        },
        [filters]
    );

    // Initial load or filter change
    useEffect(() => {
        setProducts([]);
        loadedPages.current.clear();
        setPageNumber(1);
        fetchProducts(1);
    }, [fetchProducts]);

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

    // Handle search
    const handleSearch = () => {
        setProducts([]);
        loadedPages.current.clear();
        setPageNumber(1);
        fetchProducts(1);
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
                    title="Products"
                    columns={columns}
                    data={rows}
                    loading={loading}
                    error={error}
                    onAdd={() => console.log("Add product")}
                    onEdit={() => console.log("Edit product")}
                    onDelete={() => console.log("Delete product")}
                />

                {/* Bottom loader and scroll observer */}
                <div ref={observerRef} style={{ height: "1px" }} />
                {loading && (
                    <p style={{ textAlign: "center", marginTop: 10 }}>
                        Loading...
                    </p>
                )}
            </main>
        </div>
    );
}
