import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import Modal from "../../components/Modal";
import ClientForm from "../../components/Forms/ClientForm";
import ConfirmDialog from "../../components/ConfirmDialog";
import MessageBox from "../../components/MessageBox";
import { clientTypesData } from "../../data/clientTypes";

const initialAddress = {
  country: "",
  city: "",
  street: "",
  building: "",
  premises: "",
  postalCode: "",
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState(null);

  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedClientDetails, setSelectedClientDetails] = useState(null);
  const [actionableClient, setActionableClient] = useState(null);
  const lastSelectedId = useRef(null);

  const [showClientModal, setShowClientModal] = useState(false);
  const [clientFormMode, setClientFormMode] = useState("create");
  const [formClientData, setFormClientData] = useState(null);
  const [formAddressData, setFormAddressData] = useState(initialAddress);

  // --- Filters ---
  const [filters, setFilters] = useState({
    type: "",
  });
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState("");

  const observerRef = useRef(null);
  const loadedPages = useRef(new Set());
  const filtersRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const sortKeyMap = useMemo(() => ({
    name: "name",
    email: "email",
  }), []);

  // === FETCH CLIENTS ===
  const fetchClients = useCallback(
    async (page = 1, reset = false) => {
      if (loadedPages.current.has(page) && !reset) return;
      loadedPages.current.add(page);

      try {
        setLoading(true);
        const mappedSort = sortKeyMap[sortColumn] || undefined;
        const { items = [], totalPages = 1 } = await api.get("/Clients", {
          params: {
            pageNumber: page,
            pageSize: 20,
            ...(searchQuery && { q: searchQuery }),
            ...(filters.type && { type: parseInt(filters.type, 10) }),
            ...(mappedSort && { orderBy: mappedSort }),
            ...(sortDirection && { sortDirection }),
          },
        });

        setClients((prev) =>
          page === 1 ? items : [...prev, ...items.filter((i) => !prev.some((p) => p.id === i.id))]
        );
        setHasMore(page < (totalPages || 1));

        if (page === 1 && items.length === 0) {
          setSelectedRow(null);
          setSelectedClientDetails(null);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load clients.");
      } finally {
        setLoading(false);
      }
    },
    [filters, searchQuery, sortColumn, sortDirection, sortKeyMap]
  );

  // === Initial load and subsequent filtering/sorting ===
  useEffect(() => {
    loadedPages.current.clear();
    setPageNumber(1);
    fetchClients(1, true);
  }, [filters, sortColumn, sortDirection, fetchClients]);

  // === Effect for debounced search ===
  useEffect(() => {
    if (searchQuery !== undefined) {
      const handler = setTimeout(() => {
        loadedPages.current.clear();
        setPageNumber(1);
        fetchClients(1, true);
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [searchQuery, fetchClients]);

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
    if (pageNumber > 1) fetchClients(pageNumber);
  }, [pageNumber, fetchClients]);

  // === Columns ===
  const columns = [
    { key: "id", label: "ID", width: "8%", sortable: false },
    { key: "name", label: "Name", width: "20%", sortable: true },
    { key: "email", label: "Email", width: "20%", sortable: true },
    { key: "phoneNumber", label: "Phone", width: "16%", sortable: false },
    { key: "type", label: "Type", width: "14%", sortable: false },
    { key: "isActiveLabel", label: "Active", width: "12%", sortable: false },
  ];

  const getClientTypeLabel = (typeValue) => {
    // Handle both integer (ID) and string (enum name) values
    if (typeof typeValue === 'number') {
      const typeData = clientTypesData.find((ct) => ct.id === typeValue);
      return typeData ? typeData.value : "Unknown";
    }
    // If it's a string (enum name from backend), find by value
    const typeData = clientTypesData.find((ct) => ct.value === typeValue);
    return typeData ? typeData.value : "Unknown";
  };

  const toRow = useCallback((c) => {
    const active = typeof c.isActive === "boolean" ? c.isActive : Boolean(c.isActive);

    return {
      id: c.id,
      name: c.name || "—",
      email: c.email || "—",
      phoneNumber: c.phoneNumber || "—",
      type: getClientTypeLabel(c.type),
      isActiveLabel: active ? "Yes" : "No",
      _rawType: c.type,
      _isActive: active,
      _address: c.address,
    };
  }, []);

  const rows = useMemo(() => clients.map(toRow), [clients, toRow]);

  // === Search change with debounce ===
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setSelectedRow(null);
    setSelectedClientDetails(null);
  };

  const handleSort = (column) => {
    if (!sortKeyMap[column]) return;

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

  // === Handle row selection to load full client details ===
  const handleRowSelect = useCallback(async (row) => {
    if (!row) {
      setSelectedRow(null);
      setSelectedClientDetails(null);
      lastSelectedId.current = null;
      return;
    }

    lastSelectedId.current = row.id;
    setSelectedRow(row);
    try {
      const full = await api.get(`/Clients/${row.id}`);
      setSelectedClientDetails(full);
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to load client details.",
        type: "error",
      });
    }
  }, []);

  const getClientDetailsConfig = (clientData) => {
    // Check if client is a Company (type === 1 or type === "Company")
    const isCompany = clientData
      ? typeof clientData.type === 'number'
        ? clientData.type === 1
        : clientData.type === "Company"
      : false;

    const baseFields = [
      { label: "Id", key: "id" },
      { label: "Name", key: "name" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phoneNumber" },
      {
        label: "Type",
        key: "type",
        render: (data) => getClientTypeLabel(data.type),
      },
    ];

    // Conditionally add Tax ID field for Company type
    if (isCompany) {
      baseFields.push({
        label: "Tax ID (NIP)",
        key: "taxId",
        render: (data) => data.taxId || "—",
      });
    }

    // Add Address field
    baseFields.push({
      label: "Address",
      key: "address",
      render: (data) => {
        if (!data?.address) return "—";
        const a = data.address;
        const parts = [];
        if (a.street) parts.push(a.street);
        if (a.building) parts.push(a.building);
        if (a.premises) parts.push(a.premises);
        if (a.postalCode) parts.push(a.postalCode);
        if (a.city) parts.push(a.city);
        if (a.country) parts.push(a.country);
        return parts.length > 0 ? parts.join(", ") : "—";
      },
    });

    return {
      status: {
        key: "isActive",
        activeLabel: "Active",
        inactiveLabel: "Inactive",
      },
      fields: baseFields,
    };
  };

  const clientDetailsConfig = getClientDetailsConfig(selectedClientDetails);

  // === Form helpers ===
  const openCreateModal = () => {
    setFormClientData(null);
    setFormAddressData(initialAddress);
    setClientFormMode("create");
    setShowClientModal(true);
  };

  const openEditModal = async (row) => {
    if (!row) return;

    try {
      setLoading(true);
      const full = await api.get(`/Clients/${row.id}`);
      let addressData = initialAddress;
      if (full?.address) {
        addressData = {
          country: full.address.country || "",
          city: full.address.city || "",
          street: full.address.street || "",
          building: full.address.building || "",
          premises: full.address.premises || "",
          postalCode: full.address.postalCode || "",
        };
      }
      setFormClientData({
        id: full.id,
        name: full.name,
        email: full.email,
        phoneNumber: full.phoneNumber,
        type: full.type,
      });
      setFormAddressData(addressData);
      setClientFormMode("edit");
      setShowClientModal(true);
      setSelectedClientDetails(full);
      lastSelectedId.current = row.id;
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to load full client details.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAndSelectClient = useCallback(
    async (clientId) => {
      if (!clientId) return;
      try {
        const full = await api.get(`/Clients/${clientId}`);
        const mappedRow = toRow(full);
        setSelectedRow(mappedRow);
        setSelectedClientDetails(full);
        lastSelectedId.current = clientId;

        // Ensure table shows latest data for that client
        setClients((prev) => {
          const without = prev.filter((c) => c.id !== clientId);
          return [full, ...without];
        });
      } catch (err) {
        console.error("Failed to reselect client", err);
      }
    },
    [toRow]
  );

  // === Activate / deactivate ===
  const handleStatusToggle = (row) => {
    if (!row) return;
    setActionableClient(row);
  };

  const confirmStatusChange = async () => {
    if (!actionableClient) return;
    try {
      setLoading(true);
      if (actionableClient._isActive) {
        await api.delete(`/Clients/${actionableClient.id}`);
        setToast({ message: "Client deactivated successfully.", type: "success" });
      } else {
        await api.put(`/Clients/${actionableClient.id}/activate`);
        setToast({ message: "Client activated successfully.", type: "success" });
      }

      setClients((prev) =>
        prev.map((c) =>
          c.id === actionableClient.id
            ? { ...c, isActive: !actionableClient._isActive }
            : c
        )
      );

      if (selectedRow && selectedRow.id === actionableClient.id) {
        const newActive = !actionableClient._isActive;
        setSelectedRow((prev) => prev ? { ...prev, _isActive: newActive, isActiveLabel: newActive ? "Yes" : "No" } : prev);
        setSelectedClientDetails((prev) => prev ? { ...prev, isActive: newActive } : prev);
      }

      // refresh list to keep pagination consistent
      loadedPages.current.clear();
      setPageNumber(1);
      fetchClients(1, true);
      lastSelectedId.current = actionableClient.id;
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to update client status.",
        type: "error",
      });
    } finally {
      setLoading(false);
      setActionableClient(null);
    }
  };

  // Reselect previously chosen row after data refresh
  useEffect(() => {
    if (!lastSelectedId.current || clients.length === 0) return;
    const target = clients.find((c) => c.id === lastSelectedId.current);
    if (!target) {
      setSelectedRow(null);
      setSelectedClientDetails(null);
      return;
    }
    if (selectedRow?.id === target.id && selectedClientDetails) return;
    handleRowSelect(toRow(target));
  }, [clients, selectedRow, selectedClientDetails, handleRowSelect, toRow]);

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
          title="Clients"
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          selectedRow={selectedRow}
          onSelectRow={handleRowSelect}
          detailsData={selectedClientDetails}
          detailsConfig={clientDetailsConfig}
          onAdd={openCreateModal}
          onEdit={openEditModal}
          onDelete={handleStatusToggle}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSearchChange={handleSearchChange}
          searchValue={searchQuery}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          deleteButtonLabel={
            !selectedRow || selectedRow._isActive ? "Deactivate" : "Activate"
          }
          deleteButtonClass={
            !selectedRow || selectedRow._isActive ? "btn-confirm-negative" : "btn-confirm-positive"
          }
          deleteButtonIcon={
            !selectedRow || selectedRow._isActive ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <path fill="none" stroke="currentColor" strokeWidth="2" d="M18 6L6 18M6 6l12 12"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <path fill="none" stroke="currentColor" strokeWidth="2" d="M20 6L9 17l-5-5"/>
              </svg>
            )
          }
        />

        {/* === Filter Panel === */}
        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              {clientTypesData.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.value}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={observerRef} style={{ height: "1px" }} />
        {loading && (
          <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>
        )}
      </main>

      {showClientModal && (
        <Modal
          title={clientFormMode === "create" ? "Create Client" : "Edit Client"}
          onClose={() => setShowClientModal(false)}
          wide
        >
          <ClientForm
            mode={clientFormMode}
            client={clientFormMode === "edit" ? formClientData : null}
            address={formAddressData}
            onSuccess={async (clientId) => {
              setShowClientModal(false);
              if (clientId) {
                lastSelectedId.current = clientId;
                await fetchAndSelectClient(clientId);
              }
              loadedPages.current.clear();
              setPageNumber(1);
              await fetchClients(1, true);
            }}
          />
        </Modal>
      )}

      {/* === CONFIRM DIALOG: Activate/Deactivate === */}
      {actionableClient && (
        <ConfirmDialog
          title={actionableClient._isActive ? "Deactivate Client" : "Activate Client"}
          message={
            actionableClient._isActive
              ? `Are you sure you want to deactivate "${actionableClient.name}"?`
              : `Are you sure you want to activate "${actionableClient.name}"?`
          }
          confirmText={actionableClient._isActive ? "Deactivate" : "Activate"}
          confirmButtonClass={
            actionableClient._isActive
              ? "dialog-btn-confirm-negative"
              : "dialog-btn-confirm-positive"
          }
          onConfirm={confirmStatusChange}
          onCancel={() => setActionableClient(null)}
        />
      )}

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
