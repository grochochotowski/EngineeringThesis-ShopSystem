// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../../api/apiClient";
import Header from "../../../components/Header";
import BaseListPage from "../../BaseListPage";
import AddModal from "./Modals/AddModal";
import EditModal from "./Modals/EditModal";
import StatusConfirmDialog from "./Modals/StatusConfirmDialog";
import { useToast } from "../../../components/ToastContext";

// === ROLE HELPER FUNCTIONS ===
const ROLE_HIERARCHY = ["Marketer", "ItTechnician", "ShopAssistant", "DeputyManager", "Manager", "CEO", "Admin", "Root"];
const getRoleLevel = (role) => ROLE_HIERARCHY.indexOf(role);
const isDeputyManagerOrAbove = (role) => ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf("DeputyManager");

// === COMPONENT ===
/**
 * TaxRates page - manages tax rates with CRUD operations
 * Uses BaseListPage for consistent list UI with client-side sorting and filtering
 * Supports creating, editing, and activating/deactivating tax rates
 */
export default function TaxRates() {
  const { showToast } = useToast();
  // === STATE ===
  const [taxRates, setTaxRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedRow, setSelectedRow] = useState(null);
  const [actionableTaxRate, setActionableTaxRate] = useState(null);
  const lastSelectedId = useRef(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [sortColumn, setSortColumn] = useState("code");
  const [sortDirection, setSortDirection] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const userRole = currentUser?.role;

  // Permission checks
  const canAddEdit = isDeputyManagerOrAbove(userRole);

  // === DATA FETCHING ===
  /**
   * Fetches all tax rates from the API
   * Tax rates are loaded all at once (no pagination) due to small dataset size
   */
  const fetchTaxRates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/TaxRate");
      const items = response || [];
      setTaxRates(items);
    } catch (err) {
      setError("Failed to load tax rates.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // === EFFECTS ===
  /**
   * Initial load of tax rates
   */
  useEffect(() => {
    fetchTaxRates();
  }, [fetchTaxRates]);

  // === TABLE CONFIGURATION ===
  const columns = [
    { key: "id", label: "ID", width: "10%", sortable: false },
    { key: "code", label: "Code", width: "40%", sortable: true },
    { key: "rate", label: "Rate", width: "30%", sortable: true },
    { key: "isActive", label: "Active", width: "20%", sortable: true },
  ];

  /**
   * Transforms tax rate data to table row format
   * Converts rate to percentage display and isActive to Yes/No
   */
  const toRow = useCallback((t) => {
    const active = typeof t.isActive === "boolean" ? t.isActive : Boolean(t.isActive);
    return {
      ...t,
      _isActive: active,
      rate: `${(t.rate * 100).toFixed(0)}%`,
      isActive: active ? "Yes" : "No",
    };
  }, []);

  /**
   * Filters and sorts tax rates based on search query and sort settings
   * Filtering and sorting are done client-side since dataset is small
   */
  const filteredAndSortedRows = useMemo(() => {
    let filtered = taxRates.map(toRow);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((row) =>
        row.code?.toLowerCase().includes(query) ||
        row.rate?.toLowerCase().includes(query)
      );
    }

    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];

        if (sortColumn === "rate") {
          aVal = parseFloat(aVal);
          bVal = parseFloat(bVal);
        }

        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (sortDirection === "asc") {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    return filtered;
  }, [taxRates, toRow, searchQuery, sortColumn, sortDirection]);

  const detailsConfig = {
    status: {
      key: "_isActive",
      activeLabel: "Active",
      inactiveLabel: "Inactive",
    },
    fields: [
      { label: "ID", key: "id" },
      { label: "Code", key: "code" },
      { label: "Rate", key: "rate" },
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
   * Handles search input changes
   */
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setSelectedRow(null);
  };

  /**
   * Handles row selection in the table
   */
  const handleRowSelect = (row) => {
    setSelectedRow(row);
    lastSelectedId.current = row?.id;
  };

  /**
   * Opens add modal for creating new tax rate
   */
  const openCreateModal = () => {
    if (!canAddEdit) {
      showToast("You don't have permission to add tax rates", "error");
      return;
    }
    setSelectedRow(null);
    setShowAddModal(true);
  };

  /**
   * Opens edit modal for updating selected tax rate
   */
  const openEditModal = (row) => {
    if (!canAddEdit) {
      showToast("You don't have permission to edit tax rates", "error");
      return;
    }
    setSelectedRow(row);
    setShowEditModal(true);
  };

  /**
   * Opens confirmation dialog for status toggle
   */
  const handleStatusToggle = (row) => {
    if (!row) return;
    if (!canAddEdit) {
      showToast("You don't have permission to activate/deactivate tax rates", "error");
      return;
    }
    setActionableTaxRate(row);
  };

  /**
   * Confirms and executes status change (activate/deactivate)
   * Updates local state immediately and refreshes data from server
   */
  const confirmStatusChange = async () => {
    if (!actionableTaxRate) return;

    const { id, _isActive } = actionableTaxRate;
    const endpoint = _isActive ? `/TaxRate/${id}/deactivate` : `/TaxRate/${id}/activate`;

    try {
      setLoading(true);
      await api.put(endpoint);
      showToast(`Tax rate ${_isActive ? "deactivated" : "activated"} successfully.`, "success" );

      const newActiveState = !_isActive;

      setTaxRates(prev =>
        prev.map(t =>
          t.id === id ? { ...t, isActive: newActiveState } : t
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
      showToast(err.response?.data?.message || "Failed to update status.", "error" );
    } finally {
      setLoading(false);
      setActionableTaxRate(null);
    }
  };

  /**
   * Handles successful tax rate creation or update
   * Refreshes data and reselects the modified tax rate
   */
  const handleSuccess = async (taxRateId) => {
    setShowAddModal(false);
    setShowEditModal(false);
    lastSelectedId.current = taxRateId;
    await fetchTaxRates();

    const updatedTaxRate = taxRates.find(t => t.id === taxRateId);
    if (updatedTaxRate) {
      setSelectedRow(toRow(updatedTaxRate));
    }
  };

  // === RENDER ===
  return (
    <div className="page-container">
      <Header user={currentUser} onLogout={() => { localStorage.clear(); window.location.href = "/"; }} />
      <main className="page-content">
        <BaseListPage
          title="Tax Rates"
          columns={columns}
          data={filteredAndSortedRows}
          loading={loading}
          error={error}
          selectedRow={selectedRow}
          onSelectRow={handleRowSelect}
          detailsData={selectedRow}
          detailsConfig={detailsConfig}
          onAdd={openCreateModal}
          disableAdd={!canAddEdit}
          onEdit={openEditModal}
          disableEdit={!selectedRow || !canAddEdit}
          onDelete={handleStatusToggle}
          disableDelete={!selectedRow || !canAddEdit}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSearchChange={handleSearchChange}
          searchValue={searchQuery}
          deleteButtonLabel={selectedRow?._isActive ? "Deactivate" : "Activate"}
          deleteButtonClass={selectedRow?._isActive ? "btn-confirm-negative" : "btn-confirm-positive"}
        />
      </main>

      <AddModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleSuccess}
      />

      <EditModal
        show={showEditModal}
        taxRate={selectedRow}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleSuccess}
      />

      <StatusConfirmDialog
        taxRate={actionableTaxRate}
        onConfirm={confirmStatusChange}
        onCancel={() => setActionableTaxRate(null)}
      />
    </div>
  );
}
