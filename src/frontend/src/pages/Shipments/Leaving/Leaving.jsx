// === IMPORTS ===
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { api } from "../../../api/apiClient";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import BaseListPage from "../../BaseListPage";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { useToast } from "../../../components/ToastContext";
import { shipmentStatusesData } from "../../../data/shipmentStatuses";
import { userRolesData } from "../../../data/userRoles";
import { getValidStatusOptions } from "../../../utils/shipmentStatusUtils";
import AddEditModal from "./Modals/AddEditModal";
import PrepareModal from "./Modals/PrepareModal";
import ViewProductsModal from "./Modals/ViewProductsModal";
import "../../../styles/PagesStyles/shipments.css";

// === ROLE HELPER FUNCTIONS ===
const ROLE_HIERARCHY = ["Marketer", "ItTechnician", "ShopAssistant", "DeputyManager", "Manager", "CEO", "Admin", "Root"];
const getRoleLevel = (role) => ROLE_HIERARCHY.indexOf(role);
const isDeputyManagerOrAbove = (role) => getRoleLevel(role) >= getRoleLevel("DeputyManager");

// === COMPONENT ===
/**
 * LeavingShipments page - Manage outgoing shipments from warehouse
 *
 * This page handles the complete leaving/outgoing shipment workflow:
 * - Create new outgoing shipments with client/destination information
 * - Edit shipment details before preparation
 * - Preparation workflow with product collection and location tracking
 * - View shipment products and preparation summaries
 * - Status management with role-based permissions
 *
 * Key Features:
 * - Product selection with warehouse stock validation
 * - Multi-location source tracking (where products are taken from)
 * - Preparation workflow validates sufficient stock at locations
 * - Automatic inventory deduction upon shipment completion
 * - Role-based status change permissions (DeputyManager+)
 * - Client and server-side sorting
 * - Advanced filtering (dates, statuses, search)
 *
 * Preparation Workflow:
 * 1. Click "Prepare" on a shipment (status must be InPreparation)
 * 2. System loads products with warehouse locations
 * 3. User selects source locations and quantities for each product
 * 4. System validates sufficient stock at selected locations
 * 5. Finish preparation to deduct inventory and mark as Ready
 *
 * @returns {JSX.Element} The leaving shipments management page
 */
