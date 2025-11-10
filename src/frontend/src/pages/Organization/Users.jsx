import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";

export default function Users() {
    const [users, setUsers] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    // --- Filters ---
    const [filters, setFilters] = useState({
        role: "",
        isActive: "",
    });

    // --- Search ---
    const [searchQuery, setSearchQuery] = useState("");

    const observerRef = useRef(null);
    const loadedPages = useRef(new Set());
    const filtersRef = useRef(null);

    // === FETCH USERS ===
    const fetchUsers = useCallback(
    async (page = 1) => {
        if (loadedPages.current.has(page)) return;
        loadedPages.current.add(page);

        try {
            setLoading(true);
            const { items, totalPages } = await api.get("/Users", {
                params: {
                    PageNumber: page,
                    PageSize: 20,
                    ...(searchQuery && { search: searchQuery }),
                    ...(filters.role && { role: filters.role }),
                    ...(filters.isActive !== "" && { isActive: filters.isActive }),
                },
            });

            if (items?.length) {
                setUsers(items);
                setHasMore(page < (totalPages || 1));
            } else {
                setUsers([]);
                setHasMore(false);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load users.");
        } finally {
            setLoading(false);
        }
    },
    [filters, searchQuery]);

    // === Auto refresh when filters/search change ===
    useEffect(() => {
        const delay = setTimeout(() => {
            setUsers([]);
            loadedPages.current.clear();
            setPageNumber(1);
            fetchUsers(1);
        }, 500);

        return () => clearTimeout(delay);
    }, [filters, searchQuery, fetchUsers]);

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
        if (pageNumber > 1) fetchUsers(pageNumber);
    }, [pageNumber, fetchUsers]);

    // === Columns ===
    const columns = [
        { key: "id", label: "ID" },
        { key: "firstName", label: "First Name" },
        { key: "lastName", label: "Last Name" },
        { key: "email", label: "Email" },
        { key: "phoneNumber", label: "Phone" },
        { key: "role", label: "Role" },
        { key: "isActive", label: "Active" },
    ];

    const rows = users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phoneNumber: u.phoneNumber || "—",
        role: u.role || "—",
        isActive: u.isActive ? "Yes" : "No",
    }));

    const user = JSON.parse(localStorage.getItem("user"));

    // === Search change with debounce ===
    const typingTimeout = useRef(null);
    const handleSearchChange = (value) => {
        setSearchQuery(value);

        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            setUsers([]);
            loadedPages.current.clear();
            setPageNumber(1);
            fetchUsers(1);
        }, 500);
    };

    // === Filter handlers ===
    const handleFilterChange = (e) => {
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
                    title="Users"
                    columns={columns}
                    data={rows}
                    loading={loading}
                    error={error}
                    onAdd={() => console.log("Add user")}
                    onEdit={() => console.log("Edit user")}
                    onDelete={() => console.log("Delete user")}
                    onToggleFilters={() => setShowFilters((prev) => !prev)}
                    onSearchChange={handleSearchChange}
                    searchValue={searchQuery}
                />

                {/* === Filter Panel === */}
                {showFilters && (
                    <div className="filters-panel" ref={filtersRef}>
                        <h4>Filters</h4>

                        <select
                            name="role"
                            value={filters.role}
                            onChange={handleFilterChange}
                        >
                            <option value="">All roles</option>
                            <option value="Admin">Admin</option>
                            <option value="CEO">CEO</option>
                            <option value="Manager">Manager</option>
                            <option value="DeputyManager">DeputyManager</option>
                            <option value="ShopAssistant">ShopAssistant</option>
                            <option value="ItTechnician">ItTechnician</option>
                            <option value="Marketer">Marketer</option>
                            <option value="Root">Root</option>
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
        </div>
    );
}
