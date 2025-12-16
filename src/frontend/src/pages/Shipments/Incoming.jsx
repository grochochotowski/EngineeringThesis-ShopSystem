import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import MessageBox from "../../components/MessageBox";
import { shipmentStatusesData } from "../../data/shipmentStatuses";
import { userRolesData } from "../../data/userRoles";
import "../../styles/PagesStyles/shipments.css";

export default function IncomingShipments() {
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
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    sendDateFrom: "",
    sendDateTo: "",
    deliveryDateFrom: "",
    deliveryDateTo: "",
  });

  // Collection workflow state
  const [collectedProducts, setCollectedProducts] = useState([]);
  const [locationAssignments, setLocationAssignments] = useState({});
  const [scanInput, setScanInput] = useState("");
  const [locations, setLocations] = useState([]);

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
          type: 1, // Incoming type
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

  // Fetch locations for collection
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

  useEffect(() => {
    fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection);
    fetchLocations();
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

  // Table columns
  const columns = [
    { key: "from", label: "From", width: "25%", sortable: false },
    { key: "size", label: "Size", width: "15%", sortable: false },
    { key: "productCount", label: "No. of products", width: "15%", sortable: false },
    { key: "sendDate", label: "Send Date", width: "15%", sortable: true },
    { key: "deliveryDate", label: "Delivery Date", width: "15%", sortable: true },
    { key: "status", label: "Status", width: "15%", sortable: false },
  ];

  const rows = shipments.map((s) => ({
    id: s.id,
    from: `${s.senderName || "Unknown"}${s.senderTaxId ? ` (${s.senderTaxId})` : ""}`,
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

  // Start collection workflow
  const handleStartCollection = () => {
    if (!selectedShipmentDetails || selectedShipmentDetails.status !== 5) {
      setToast({
        message: "Only delivered shipments can be collected.",
        type: "error",
      });
      return;
    }

    // Initialize collected products with shipment quantities
    const initialCollected = selectedShipmentDetails.shipmentProducts.map(sp => ({
      productId: sp.productId,
      productSKU: sp.productSKU,
      productName: sp.productName,
      shipmentQuantity: sp.quantity,
      collectedQuantity: 0,
      warehouseQuantity: 0, // Will be fetched
      locationId: null,
    }));

    setCollectedProducts(initialCollected);
    setLocationAssignments({});
    setShowCollectModal(true);

    // Fetch warehouse quantities
    fetchWarehouseQuantities(initialCollected);
  };

  // Fetch current warehouse quantities
  const fetchWarehouseQuantities = async (products) => {
    try {
      for (const product of products) {
        const warehouseData = await api.get(`/ProductsInWarehouse/product/${product.productId}`);
        const totalQty = warehouseData.reduce((sum, w) => sum + w.quantity, 0);

        setCollectedProducts(prev => prev.map(p =>
          p.productId === product.productId ? { ...p, warehouseQuantity: totalQty } : p
        ));
      }
    } catch (err) {
      console.error("Failed to fetch warehouse quantities", err);
    }
  };

  // Handle scan input (SKU/name search)
  const handleScanApply = () => {
    if (!scanInput.trim()) return;

    const term = scanInput.trim().toLowerCase();
    const matchedProduct = collectedProducts.find(p =>
      p.productSKU.toLowerCase().includes(term) || p.productName.toLowerCase().includes(term)
    );

    if (matchedProduct) {
      handleCollectedChange(matchedProduct.productId, matchedProduct.collectedQuantity + 1);
      setScanInput("");
    } else {
      setToast({
        message: "Product not found in shipment",
        type: "error",
      });
    }
  };

  // Handle manual quantity change
  const handleCollectedChange = (productId, newQuantity) => {
    const product = collectedProducts.find(p => p.productId === productId);
    if (!product) return;

    const oldQuantity = product.collectedQuantity;
    const difference = newQuantity - oldQuantity;

    if (difference > 0) {
      // Ask for location assignment for added products
      setLocationAssignments(prev => ({
        ...prev,
        [productId]: prev[productId] || null,
      }));
    }

    setCollectedProducts(prev => prev.map(p =>
      p.productId === productId ? { ...p, collectedQuantity: newQuantity } : p
    ));
  };

  // Handle location assignment
  const handleLocationChange = (productId, locationId) => {
    setLocationAssignments(prev => ({
      ...prev,
      [productId]: locationId,
    }));
  };

  // Finish collection
  const handleFinishCollection = async () => {
    // Validate all collected
    const incomplete = collectedProducts.filter(p => p.collectedQuantity !== p.shipmentQuantity);
    if (incomplete.length > 0) {
      setToast({
        message: "Some products are not fully collected. Please verify quantities.",
        type: "error",
      });
      return;
    }

    // Validate all have locations
    for (const product of collectedProducts) {
      if (product.collectedQuantity > 0 && !locationAssignments[product.productId]) {
        setToast({
          message: `Please assign a location for ${product.productName}`,
          type: "error",
        });
        return;
      }
    }

    setShowConfirmFinish(true);
  };

  // Confirm and execute collection
  const executeCollection = async () => {
    try {
      setLoading(true);

      // Add products to warehouse locations
      for (const product of collectedProducts) {
        if (product.collectedQuantity > 0) {
          await api.post("/ProductsInWarehouse", {
            productId: product.productId,
            locationId: locationAssignments[product.productId],
            quantity: product.collectedQuantity,
          });
        }
      }

      // Update shipment status to "Collected" (status 3)
      await api.patch(`/Shipments/${selectedShipmentDetails.id}/status`, { status: 3 });

      setToast({
        message: "Collection completed successfully!",
        type: "success",
      });

      setShowCollectModal(false);
      setShowConfirmFinish(false);

      // Refresh the shipment list
      fetchShipmentsData(1, filters, searchQuery, sortColumn, sortDirection);
      setSelectedRow(null);
      setSelectedShipmentDetails(null);
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to complete collection.",
        type: "error",
      });
    } finally {
      setLoading(false);
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
          title="Incoming Shipments"
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
          onAdd={() => {
            // TODO: Implement add shipment modal
            setToast({ message: "Add shipment - to be implemented", type: "info" });
          }}
          onEdit={(row) => {
            // TODO: Implement edit shipment modal
            setToast({ message: "Edit shipment - to be implemented", type: "info" });
          }}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSearchChange={setSearchQuery}
          searchValue={searchQuery}
          hideDeleteButton={true}
          disableAdd={!isDeputyManagerOrHigher}
          disableEdit={!isDeputyManagerOrHigher || !selectedRow}
          changePasswordButtonLabel="Collect"
          changePasswordButtonClass="btn-go-to"
          changePasswordDisabled={!selectedRow || selectedRow.statusRaw !== 5}
          onChangePassword={handleStartCollection}
          changePasswordButtonIcon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          }
        />

        {/* Filters panel */}
        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>
            <div className="filter-group">
              <label htmlFor="status-filter">Status:</label>
              <select
                id="status-filter"
                name="status"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All Statuses</option>
                {shipmentStatusesData.map(s => (
                  <option key={s.id} value={s.id}>{s.value}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="send-date-from">Send Date From:</label>
              <input
                id="send-date-from"
                type="date"
                name="sendDateFrom"
                value={filters.sendDateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, sendDateFrom: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="send-date-to">Send Date To:</label>
              <input
                id="send-date-to"
                type="date"
                name="sendDateTo"
                value={filters.sendDateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, sendDateTo: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="delivery-date-from">Delivery Date From:</label>
              <input
                id="delivery-date-from"
                type="date"
                name="deliveryDateFrom"
                value={filters.deliveryDateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, deliveryDateFrom: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="delivery-date-to">Delivery Date To:</label>
              <input
                id="delivery-date-to"
                type="date"
                name="deliveryDateTo"
                value={filters.deliveryDateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, deliveryDateTo: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={observerRef} style={{ height: "1px" }} />
      </main>

      {/* Collection Modal */}
      {showCollectModal && (
        <Modal
          title="Collect Shipment Products"
          onClose={() => setShowCollectModal(false)}
          wide
        >
          <div className="collection-modal">
            <div className="scan-panel">
              <input
                type="text"
                placeholder="Scan or enter product SKU/name"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleScanApply()}
              />
              <button onClick={handleScanApply} className="btn-action btn-primary">
                Add +1
              </button>
            </div>

            <table className="collection-table">
              <thead>
                <tr>
                  <th>Product (SKU)</th>
                  <th>Shipment Qty</th>
                  <th>Collected</th>
                  <th>In Store</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {collectedProducts.map(product => {
                  const isComplete = product.collectedQuantity === product.shipmentQuantity;
                  const isError = product.collectedQuantity !== product.shipmentQuantity;
                  const rowClass = isComplete ? "row-success" : (isError ? "row-error" : "");

                  return (
                    <tr key={product.productId} className={rowClass}>
                      <td>{product.productName} ({product.productSKU})</td>
                      <td>{product.shipmentQuantity}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={product.collectedQuantity}
                          onChange={(e) => handleCollectedChange(product.productId, parseInt(e.target.value) || 0)}
                          className="collected-input"
                        />
                      </td>
                      <td>{product.warehouseQuantity}</td>
                      <td>
                        <select
                          value={locationAssignments[product.productId] || ""}
                          onChange={(e) => handleLocationChange(product.productId, parseInt(e.target.value))}
                          disabled={product.collectedQuantity === 0}
                        >
                          <option value="">Select location</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>
                              {loc.zone}-{loc.col}-{loc.shelf}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <button onClick={handleFinishCollection} className="btn-action btn-success finish-btn">
              Finish Collection
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm Finish Dialog */}
      {showConfirmFinish && (
        <ConfirmDialog
          title="Confirm Collection"
          message="Are you sure? This action is irreversible. Products will be added to warehouse locations."
          confirmText="Confirm"
          onConfirm={executeCollection}
          onCancel={() => setShowConfirmFinish(false)}
        />
      )}

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