export default function LeavingShipments() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // === STATE ===
  const [shipments, setShipments] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedShipmentDetails, setSelectedShipmentDetails] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortColumn, setSortColumn] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  // Modal visibility states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [showViewProductsModal, setShowViewProductsModal] = useState(false);

  // Search and filters - Default: active statuses (excluding Delivered, Cancelled, Returned)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState([0, 1, 2, 3]); // Exclude 4 (Delivered), 6 (Cancelled), 7 (Returned)
  const [filters, setFilters] = useState({
    sendDateFrom: "",
    sendDateTo: "",
    deliveryDateFrom: "",
    deliveryDateTo: "",
  });

  // Locations for preparation
  const [locations, setLocations] = useState([]);

  const observerRef = useRef(null);
  const filtersRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const userRole = user?.role;
  const userRoleLevel = userRolesData.find(r => r.value === userRole)?.id || 0;

  // Helper: get role level by name (legacy function for compatibility)
  const getRoleLevelById = (roleName) => {
    return userRolesData.find(r => r.value === roleName)?.id || 0;
  };

  // Check if user can change shipment status (DeputyManager and above = level 4+)
  const deputyManagerLevel = getRoleLevelById("DeputyManager");
  const canChangeShipmentStatus = userRoleLevel >= deputyManagerLevel;

  // Permission check: only DeputyManager and above can access this page
  const canAccessPage = isDeputyManagerOrAbove(userRole);

  // State for status change confirmation
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  // Table columns - ID, To, Size, Total Qty, Send Date, Status
  const columns = [
    { key: "id", label: "ID", width: "8%", sortable: true, sortKey: "id" },
    { key: "receiverName", label: "To", width: "22%", sortable: true, sortKey: "receivername" },
    { key: "volume", label: "Size", width: "13%", sortable: true, clientSort: true }, // Client-side sort only
    { key: "totalQuantity", label: "Total Qty", width: "12%", sortable: true, clientSort: true }, // Client-side sort only
    { key: "sendDate", label: "Send Date", width: "13%", sortable: true, sortKey: "senddate" },
    { key: "status", label: "Status", width: "13%", sortable: true, sortKey: "status" },
  ];

  // Fetch shipments data
  const fetchShipmentsData = async (page, currentFilters, currentSearchQuery, currentSortColumn, currentSortDirection, currentSelectedStatuses) => {
    try {
      setLoading(true);

      // Check if the column is client-side sorted
      const columnDef = columns.find(c => c.key === currentSortColumn);
      const isClientSort = columnDef?.clientSort === true;

      // Translate frontend column key to backend sort key (skip if client-side sort)
      const backendSortKey = !isClientSort && currentSortColumn
        ? columnDef?.sortKey || currentSortColumn
        : null;

      // Build params object with multiple statuses
      const params = {
        PageNumber: page,
        PageSize: 50,
        type: 2, // Outgoing/Leaving type
        ...(currentSearchQuery && { q: currentSearchQuery }),
        ...(currentFilters.sendDateFrom && { sendDateFrom: currentFilters.sendDateFrom }),
        ...(currentFilters.sendDateTo && { sendDateTo: currentFilters.sendDateTo }),
        ...(currentFilters.deliveryDateFrom && { deliveryDateFrom: currentFilters.deliveryDateFrom }),
        ...(currentFilters.deliveryDateTo && { deliveryDateTo: currentFilters.deliveryDateTo }),
        ...(backendSortKey && { orderBy: backendSortKey }),
        ...(backendSortKey && currentSortDirection && { sortDirection: currentSortDirection }),
      };

      // Add multiple status parameters if any are selected
      if (currentSelectedStatuses && currentSelectedStatuses.length > 0) {
        currentSelectedStatuses.forEach(statusId => {
          if (!params.statuses) {
            params.statuses = [];
          }
          params.statuses.push(statusId);
        });
      }

      const { items, totalPages } = await api.get("/Shipments", { params });

      if (items?.length) {
        // Apply client-side sorting if needed
        let sortedItems = items;
        if (isClientSort && currentSortColumn && currentSortDirection) {
          sortedItems = [...items].sort((a, b) => {
            let aValue, bValue;

            // For volume column, calculate volume from dimensions
            if (currentSortColumn === 'volume') {
              aValue = (a.length && a.width && a.height)
                ? a.length * a.width * a.height
                : 0;
              bValue = (b.length && b.width && b.height)
                ? b.length * b.width * b.height
                : 0;
            } else {
              aValue = a[currentSortColumn];
              bValue = b[currentSortColumn];

              // Handle null/undefined values
              if (aValue == null) aValue = 0;
              if (bValue == null) bValue = 0;

              // For totalQuantity, ensure numeric comparison
              if (currentSortColumn === 'totalQuantity') {
                aValue = Number(aValue) || 0;
                bValue = Number(bValue) || 0;
              }
            }

            if (currentSortDirection === 'asc') {
              return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
              return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
          });
        }

        setShipments(sortedItems);
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

  // Fetch locations for preparation
  const fetchLocations = async () => {
    try {
      const response = await api.get("/location", {
        params: {
          pageNumber: 1,
          pageSize: 1000, // Get all locations for dropdown
        },
      });
      setLocations(response.items || []);
    } catch (err) {
      console.error("Failed to fetch locations", err);
    }
  };

  // Redirect if user doesn't have access
  useEffect(() => {
    if (!canAccessPage) {
      navigate("/403");
    }
  }, [canAccessPage, navigate]);

  useEffect(() => {
    if (!canAccessPage) return; // Don't fetch if no access
    fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Instant update for sorting and filtering (no delay)
  useEffect(() => {
    setShipments([]);
    setPageNumber(1);
    fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortColumn, sortDirection, selectedStatuses]);

  // Debounced search (500ms delay for text input)
  useEffect(() => {
    const delay = setTimeout(() => {
      setShipments([]);
      setPageNumber(1);
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
    }, 500);
    return () => clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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
      fetchShipmentsData(pageNumber, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  };

  // Get status label
  const getStatusLabel = (statusId) => {
    return shipmentStatusesData.find(s => s.id === statusId)?.value || "Unknown";
  };

  // Helper to get status badge class
  const getStatusBadgeClass = (statusId) => {
    switch (statusId) {
      case 0: return "badge-unspecified"; // gray
      case 1: return "badge-in-preparation"; // blue
      case 2: return "badge-ready-to-collect"; // yellow
      case 3: return "badge-in-transit"; // purple
      case 4: return "badge-delivered"; // green
      case 6: return "badge-cancelled"; // red
      case 7: return "badge-returned"; // brown
      default: return "badge-unspecified";
    }
  };

  const rows = shipments.map((s) => {
    // Calculate volume (length × width × height) in cm³
    // Dimensions are in cm, so volume = length × width × height (no conversion needed)
    const volumeCalc = s.length && s.width && s.height
      ? s.length * s.width * s.height
      : 0;

    return {
      id: s.id,
      receiverName: `${s.receiverName || "Unknown"}${s.receiverTaxId ? ` (${s.receiverTaxId})` : ""}`,
      volume: s.length && s.width && s.height
        ? `${s.length} x ${s.width} x ${s.height} (${volumeCalc.toLocaleString()} cm³)`
        : "—",
      volumeValue: volumeCalc, // Store numeric value for sorting
      totalQuantity: s.totalQuantity || 0,
      sendDate: formatDate(s.sendDate),
      status: s.status,
      statusRaw: s.status,
    };
  });

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
      showToast(err.response?.data?.message || "Failed to load shipment details.", "error",
      );
    }
  };

  // Handle status change request
  const handleStatusChangeRequest = (shipmentId, newStatus) => {
    const statusLabel = getStatusLabel(parseInt(newStatus));
    setPendingStatusChange({
      shipmentId,
      newStatus: parseInt(newStatus),
      statusLabel,
    });
  };

  // Execute status change after confirmation
  const executeStatusChange = async () => {
    if (!pendingStatusChange) return;

    const { shipmentId, newStatus } = pendingStatusChange;

    try {
      await api.patch(`/Shipments/${shipmentId}/status`, { status: newStatus });

      // Refresh the shipment details
      const updated = await api.get(`/Shipments/${shipmentId}`);
      setSelectedShipmentDetails(updated);

      // Update in list
      setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: newStatus } : s));

      // Reload the main list
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);

      showToast("Status updated successfully!", "success",
      );
    } catch (err) {
      console.error(err);

      if (err.response?.status === 409) {
        showToast(err.response?.data?.message || err.response?.data || "Conflict: Cannot change to this status.", "error",
        );
      } else {
        showToast(err.response?.data?.message || err.response?.data || "Failed to update status.", "error",
        );
      }
    } finally {
      setPendingStatusChange(null);
    }
  };

  // Render status cell with select dropdown for status changes (DeputyManager and above)
  const renderStatusCell = (row) => {
    const shipment = shipments.find(s => s.id === row.id);
    if (!shipment) return getStatusLabel(row.statusRaw);

    const currentStatus = shipment.status;

    // For users with DeputyManager role and above (level 4+), show select dropdown
    if (canChangeShipmentStatus) {
      // Get valid status options based on current status and shipment type (2 = Outgoing)
      const validStatuses = getValidStatusOptions(currentStatus, 2, shipmentStatusesData);

      return (
        <select
          value={currentStatus}
          onChange={(e) => {
            e.stopPropagation();
            const newStatus = parseInt(e.target.value);
            // Only trigger if actually changed
            if (newStatus !== currentStatus) {
              handleStatusChangeRequest(row.id, newStatus);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="status-select"
        >
          {validStatuses.map(status => (
            <option key={status.id} value={status.id}>
              {status.value}
            </option>
          ))}
        </select>
      );
    }

    // For lower roles: show badge only (read-only)
    return (
      <div className={`badge ${getStatusBadgeClass(currentStatus)}`}>
        {getStatusLabel(currentStatus)}
      </div>
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

  // Handle status checkbox toggle
  const handleStatusToggle = (statusId, checked) => {
    if (checked) {
      setSelectedStatuses(prev => [...prev, statusId]);
    } else {
      setSelectedStatuses(prev => prev.filter(id => id !== statusId));
    }
  };

  const detailsConfig = {
    status: {
      key: "status",
      render: (data) => (
        <div className={`badge ${getStatusBadgeClass(data.status)}`}>
          {getStatusLabel(data.status)}
        </div>
      ),
    },
    fields: [
      { label: "ID", key: "id" },
      { label: "Receiver Name", key: "receiverName" },
      { label: "Receiver Tax ID", key: "receiverTaxId" },
      { label: "Receiver Address", key: "receiverAddress", render: (data) => {
        if (!data.receiverAddress) return "—";
        const addr = data.receiverAddress;
        const countryName = addr.country || addr.Country || "Unknown";
        return `${addr.street} ${addr.building}${addr.premises ? `/${addr.premises}` : ""}, ${addr.postalCode} ${addr.city}, ${countryName}`;
      }},
      { label: "Sender Name", key: "senderName" },
      { label: "Sender Tax ID", key: "senderTaxId" },
      { label: "Sender Details", key: "senderDetails" },
      { label: "Weight (kg)", key: "weight", render: (data) => data.weight ? `${data.weight} kg` : "—" },
      { label: "Dimensions (cm)", key: "dimensions", render: (data) =>
        data.length && data.width && data.height ? `${data.length} x ${data.width} x ${data.height}` : "—"
      },
      { label: "Send Date", key: "sendDate", render: (data) => formatDate(data.sendDate) },
      { label: "Delivery Date", key: "deliveryDate", render: (data) => formatDate(data.deliveryDate) },
      { label: "Description", key: "description", isColumn: true },
    ],
    hideActions: true,
  };

  // Handle Add Shipment
  const handleOpenAddModal = () => {
    setShowAddModal(true);
  };

  // Handle Edit Shipment
  const handleOpenEditModal = () => {
    if (!selectedRow) {
      showToast("Please select a shipment to edit.", "error",
      );
      return;
    }
    // Check if shipment is locked (status >= AwaitingPickup)
    if (selectedRow.statusRaw >= 2) {
      showToast("Cannot edit shipment that is awaiting pickup or later", "warning",
      );
      return;
    }
    setShowEditModal(true);
  };

  // Handle Prepare Shipment
  const handleStartPreparation = () => {
    if (!selectedRow) {
      showToast("Please select a shipment to prepare.", "error",
      );
      return;
    }
    // Check if shipment is locked
    if (selectedRow.statusRaw >= 2) {
      showToast("Cannot prepare shipment that is awaiting pickup or later", "warning",
      );
      return;
    }
    setShowPrepareModal(true);
  };

  // Handle View Products
  const handleViewProducts = () => {
    if (!selectedRow) {
      showToast("Please select a shipment to view products.", "error",
      );
      return;
    }
    setShowViewProductsModal(true);
  };

  // Handle shipment saved callback
  const handleShipmentSaved = () => {
    fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
    if (selectedRow) {
      handleRowSelect(selectedRow);
    }
  };

  // Handle preparation completed callback
  const handlePreparationCompleted = () => {
    fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedStatuses);
    if (selectedRow) {
      // Update selected row status locally to "Awaiting Pickup" (2) to disable Prepare button immediately
      const updatedRow = { ...selectedRow, statusRaw: 2, status: "Awaiting Pickup" }; // Assuming 2 is Awaiting Pickup
      setSelectedRow(updatedRow);
      handleRowSelect(updatedRow);
    }
  };

  // Don't render anything if no access (will redirect)
  if (!canAccessPage) {
    return null;
  }

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
          onAdd={handleOpenAddModal}
          onEdit={handleOpenEditModal}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSearchChange={setSearchQuery}
          searchValue={searchQuery}
          hideDeleteButton={true}
          disableAdd={false}
          disableEdit={!selectedRow || (selectedRow && selectedRow.statusRaw >= 2)}
          changePasswordButtonLabel="Prepare"
          changePasswordButtonClass="btn-go-to"
          changePasswordDisabled={!selectedRow || selectedRow.statusRaw >= 2}
          onChangePassword={handleStartPreparation}
          changePasswordButtonIcon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          }
          changeLoginButtonLabel="View Products"
          changeLoginButtonClass="btn-view"
          changeLoginDisabled={!selectedRow}
          onChangeLogin={handleViewProducts}
          changeLoginButtonIcon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 4h4m-4 3h4m-4 3h4"/>
            </svg>
          }
          observerRef={observerRef}
        />

        {/* Filters panel */}
        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>
            <div className="filter-group">
              <label>Filter by Status:</label>
              <div className="status-checkbox-group">
                {shipmentStatusesData
                  .filter(s => s.id !== 0 && s.id !== 5) // Exclude Unspecified and Collected
                  .map(s => (
                    <label key={s.id} className="status-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(s.id)}
                        onChange={(e) => handleStatusToggle(s.id, e.target.checked)}
                      />
                      <span>{s.value}</span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="filter-group">
              <label>Send Date From:</label>
              <input
                type="date"
                value={filters.sendDateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, sendDateFrom: e.target.value }))}
              />
            </div>

            <div className="filter-group">
              <label>Send Date To:</label>
              <input
                type="date"
                value={filters.sendDateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, sendDateTo: e.target.value }))}
              />
            </div>

            <div className="filter-group">
              <label>Delivery Date From:</label>
              <input
                type="date"
                value={filters.deliveryDateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, deliveryDateFrom: e.target.value }))}
              />
            </div>

            <div className="filter-group">
              <label>Delivery Date To:</label>
              <input
                type="date"
                value={filters.deliveryDateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, deliveryDateTo: e.target.value }))}
              />
            </div>
          </div>
        )}
      </main>

      {/* Add Shipment Modal */}
      {showAddModal && (
        <AddEditModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleShipmentSaved}
          mode="add"
        />
      )}

      {/* Edit Shipment Modal */}
      {showEditModal && selectedRow && (
        <AddEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleShipmentSaved}
          mode="edit"
          shipment={selectedRow}
          shipmentDetails={selectedShipmentDetails}
        />
      )}

      {/* Prepare Shipment Modal */}
      {showPrepareModal && selectedRow && (
        <PrepareModal
          isOpen={showPrepareModal}
          onClose={() => setShowPrepareModal(false)}
          onComplete={handlePreparationCompleted}
          shipment={selectedRow}
          locations={locations}
        />
      )}

      {/* View Products Modal */}
      {showViewProductsModal && selectedRow && (
        <ViewProductsModal
          isOpen={showViewProductsModal}
          onClose={() => setShowViewProductsModal(false)}
          shipmentId={selectedRow.id}
        />
      )}

      {/* Confirm Status Change Dialog */}
      {pendingStatusChange && (
        <ConfirmDialog
          title="Confirm Status Change"
          message={`Are you sure you want to change status to ${pendingStatusChange.statusLabel}?`}
          confirmText="Confirm"
          confirmButtonClass="dialog-btn-confirm-positive"
          onConfirm={executeStatusChange}
          onCancel={() => setPendingStatusChange(null)}
        />
      )}

      {/* Toast messages */}
    </div>
  );
}
