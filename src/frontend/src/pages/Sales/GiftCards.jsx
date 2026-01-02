import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import MessageBox from "../../components/MessageBox";

export default function GiftCards() {
    const [giftCards, setGiftCards] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [toast, setToast] = useState(null);

    const [selectedRow, setSelectedRow] = useState(null);
    const lastSelectedId = useRef(null);

    // --- Filters ---
    const [filters, setFilters] = useState({
        code: "",
        isActive: ""
    });
    const [sortColumn, setSortColumn] = useState("dateIssued");
    const [sortDirection, setSortDirection] = useState("desc");

    const observerRef = useRef(null);
    const filtersRef = useRef(null);

    const currentUser = JSON.parse(localStorage.getItem("user"));

    const fetchGiftCards = useCallback(async (page = 1, reset = false) => {
        setLoading(true);
        if (reset) {
            setPageNumber(1);
            setGiftCards([]);
        }
        try {
            const response = await api.get("/GiftCard", {
                params: {
                    PageNumber: page,
                    PageSize: 50,
                    ...(filters.code && { code: filters.code }),
                    ...(filters.isActive !== "" && { isActive: filters.isActive }),
                    orderBy: sortColumn,
                    sortDirection: sortDirection,
                },
            });
            const items = response.items || [];
            const totalPages = response.totalPages || 1;
            setGiftCards(prev => reset ? items : [...prev, ...items.filter(i => !prev.some(p => p.id === i.id))]);
            setHasMore(page < totalPages);
        } catch (err) {
            setError("Failed to load gift cards.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters, sortColumn, sortDirection]);

    // Effect for initial load and subsequent filtering/sorting
    useEffect(() => {
        fetchGiftCards(1, true);
    }, [filters, sortColumn, sortDirection, fetchGiftCards]);

    // === Infinite scroll ===
    useEffect(() => {
        if (loading || !hasMore) return;

        const node = observerRef.current;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setPageNumber((prev) => prev + 1);
            }
        });

        if (node) {
            observer.observe(node);
        }

        return () => {
            if (node) {
                observer.unobserve(node);
            }
        };
    }, [loading, hasMore]);

    useEffect(() => {
        if (pageNumber > 1) {
            fetchGiftCards(pageNumber);
        }
    }, [pageNumber, fetchGiftCards]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    const columns = [
        { key: "id", label: "ID", width: "8%", sortable: false },
        { key: "code", label: "Gift Card Number", width: "25%", sortable: true },
        { key: "value", label: "Value", width: "12%", sortable: true },
        { key: "dateIssued", label: "Date Issued", width: "15%", sortable: true },
        { key: "dateValidUntil", label: "Valid Until", width: "15%", sortable: true },
        { key: "isActive", label: "Status", width: "10%", sortable: true },
    ];

    const toRow = useCallback((gc) => {
        const active = typeof gc.isActive === "boolean" ? gc.isActive : Boolean(gc.isActive);
        return {
            ...gc,
            _isActive: active,
            value: `$${gc.value.toFixed(2)}`,
            dateIssued: formatDate(gc.dateIssued),
            dateValidUntil: formatDate(gc.dateValidUntil),
            isActive: active ? "Active" : "Inactive",
        };
    }, []);

    const rows = useMemo(() => {
        return giftCards.map(toRow);
    }, [giftCards, toRow]);

    const detailsConfig = {
        status: {
            key: "_isActive",
            activeLabel: "Active",
            inactiveLabel: "Inactive",
        },
        fields: [
            { label: "ID", key: "id" },
            { label: "Gift Card Number", key: "code" },
            { label: "Value", key: "value" },
            { label: "Date Issued", key: "dateIssued" },
            { label: "Valid Until", key: "dateValidUntil" },
        ],
    };

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

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleRowSelect = (row) => {
        setSelectedRow(row);
        lastSelectedId.current = row?.id;
    };

    const handleResetFilters = () => {
        setFilters({ code: "", isActive: "" });
    };

    return (
        <div className="page-container">
            <Header user={currentUser} onLogout={() => { localStorage.clear(); window.location.href = "/"; }} />
            <main className="page-content">
                <BaseListPage
                    title="Gift Cards"
                    columns={columns}
                    data={rows}
                    loading={loading}
                    error={error}
                    selectedRow={selectedRow}
                    onSelectRow={handleRowSelect}
                    detailsData={selectedRow}
                    detailsConfig={detailsConfig}
                    onToggleFilters={() => setShowFilters(p => !p)}
                    onSort={handleSort}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    hideActions={true}
                />

                {showFilters && (
                    <div className="filters-panel" ref={filtersRef}>
                        <h4>Filters</h4>
                        <div className="filter-group">
                            <label htmlFor="code">Gift Card Number</label>
                            <input
                                id="code"
                                name="code"
                                type="text"
                                value={filters.code}
                                onChange={handleFilterChange}
                                placeholder="Enter gift card number..."
                            />
                        </div>
                        <div className="filter-group">
                            <label htmlFor="isActive">Status</label>
                            <select
                                id="isActive"
                                name="isActive"
                                value={filters.isActive}
                                onChange={handleFilterChange}
                            >
                                <option value="">All</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                        <button className="btn-secondary" onClick={handleResetFilters}>
                            Reset Filters
                        </button>
                    </div>
                )}

                <div ref={observerRef} style={{ height: "1px" }} />
            </main>

            {toast && (
                <MessageBox message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} className="centered" />
            )}
        </div>
    );
}
