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

    const observerRef = useRef(null);
    const loadedPages = useRef(new Set()); // keep track of already fetched pages

    // Fetch users from API (paginated)
    const fetchUsers = useCallback(async (page = 1) => {
        // Skip if this page was already fetched
        if (loadedPages.current.has(page)) return;
        loadedPages.current.add(page);

        try {
            setLoading(true);
            const { items, totalPages } = await api.get("/Users", {
                params: { PageNumber: page, PageSize: 10 },
            });

            if (items?.length) {
                setUsers(prev => {
                    // Merge new and old items, remove duplicates by ID
                    const merged = [...prev, ...items];
                    const unique = merged.filter(
                        (v, i, arr) => arr.findIndex(x => x.id === v.id) === i
                    );
                    return unique;
                });
                // Determine if more pages are available
                setHasMore(page < (totalPages || 1));
            } else {
                setHasMore(false);
            }
        } catch {
            setError("Failed to load users.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        setUsers([]);
        loadedPages.current.clear();
        fetchUsers(1);
    }, [fetchUsers]);

    // Infinite scroll: trigger when reaching the bottom
    useEffect(() => {
        if (loading) return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPageNumber(prev => prev + 1);
            }
        });
        if (observerRef.current) observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [loading, hasMore]);

    // Fetch next page when pageNumber changes
    useEffect(() => {
        if (pageNumber > 1) fetchUsers(pageNumber);
    }, [pageNumber, fetchUsers]);

    const columns = [
        { key: "id", label: "ID" },
        { key: "firstName", label: "First Name" },
        { key: "lastName", label: "Last Name" },
        { key: "email", label: "Email" },
        { key: "phoneNumber", label: "Phone" },
        { key: "role", label: "Role" },
        { key: "dateOfBirth", label: "Date of Birth" },
    ];

    const rows = users.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phoneNumber: u.phoneNumber,
        role: u.role,
        dateOfBirth: new Date(u.dateOfBirth).toLocaleDateString(),
    }));

    const user = JSON.parse(localStorage.getItem("user"));

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
                />
                {/* Invisible marker used for IntersectionObserver */}
                <div ref={observerRef} style={{ height: "1px" }} />
                
                {/* Loading indicator for bottom of list */}
                {loading && (
                    <p style={{ textAlign: "center", marginTop: 10 }}>
                        Loading...
                    </p>
                )}
            </main>
        </div>
    );
}
