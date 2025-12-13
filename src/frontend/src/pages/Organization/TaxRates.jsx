import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import Modal from "../../components/Modal";
import TaxRateForm from "../../components/Forms/TaxRateForm";
import ConfirmDialog from "../../components/ConfirmDialog";
import MessageBox from "../../components/MessageBox";

export default function TaxRates() {
  const [taxRates, setTaxRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [selectedRow, setSelectedRow] = useState(null);
  const [actionableTaxRate, setActionableTaxRate] = useState(null);
  const lastSelectedId = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [formMode, setFormMode] = useState("create");

  const [sortColumn, setSortColumn] = useState("code");
  const [sortDirection, setSortDirection] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user"));

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

  useEffect(() => {
    fetchTaxRates();
  }, [fetchTaxRates]);

  const columns = [
    { key: "id", label: "ID", width: "10%", sortable: false },
    { key: "code", label: "Code", width: "40%", sortable: true },
    { key: "rate", label: "Rate", width: "30%", sortable: true },
    { key: "isActive", label: "Active", width: "20%", sortable: true },
  ];

  const toRow = useCallback((t) => {
    const active = typeof t.isActive === "boolean" ? t.isActive : Boolean(t.isActive);
    return {
      ...t,
      _isActive: active,
      rate: `${(t.rate * 100).toFixed(0)}%`,
      isActive: active ? "Yes" : "No",
    };
  }, []);

  const filteredAndSortedRows = useMemo(() => {
    let filtered = taxRates.map(toRow);

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((row) =>
        row.code?.toLowerCase().includes(query) ||
        row.rate?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];

        // Handle special case for rate (remove % sign for numeric comparison)
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

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setSelectedRow(null);
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
    setActionableTaxRate(row);
  };

  const confirmStatusChange = async () => {
    if (!actionableTaxRate) return;

    const { id, _isActive } = actionableTaxRate;
    const endpoint = _isActive ? `/TaxRate/${id}/deactivate` : `/TaxRate/${id}/activate`;

    try {
      setLoading(true);
      await api.put(endpoint);
      setToast({ message: `Tax rate ${_isActive ? "deactivated" : "activated"} successfully.`, type: "success" });

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
      setToast({ message: err.response?.data?.message || "Failed to update status.", type: "error" });
    } finally {
      setLoading(false);
      setActionableTaxRate(null);
    }
  };

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
          onEdit={openEditModal}
          onDelete={handleStatusToggle}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSearchChange={handleSearchChange}
          searchValue={searchQuery}
          deleteButtonLabel={selectedRow?._isActive ? "Deactivate" : "Activate"}
          deleteButtonClass={selectedRow?._isActive ? "btn-confirm-negative" : "btn-confirm-positive"}
        />
      </main>

      {showModal && (
        <Modal title={formMode === "create" ? "Create Tax Rate" : "Edit Tax Rate"} onClose={() => setShowModal(false)}>
          <TaxRateForm
            mode={formMode}
            taxRate={formMode === "edit" ? selectedRow : null}
            onSuccess={async (taxRateId) => {
              setShowModal(false);
              lastSelectedId.current = taxRateId;
              await fetchTaxRates();

              // Find and select the newly created/updated tax rate
              const updatedTaxRate = taxRates.find(t => t.id === taxRateId);
              if (updatedTaxRate) {
                setSelectedRow(toRow(updatedTaxRate));
              }
            }}
          />
        </Modal>
      )}

      {actionableTaxRate && (
        <ConfirmDialog
          title={actionableTaxRate._isActive ? "Deactivate Tax Rate" : "Activate Tax Rate"}
          message={`Are you sure you want to ${actionableTaxRate._isActive ? "deactivate" : "activate"} "${actionableTaxRate.code}"?`}
          confirmText={actionableTaxRate._isActive ? "Deactivate" : "Activate"}
          confirmButtonClass={actionableTaxRate._isActive ? "dialog-btn-confirm-negative" : "dialog-btn-confirm-positive"}
          onConfirm={confirmStatusChange}
          onCancel={() => setActionableTaxRate(null)}
        />
      )}

      {toast && (
        <MessageBox message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} className="centered" />
      )}
    </div>
  );
}
