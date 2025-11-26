import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import Modal from "../../components/Modal";
import CategoryForm from "../../components/Forms/CategoryForm";
import ConfirmDialog from "../../components/ConfirmDialog";
import MessageBox from "../../components/MessageBox";

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [toast, setToast] = useState(null);
    
    const [selectedRow, setSelectedRow] = useState(null);
    const [actionableCategory, setActionableCategory] = useState(null);
    const lastSelectedId = useRef(null);

    const [showModal, setShowModal] = useState(false);
    const [formMode, setFormMode] = useState("create");

    // --- Filters ---
    const [filters, setFilters] = useState({ isActive: true });
    const [sortColumn, setSortColumn] = useState("name");
    const [sortDirection, setSortDirection] = useState("asc");

    const observerRef = useRef(null);
    const filtersRef = useRef(null);

    const currentUser = JSON.parse(localStorage.getItem("user"));

    // === FETCH CATEGORIES ===
    const fetchCategories = useCallback(async (page = 1, reset = false) => {
        if(reset) {
            setPageNumber(1);
            setCategories([]);
        }
        try {
            setLoading(true);
            const { items = [], totalPages = 1 } = await api.get("/Categories", {
                params: {
                    PageNumber: page,
                    PageSize: 20,
                    isActive: filters.isActive,
                    orderBy: sortColumn,
                    sortDirection: sortDirection,
                },
            });

            setCategories(prev => page === 1 ? items : [...prev, ...items]);
            setHasMore(page < totalPages);
        } catch (err) {
            console.error(err);
            setError("Failed to load categories.");
        } finally {
            setLoading(false);
        }
    }, [filters, sortColumn, sortDirection]);

    useEffect(() => {
        fetchCategories(1, true);
    }, [fetchCategories]);

    // === Infinite scroll ===
    useEffect(() => {
        if (loading || !hasMore) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setPageNumber((prev) => prev + 1);
            }
        });
        if (observerRef.current) observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [loading, hasMore]);

    useEffect(() => {
        if (pageNumber > 1) {
            fetchCategories(pageNumber);
        }
    }, [pageNumber]);

    const columns = [
        { key: "id", label: "ID", width: "10%" },
        { key: "name", label: "Name", width: "30%" },
        { key: "description", label: "Description", width: "50%" },
        { key: "isActive", label: "Active", width: "10%", render: (r) => r.isActive ? "Yes" : "No" },
    ];
    
    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value === "" ? null : value === "true" }));
    };

    const handleRowSelect = (row) => {
        setSelectedRow(row);
        lastSelectedId.current = row?.id;
    };

    const openCreateModal = () => {
        setFormMode("create");
        setSelectedRow(null);
        setShowModal(true);
    };

    const openEditModal = (row) => {
        setFormMode("edit");
        setSelectedRow(row);
        setShowModal(true);
    };
    
    const handleStatusToggle = (row) => {
        if (!row) return;
        setActionableCategory(row);
    };

    const confirmStatusChange = async () => {
        if (!actionableCategory) return;
        const { id, isActive } = actionableCategory;
        const endpoint = isActive ? `/Categories/${id}/deactivate` : `/Categories/${id}/activate`;
        
        try {
            setLoading(true);
            await api.put(endpoint);
            setToast({ message: `Category ${isActive ? "deactivated" : "activated"} successfully.`, type: "success" });
            fetchCategories(1, true); // Refresh list
        } catch (err) {
            setToast({ message: err.response?.data?.message || "Failed to update status.", type: "error" });
        } finally {
            setLoading(false);
            setActionableCategory(null);
        }
    };
    
    return (
        <div className="page-container">
            <Header user={currentUser} onLogout={() => { localStorage.clear(); window.location.href = "/"; }} />
            <main className="page-content">
                <BaseListPage
                    title="Categories"
                    columns={columns}
                    data={categories}
                    loading={loading}
                    error={error}
                    selectedRow={selectedRow}
                    onSelectRow={handleRowSelect}
                    onAdd={openCreateModal}
                    onEdit={openEditModal}
                    onDelete={handleStatusToggle}
                    onToggleFilters={() => setShowFilters(p => !p)}
                    onSort={handleSort}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    deleteButtonLabel={selectedRow?.isActive ? "Deactivate" : "Activate"}
                    deleteButtonClass={selectedRow?.isActive ? "btn-confirm-negative" : "btn-confirm-positive"}
                />

                {showFilters && (
                    <div className="filters-panel" ref={filtersRef}>
                        <h4>Filters</h4>
                        <select name="isActive" value={filters.isActive ?? ""} onChange={handleFilterChange}>
                            <option value="">All</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                )}
                
                <div ref={observerRef} style={{ height: "1px" }} />
            </main>

            {showModal && (
                <Modal title={formMode === "create" ? "Create Category" : "Edit Category"} onClose={() => setShowModal(false)}>
                    <CategoryForm
                        mode={formMode}
                        category={formMode === "edit" ? selectedRow : null}
                        onSuccess={() => {
                            setShowModal(false);
                            fetchCategories(1, true);
                        }}
                    />
                </Modal>
            )}

            {actionableCategory && (
                <ConfirmDialog
                    title={actionableCategory.isActive ? "Deactivate Category" : "Activate Category"}
                    message={`Are you sure you want to ${actionableCategory.isActive ? "deactivate" : "activate"} "${actionableCategory.name}"?`}
                    confirmText={actionableCategory.isActive ? "Deactivate" : "Activate"}
                    onConfirm={confirmStatusChange}
                    onCancel={() => setActionableCategory(null)}
                />
            )}

            {toast && (
                <MessageBox message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} />
            )}
        </div>
    );
}
