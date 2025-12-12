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
    const [filters, setFilters] = useState({ isActive: "true" });
    const [sortColumn, setSortColumn] = useState("name");
    const [sortDirection, setSortDirection] = useState("asc");

    const observerRef = useRef(null);
    const filtersRef = useRef(null);

    const currentUser = JSON.parse(localStorage.getItem("user"));

    const fetchCategories = useCallback(async (page = 1, reset = false) => {
        setLoading(true);
        if (reset) {
            setPageNumber(1);
            setCategories([]);
        }
        try {
            const response = await api.get("/Categories", {
                params: {
                    PageNumber: page,
                    PageSize: 20,
                    ...(filters.isActive !== "" && { isActive: filters.isActive }),
                    orderBy: sortColumn,
                    sortDirection: sortDirection,
                },
            });
            const items = response.items || [];
            const totalPages = response.totalPages || 1;
            setCategories(prev => reset ? items : [...prev, ...items.filter(i => !prev.some(p => p.id === i.id))]);
            setHasMore(page < totalPages);
        } catch (err) {
            setError("Failed to load categories.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters, sortColumn, sortDirection]);

    // Effect for initial load and subsequent filtering/sorting
    useEffect(() => {
        fetchCategories(1, true);
    }, [filters, sortColumn, sortDirection, fetchCategories]);

    // === Infinite scroll ===
    useEffect(() => {
        if (loading || !hasMore) return;

        const node = observerRef.current; // Capture the current ref value

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
                observer.unobserve(node); // Use the captured value
            }
        };
    }, [loading, hasMore]);

    useEffect(() => {
        if (pageNumber > 1) {
            fetchCategories(pageNumber);
        }
    }, [pageNumber, fetchCategories]);

    const columns = [
        { key: "id", label: "ID", width: "10%", sortable: false },
        { key: "name", label: "Name", width: "30%", sortable: true },
        { key: "description", label: "Description", width: "50%" },
        { key: "isActive", label: "Active", width: "10%", sortable: true },
    ];
    
    const toRow = useCallback((c) => {
        const active = typeof c.isActive === "boolean" ? c.isActive : Boolean(c.isActive);
        return {
            ...c,
            _isActive: active,
            isActive: active ? "Yes" : "No",
        };
    }, []);

    const rows = useMemo(() => {
        return categories.map(toRow);
    }, [categories, toRow]);

    const detailsConfig = {
        status: {
            key: "_isActive",
            activeLabel: "Active",
            inactiveLabel: "Inactive",
        },
        fields: [
            { label: "ID", key: "id" },
            { label: "Name", key: "name" },
            { label: "Description", key: "description" },
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

    const handleBooleanChange = (e) => {
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

        const { id, _isActive } = actionableCategory;
        const endpoint = _isActive ? `/Categories/${id}/deactivate` : `/Categories/${id}/activate`;

        try {
            setLoading(true);
            await api.put(endpoint);
            setToast({ message: `Category ${_isActive ? "deactivated" : "activated"} successfully.`, type: "success" });

            const newActiveState = !_isActive;

            // Update the categories list with the new active state
            setCategories(prev =>
                prev.map(c =>
                    c.id === id ? { ...c, isActive: newActiveState } : c
                )
            );

            // If the selected row is the one we just changed, update it
            if (selectedRow && selectedRow.id === id) {
                setSelectedRow(prev => ({
                    ...prev,
                    _isActive: newActiveState,
                    isActive: newActiveState ? "Yes" : "No"
                }));
            }

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
                    data={rows}
                    loading={loading}
                    error={error}
                    selectedRow={selectedRow}
                    onSelectRow={handleRowSelect}
                    detailsData={selectedRow}
                    detailsConfig={detailsConfig}
                    onAdd={openCreateModal}
                    onEdit={openEditModal}
                    onDelete={handleStatusToggle}
                    onToggleFilters={() => setShowFilters(p => !p)}
                    onSort={handleSort}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    deleteButtonLabel={selectedRow?._isActive ? "Deactivate" : "Activate"}
                    deleteButtonClass={selectedRow?._isActive ? "btn-confirm-negative" : "btn-confirm-positive"}
                />

                {showFilters && (
                    <div className="filters-panel" ref={filtersRef}>
                        <h4>Filters</h4>
                        <select name="isActive" value={filters.isActive} onChange={handleBooleanChange}>
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
                        onSuccess={async (categoryId) => {
                            setShowModal(false);
                            lastSelectedId.current = categoryId;
                            await fetchCategories(1, true);
                        }}
                    />
                </Modal>
            )}

            {actionableCategory && (
                <ConfirmDialog
                    title={actionableCategory._isActive ? "Deactivate Category" : "Activate Category"}
                    message={`Are you sure you want to ${actionableCategory._isActive ? "deactivate" : "activate"} "${actionableCategory.name}"?`}
                    confirmText={actionableCategory._isActive ? "Deactivate" : "Activate"}
                    confirmButtonClass={actionableCategory._isActive ? "dialog-btn-confirm-negative" : "dialog-btn-confirm-positive"}
                    onConfirm={confirmStatusChange}
                    onCancel={() => setActionableCategory(null)}
                />
            )}

            {toast && (
                <MessageBox message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} className="centered" />
            )}
        </div>
    );
}
