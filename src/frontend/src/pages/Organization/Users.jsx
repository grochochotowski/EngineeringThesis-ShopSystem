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

    const fetchUsers = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const data = await api.get("/Users", {
                params: { PageNumber: page, PageSize: 10 },
            });

            if (data?.items?.length > 0) {
                setUsers(prev => [...prev, ...data.items]);
                setHasMore(page < (data.totalPages || 1));
            } else {
                setHasMore(false);
            }
        } catch {
            setError("Failed to load users.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers(pageNumber);
    }, [pageNumber, fetchUsers]);

    // Infinite scroll observer
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

    const columns = [
        { key: "id", label: "ID" },
        { key: "firstName", label: "First Name" },
        { key: "lastName", label: "Last Name" },
        { key: "email", label: "Email" },
        { key: "phoneNumber", label: "Phone" },
        { key: "role", label: "Role" },
        { key: "dateOfBirth", label: "Date of Birth" },
    ];

    const rows = users.map((u) => ({
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
                {/* Wskaźnik końca listy */}
                <div ref={observerRef} style={{ height: "1px" }} />
            </main>
        </div>
    );
}
