// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../../api/apiClient";
import Header from "../../../components/Header";
import BaseListPage from "../../BaseListPage";
import AddModal from "./Modals/AddModal";
import EditModal from "./Modals/EditModal";
import StatusConfirmDialog from "./Modals/StatusConfirmDialog";
import MessageBox from "../../../components/MessageBox";

// === COMPONENT ===
/**
 * Categories page - manages product categories with CRUD operations
 * Uses BaseListPage for consistent list UI with infinite scroll, sorting, and filtering
 * Supports creating, editing, and activating/deactivating categories
 */
export default function Categories() {
  // === STATE ===
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [filters, setFilters] = useState({ isActive: "" });
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const observerRef = useRef(null);
  const filtersRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  // === DATA FETCHING ===
  /**
   * Fetches categories with pagination, filtering, and sorting
   * Applies filters from state and updates category list
   * @param {number} page - Page number to fetch (1-indexed)
   * @param {boolean} reset - If true, clears existing data before adding new
   */
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
          ...(searchQuery && { q: searchQuery }),
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
  }, [filters, sortColumn, sortDirection, searchQuery]);

  // === EFFECTS ===
  /**
   * Debounced search and filter changes
   * Waits 500ms after search input stops before fetching
   */
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCategories(1, true);
    }, searchQuery ? 500 : 0); // Immediate for non-search, debounced for search

    return () => clearTimeout(handler);
  }, [searchQuery, filters, sortColumn, sortDirection]);

  /**
   * Infinite scroll observer - loads next page when sentinel is visible
   */
  useEffect(() => {
    if (loading || !hasMore) return;

    const node = observerRef.current;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPageNumber((prev) => prev + 1);
      }
    });

    if (node) observer.observe(node);
    return () => {
      if (node) observer.unobserve(node);
    };
  }, [loading, hasMore]);

  /**
   * Load next page when pageNumber changes
   */
  useEffect(() => {
    if (pageNumber > 1) {
      fetchCategories(pageNumber);
    }
  }, [pageNumber, fetchCategories]);

  /**
   * Close filters panel when clicking outside
   */
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

  // === TABLE CONFIGURATION ===
  const columns = [
    { key: "id", label: "ID", width: "10%", sortable: false },
    { key: "name", label: "Name", width: "30%", sortable: true },
    { key: "description", label: "Description", width: "50%" },
    { key: "isActive", label: "Active", width: "10%", sortable: true },
  ];

  /**
   * Transforms category data to table row format
   * Converts boolean isActive to Yes/No display
   */
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

  // === EVENT HANDLERS ===
  /**
   * Handles column header clicks for sorting
   * Cycles through: asc -> desc -> no sort
   */
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

  /**
   * Handles filter dropdown changes
   */
  const handleBooleanChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handles row selection in the table
   * Updates selectedRow state and stores ID for restore after refresh
   */
  const handleRowSelect = (row) => {
    setSelectedRow(row);
    lastSelectedId.current = row?.id;
  };

  /**
   * Opens add modal for creating new category
   */
  const openCreateModal = () => {
    setSelectedRow(null);
    setShowAddModal(true);
  };

  /**
   * Opens edit modal for updating selected category
   */
  const openEditModal = (row) => {
    setSelectedRow(row);
    setShowEditModal(true);
  };

  /**
   * Opens confirmation dialog for status toggle (activate/deactivate)
   */
  const handleStatusToggle = (row) => {
    if (!row) return;
    setActionableCategory(row);
  };

  /**
   * Confirms and executes status change (activate/deactivate)
   * Updates local state immediately and refreshes data from server
   */
  const confirmStatusChange = async () => {
    if (!actionableCategory) return;

    const { id, _isActive } = actionableCategory;
    const endpoint = _isActive ? `/Categories/${id}/deactivate` : `/Categories/${id}/activate`;

    try {
      setLoading(true);
      await api.put(endpoint);
      setToast({ message: `Category ${_isActive ? "deactivated" : "activated"} successfully.`, type: "success" });

      const newActiveState = !_isActive;

      setCategories(prev =>
        prev.map(c =>
          c.id === id ? { ...c, isActive: newActiveState } : c
        )
      );

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

  /**
   * Handles successful category creation or update
   * Refreshes data and reselects the modified category
   */
  const handleSuccess = async (categoryId) => {
    setShowAddModal(false);
    setShowEditModal(false);
    lastSelectedId.current = categoryId;
    await fetchCategories(1, true);
  };

  // === RENDER ===
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
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
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

      <AddModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleSuccess}
      />

      <EditModal
        show={showEditModal}
        category={selectedRow}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleSuccess}
      />

      <StatusConfirmDialog
        category={actionableCategory}
        onConfirm={confirmStatusChange}
        onCancel={() => setActionableCategory(null)}
      />

      {toast && (
        <MessageBox message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} className="centered" />
      )}
    </div>
  );
}
