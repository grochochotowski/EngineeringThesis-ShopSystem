// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../../api/apiClient";
import Header from "../../../components/Header";
import BaseListPage from "../../BaseListPage";
import ClientFormModal from "../../../components/Forms/ClientFormModal";
import StatusConfirmDialog from "./Modals/StatusConfirmDialog";
import MessageBox from "../../../components/MessageBox";
import { clientTypesData } from "../../../data/clientTypes";

// === CONSTANTS ===
const initialAddress = {
  country: "",
  city: "",
  street: "",
  building: "",
  premises: "",
  postalCode: "",
};

// === COMPONENT ===
/**
 * Clients page - manages client/customer data with CRUD operations
 * Uses BaseListPage for consistent list UI with infinite scroll, sorting, and filtering
 * Supports creating, editing, and activating/deactivating clients
 * Handles both Individual and Company client types with conditional Tax ID field
 */
export default function Clients() {
  // === STATE ===
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

  const [filters, setFilters] = useState({
    type: "",
  });
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const observerRef = useRef(null);
  const loadedPages = useRef(new Set());
  const filtersRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const sortKeyMap = useMemo(() => ({
    name: "name",
    email: "email",
  }), []);

  // === DATA FETCHING ===
  /**
   * Fetches clients with pagination, filtering, and sorting
   * Uses loadedPages ref to prevent duplicate requests
   * @param {number} page - Page number to fetch
   * @param {boolean} reset - If true, clears cache and fetches from page 1
   */
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

  /**
   * Fetches and selects a specific client by ID
   * Updates both table row and details panel with latest data
   */
  const fetchAndSelectClient = useCallback(
    async (clientId) => {
      if (!clientId) return;
      try {
        const full = await api.get(`/Clients/${clientId}`);
        const mappedRow = toRow(full);
        setSelectedRow(mappedRow);
        setSelectedClientDetails(full);
        lastSelectedId.current = clientId;

        setClients((prev) => {
          const without = prev.filter((c) => c.id !== clientId);
          return [full, ...without];
        });
      } catch (err) {
        console.error("Failed to reselect client", err);
      }
    },
    []
  );

  // === EFFECTS ===
  /**
   * Initial load and immediate fetch when filters/sorting change
   */
  useEffect(() => {
    loadedPages.current.clear();
    setPageNumber(1);
    fetchClients(1, true);
  }, [filters, sortColumn, sortDirection, fetchClients]);

  /**
   * Debounced search effect
   */
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

  /**
   * Infinite scroll observer
   */
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

  /**
   * Load next page when pageNumber changes
   */
  useEffect(() => {
    if (pageNumber > 1) fetchClients(pageNumber);
  }, [pageNumber, fetchClients]);

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

  /**
   * Reselect previously chosen row after data refresh
   */
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
  }, [clients, selectedRow, selectedClientDetails]);

  // === TABLE CONFIGURATION ===
  const columns = [
    { key: "id", label: "ID", width: "8%", sortable: false },
    { key: "name", label: "Name", width: "20%", sortable: true },
    { key: "email", label: "Email", width: "20%", sortable: true },
    { key: "phoneNumber", label: "Phone", width: "16%", sortable: false },
    { key: "type", label: "Type", width: "14%", sortable: false },
    { key: "isActiveLabel", label: "Active", width: "12%", sortable: false },
  ];

  /**
   * Gets client type label from enum value
   * Handles both integer IDs and string enum names
   */
  const getClientTypeLabel = (typeValue) => {
    if (typeof typeValue === 'number') {
      const typeData = clientTypesData.find((ct) => ct.id === typeValue);
      return typeData ? typeData.value : "Unknown";
    }
    const typeData = clientTypesData.find((ct) => ct.value === typeValue);
    return typeData ? typeData.value : "Unknown";
  };

  /**
   * Transforms client data to table row format
   */
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

  /**
   * Generates details config based on client type
   * Shows Tax ID field only for Company type clients
   */
  const getClientDetailsConfig = (clientData) => {
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

    if (isCompany) {
      baseFields.push({
        label: "Tax ID",
        key: "taxId",
        render: (data) => data.taxId || "—",
      });
    }

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

  // === EVENT HANDLERS ===
  /**
   * Handles column header clicks for sorting
   */
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

  /**
   * Handles search input changes with debounce
   */
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setSelectedRow(null);
    setSelectedClientDetails(null);
  };

  /**
   * Handles filter dropdown changes
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handles row selection and loads full client details
   */
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

  /**
   * Opens create client modal
   */
  const openCreateModal = () => {
    setFormClientData(null);
    setFormAddressData(initialAddress);
    setClientFormMode("create");
    setShowClientModal(true);
  };

  /**
   * Opens edit client modal and loads full client data
   */
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
        taxId: full.taxId,
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

  /**
   * Opens confirmation dialog for status toggle
   */
  const handleStatusToggle = (row) => {
    if (!row) return;
    setActionableClient(row);
  };

  /**
   * Confirms and executes status change (activate/deactivate)
   */
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

  /**
   * Handles client creation or update success
   * Refreshes data and reselects the client
   */
  const handleClientSuccess = async (clientId) => {
    if (clientId) {
      lastSelectedId.current = clientId;
      await fetchAndSelectClient(clientId);
    }
    loadedPages.current.clear();
    setPageNumber(1);
    await fetchClients(1, true);
  };

  // === RENDER ===
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

        <div ref={observerRef} style={{ height: "1px" }} />
        {loading && (
          <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>
        )}
      </main>

      <ClientFormModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        mode={clientFormMode}
        client={clientFormMode === "edit" ? formClientData : null}
        address={formAddressData}
        onClientCreated={handleClientSuccess}
      />

      <StatusConfirmDialog
        client={actionableClient}
        onConfirm={confirmStatusChange}
        onCancel={() => setActionableClient(null)}
      />

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
