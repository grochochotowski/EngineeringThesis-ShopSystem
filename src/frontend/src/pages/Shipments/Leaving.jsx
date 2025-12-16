import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import MessageBox from "../../components/MessageBox";
import { shipmentStatusesData } from "../../data/shipmentStatuses";
import { userRolesData } from "../../data/userRoles";
import "../../styles/PagesStyles/shipments.css";

export default function LeavingShipments() {
  const [shipments, setShipments] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedShipmentDetails, setSelectedShipmentDetails] = useState(null);
  const [toast, setToast] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortColumn, setSortColumn] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    sendDateFrom: "",
    sendDateTo: "",
    deliveryDateFrom: "",
    deliveryDateTo: "",
  });

  const observerRef = useRef(null);
  const filtersRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const userRole = localStorage.getItem("userRole");
  const userRoleLevel = userRolesData.find(r => r.value === userRole)?.id || 0;

  // Helper: get role level by name
  const getRoleLevel = (roleName) => {
    return userRolesData.find(r => r.value === roleName)?.id || 0;
  };

  const isDeputyManagerOrHigher = userRoleLevel >= getRoleLevel("DeputyManager");
  const isManagerOrHigher = userRoleLevel >= getRoleLevel("Manager");

  // Fetch shipments data
  const fetchShipmentsData = async (page, currentFilters, currentSearchQuery, currentSortColumn, currentSortDirection) => {
    try {
      setLoading(true);
      const { items, totalPages } = await api.get("/Shipments", {
        params: {
          PageNumber: page,
          PageSize: 50,
          type: 2, // Outgoing/Leaving type
          ...(currentSearchQuery && { q: currentSearchQuery }),
          ...(currentFilters.status && { status: currentFilters.status }),
          ...(currentFilters.sendDateFrom && { sendDateFrom: currentFilters.sendDateFrom }),
          ...(currentFilters.sendDateTo && { sendDateTo: currentFilters.sendDateTo }),
          ...(currentFilters.deliveryDateFrom && { deliveryDateFrom: currentFilters.deliveryDateFrom }),
          ...(currentFilters.deliveryDateTo && { deliveryDateTo: currentFilters.deliveryDateTo }),
          ...(currentSortColumn && { orderBy: currentSortColumn }),
          ...(currentSortDirection && { sortDirection: currentSortDirection }),
        },
      });

      if (items?.length) {
        setShipments(items);
        setHasMore(page < (totalPages || 1));
      } else {
        setShipments([]);
        setHasMore(false);
      }
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error(err);
      setError("Failed to load shipments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection);
  }, []);

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      setShipments([]);
      setPageNumber(1);
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection);
    }, 1000);
    return () => clearTimeout(delay);
  }, [filters, searchQuery, sortColumn, sortDirection]);

  // Infinite scroll
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

  // Load next page
  useEffect(() => {
    if (pageNumber > 1) {
      fetchShipmentsData(pageNumber, filters, searchQuery, sortColumn, sortDirection);
    }
  }, [pageNumber]);

  // Close filters when clicking outside
  useEffect(() => {
    if (!showFilters) return;
    const handleClickOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showFilters]);

  // Format dates for display
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  // Get status label
  const getStatusLabel = (statusId) => {
    return shipmentStatusesData.find(s => s.id === statusId)?.value || "Unknown";
  };

  // Table columns (adjusted for outgoing shipments - receiver instead of sender)
  const columns = [
    { key: "to", label: "To", width: "25%", sortable: false },
    { key: "size", label: "Size", width: "15%", sortable: false },
    { key: "productCount", label: "No. of products", width: "15%", sortable: false },
    { key: "sendDate", label: "Send Date", width: "15%", sortable: true },
    { key: "deliveryDate", label: "Delivery Date", width: "15%", sortable: true },
    { key: "status", label: "Status", width: "15%", sortable: false },
  ];

  const rows = shipments.map((s) => ({
    id: s.id,
    to: `${s.receiverName || "Unknown"}${s.receiverTaxId ? ` (${s.receiverTaxId})` : ""}`,
    size: s.length && s.width && s.height ? `${s.length} x ${s.width} x ${s.height}` : "—",
    productCount: s.shipmentProducts?.length || 0,
    sendDate: formatDate(s.sendDate),
    deliveryDate: formatDate(s.deliveryDate),
    status: s.status,
    statusRaw: s.status,
  }));

  // Handle row selection
  const handleRowSelect = async (row) => {
    if (!row) {
      setSelectedRow(null);
      setSelectedShipmentDetails(null);
      return;
    }

    setSelectedRow(row);
    try {
      const full = await api.get(`/Shipments/${row.id}`);
      setSelectedShipmentDetails(full);
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to load shipment details.",
        type: "error",
      });
    }
  };

  // Handle status change
  const handleStatusChange = async (shipmentId, newStatus) => {
    try {
      await api.patch(`/Shipments/${shipmentId}/status`, { status: parseInt(newStatus) });

      // Refresh the shipment
      const updated = await api.get(`/Shipments/${shipmentId}`);
      setSelectedShipmentDetails(updated);

      // Update in list
      setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: parseInt(newStatus) } : s));

      setToast({
        message: "Status updated successfully!",
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to update status.",
        type: "error",
      });
    }
  };

  // Render status dropdown or text based on role and status
  const renderStatusCell = (row) => {
    const shipment = shipments.find(s => s.id === row.id);
    if (!shipment) return getStatusLabel(row.statusRaw);

    const currentStatus = shipment.status;
    const isDelivered = currentStatus === 5;

    // If delivered, only Manager+ can change
    if (isDelivered && !isManagerOrHigher) {
      return <span>{getStatusLabel(currentStatus)}</span>;
    }

    // Deputy Manager+ can change status
    if (!isDeputyManagerOrHigher) {
      return <span>{getStatusLabel(currentStatus)}</span>;
    }

    return (
      <select
        value={currentStatus}
        onChange={(e) => {
          e.stopPropagation();
          handleStatusChange(row.id, e.target.value);
        }}
        onClick={(e) => e.stopPropagation()}
        className="status-select"
      >
        {shipmentStatusesData.map(s => {
          // For users below Manager, only show higher statuses
          if (!isManagerOrHigher && s.id < currentStatus) {
            return null;
          }
          return <option key={s.id} value={s.id}>{s.value}</option>;
        })}
      </select>
    );
  };

  // Custom row renderer to include status dropdown
  const customRows = rows.map((row) => ({
    ...row,
    status: renderStatusCell(row),
  }));

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

  const detailsConfig = {
    fields: [
      { label: "ID", key: "id" },
      { label: "Type", key: "type", render: (data) => data.type === 1 ? "Incoming" : "Outgoing" },
      { label: "Status", key: "status", render: (data) => getStatusLabel(data.status) },
      { label: "Sender", key: "senderName" },
      { label: "Sender Tax ID", key: "senderTaxId" },
      { label: "Receiver", key: "receiverName" },
      { label: "Receiver Tax ID", key: "receiverTaxId" },
      { label: "Weight", key: "weight" },
      { label: "Dimensions", key: "dimensions", render: (data) =>
        data.length && data.width && data.height ? `${data.length} x ${data.width} x ${data.height}` : "—"
      },
      { label: "Send Date", key: "sendDate", render: (data) => formatDate(data.sendDate) },
      { label: "Delivery Date", key: "deliveryDate", render: (data) => formatDate(data.deliveryDate) },
      { label: "Description", key: "description", isColumn: true },
    ],
  };

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
          title="Leaving Shipments"
          columns={columns}
          data={customRows}
          loading={loading}
          error={error}
          selectedRow={selectedRow}
          onSelectRow={handleRowSelect}
          detailsData={selectedShipmentDetails}
          detailsConfig={detailsConfig}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onAdd={isDeputyManagerOrHigher ? () => {
            // TODO: Implement add shipment modal
            setToast({ message: "Add shipment - to be implemented", type: "info" });
          } : undefined}
          onEdit={isDeputyManagerOrHigher ? (row) => {
            // TODO: Implement edit shipment modal
            setToast({ message: "Edit shipment - to be implemented", type: "info" });
          } : undefined}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSearchChange={setSearchQuery}
          searchValue={searchQuery}
          hideDeleteButton={true}
          disableAdd={!isDeputyManagerOrHigher}
          disableEdit={!isDeputyManagerOrHigher || !selectedRow}
        />

        {/* Filters panel */}
        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>
            <select
              name="status"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              {shipmentStatusesData.map(s => (
                <option key={s.id} value={s.id}>{s.value}</option>
              ))}
            </select>
            <input
              type="date"
              name="sendDateFrom"
              placeholder="Send Date From"
              value={filters.sendDateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, sendDateFrom: e.target.value }))}
            />
            <input
              type="date"
              name="sendDateTo"
              placeholder="Send Date To"
              value={filters.sendDateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, sendDateTo: e.target.value }))}
            />
            <input
              type="date"
              name="deliveryDateFrom"
              placeholder="Delivery Date From"
              value={filters.deliveryDateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, deliveryDateFrom: e.target.value }))}
            />
            <input
              type="date"
              name="deliveryDateTo"
              placeholder="Delivery Date To"
              value={filters.deliveryDateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, deliveryDateTo: e.target.value }))}
            />
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={observerRef} style={{ height: "1px" }} />
      </main>

      {/* Toast messages */}
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
