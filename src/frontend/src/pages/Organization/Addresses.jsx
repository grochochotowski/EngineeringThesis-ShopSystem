import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import MessageBox from "../../components/MessageBox";

export default function Addresses() {
    const [addresses, setAddresses] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [toast, setToast] = useState(null);
    const [isDelayedRefresh, setIsDelayedRefresh] = useState(false);

    const [countries, setCountries] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    const [selectedAddressDetails, setSelectedAddressDetails] = useState(null);
    const lastSelectedId = useRef(null);

    // --- Filters ---
    const [filters, setFilters] = useState({
        country: "",
        city: "",
    });
    const [sortColumn, setSortColumn] = useState("city");
    const [sortDirection, setSortDirection] = useState("asc");

    const sortKeyMap = {
        country: "country",
        city: "city",
        street: "street",
        postalCode: "postalCode",
    };

    // --- Search ---
    const [searchQuery, setSearchQuery] = useState("");

    const observerRef = useRef(null);
    const loadedPages = useRef(new Set());
    const filtersRef = useRef(null);
    const typingTimeout = useRef(null);

    const currentUser = JSON.parse(localStorage.getItem("user"));

    // === FETCH COUNTRIES ===
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const response = await api.get("/Addresses/countries");
                setCountries(response || []);
            } catch (err) {
                console.error("Failed to load countries.", err);
            }
        };
        fetchCountries();
    }, []);

    // === FETCH ADDRESSES ===
    const fetchAddresses = useCallback(
        async (page = 1, reset = false) => {
            if (loadedPages.current.has(page) && !reset) return;
            loadedPages.current.add(page);
-
            try {
                setLoading(true);
                const mappedSort = sortKeyMap[sortColumn] || undefined;
                const { items = [], totalPages = 1 } = await api.get("/Addresses", {
                    params: {
                        PageNumber: page,
                        PageSize: 20,
                        ...(searchQuery && { search: searchQuery }),
                        ...(filters.country && { country: filters.country }),
                        ...(filters.city && { city: filters.city }),
                        ...(mappedSort && { orderBy: mappedSort }),
                        ...(sortDirection && { sortDirection }),
                    },
                });

                setAddresses((prev) =>
                    page === 1 ? items : [...prev, ...items.filter((i) => !prev.some((p) => p.id === i.id))]
                );
                setHasMore(page < (totalPages || 1));

                if (page === 1 && items.length === 0) {
                    setSelectedRow(null);
                    setSelectedAddressDetails(null);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load addresses.");
            } finally {
                setLoading(false);
            }
        },
        [filters, searchQuery, sortColumn, sortDirection]
    );

    // === Initial load ===
    useEffect(() => {
        fetchAddresses(1, true);
    }, [fetchAddresses]);

    // === Auto refresh when filters/search change ===
    useEffect(() => {
        const delay = setTimeout(() => {
            setAddresses([]);
            loadedPages.current.clear();
            setPageNumber(1);
            fetchAddresses(1, true);
            setIsDelayedRefresh(false);
        }, isDelayedRefresh ? 500 : 0);

        return () => clearTimeout(delay);
    }, [filters, searchQuery, isDelayedRefresh, fetchAddresses]);

    // === Infinite scroll ===
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

    // === Load next page ===
    useEffect(() => {
        if (pageNumber > 1) fetchAddresses(pageNumber);
    }, [pageNumber, fetchAddresses]);

    // === Columns ===
    const columns = [
        { key: "id", label: "ID", width: "8%", sortable: false },
        { key: "country", label: "Country", width: "15%" },
        { key: "city", label: "City", width: "15%" },
        { key: "street", label: "Street", width: "25%" },
        { key: "building", label: "Building", width: "12%", sortable: false },
        { key: "premises", label: "Premises", width: "10%", sortable: false },
        { key: "postalCode", label: "Postal Code", width: "15%" },
    ];

    const toRow = useCallback((a) => {
        return {
            id: a.id,
            country: a.country,
            city: a.city,
            street: a.street,
            building: a.building || "—",
            premises: a.premises || "—",
            postalCode: a.postalCode,
        };
    }, []);

    const rows = useMemo(() => addresses.map(toRow), [addresses, toRow]);

    // === Search change with debounce ===
    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setIsDelayedRefresh(true);

        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            setAddresses([]);
            loadedPages.current.clear();
            setPageNumber(1);
            fetchAddresses(1, true);
            setIsDelayedRefresh(false);
        }, 500);
    };

    const handleSort = (column) => {
        if (!sortKeyMap[column]) return;
        setIsDelayedRefresh(false);

        if (sortColumn === column) {
            if (sortDirection === "asc") {
                setSortDirection("desc");
            } else if (sortDirection === "desc") {
                setSortColumn(null);
                setSortDirection(null);
            } else {
                setSortColumn(column);
                setSortDirection("asc");
            }
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    // === Filter handlers ===
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setIsDelayedRefresh(false);
        setFilters((prev) => ({ ...prev, [name]: value }));
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

    // === Handle row selection to load full address details ===
    const handleRowSelect = useCallback(async (row) => {
        if (!row) {
            setSelectedRow(null);
            setSelectedAddressDetails(null);
            lastSelectedId.current = null;
            return;
        }

        lastSelectedId.current = row.id;
        setSelectedRow(row);
        try {
            const full = await api.get(`/Addresses/${row.id}`);
            setSelectedAddressDetails(full);
        } catch (err) {
            console.error(err);
            setToast({
                message: err.response?.data?.message || "Failed to load address details.",
                type: "error",
            });
        }
    }, []);

    const addressDetailsConfig = {
        fields: [
            { label: "Id", key: "id" },
            { label: "Country", key: "country" },
            { label: "City", key: "city" },
            { label: "Street", key: "street" },
            { label: "Building", key: "building" },
            { label: "Premises", key: "premises" },
            { label: "Postal Code", key: "postalCode" },
        ],
    };

    // Reselect previously chosen row after data refresh
    useEffect(() => {
        if (!lastSelectedId.current || addresses.length === 0) return;
        const target = addresses.find((a) => a.id === lastSelectedId.current);
        if (!target) {
            setSelectedRow(null);
            setSelectedAddressDetails(null);
            return;
        }
        if (selectedRow?.id === target.id && selectedAddressDetails) return;
        handleRowSelect(toRow(target));
    }, [addresses, selectedRow, selectedAddressDetails, handleRowSelect]);

    // === Render ===
    return (
        <div className="page-container">
            <Header
                user={currentUser}
                onLogout={() => {
                    localStorage.clear();
                    window.location.href = "/";
                }}
            />
            <main className="page-content">
                <BaseListPage
                    title="Addresses"
                    columns={columns}
                    data={rows}
                    loading={loading}
                    error={error}
                    selectedRow={selectedRow}
                    onSelectRow={handleRowSelect}
                    detailsData={selectedAddressDetails}
                    detailsConfig={addressDetailsConfig}
                    onToggleFilters={() => setShowFilters((prev) => !prev)}
                    onSearchChange={handleSearchChange}
                    searchValue={searchQuery}
                    onSort={handleSort}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    hideAddButton={true}
                    hideEditButton={true}
                    hideDeleteButton={true}
                />

                {/* === Filter Panel === */}
                {showFilters && (
                    <div className="filters-panel" ref={filtersRef}>
                        <h4>Filters</h4>
                        <select
                            name="country"
                            value={filters.country}
                            onChange={handleFilterChange}
                        >
                            <option value="">All Countries</option>
                            {countries.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            name="city"
                            placeholder="Filter by City"
                            value={filters.city}
                            onChange={handleFilterChange}
                        />
                    </div>
                )}

                {/* Infinite scroll sentinel */}
                <div ref={observerRef} style={{ height: "1px" }} />
                {loading && (
                    <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>
                )}
            </main>

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
