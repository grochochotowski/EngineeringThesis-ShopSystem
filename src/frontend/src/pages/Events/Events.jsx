// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import MessageBox from "../../components/MessageBox";
import EventFormModal from "./Modals/EventFormModal";
import PublishConfirmDialog from "./Modals/PublishConfirmDialog";
import CancelConfirmDialog from "./Modals/CancelConfirmDialog";

// === COMPONENT ===
export default function Events() {
  // === STATE ===
  const [events, setEvents] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState(null);

  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const lastSelectedId = useRef(null);

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventFormMode, setEventFormMode] = useState("create");
  const [formEventData, setFormEventData] = useState(null);
  const [actionableEvent, setActionableEvent] = useState(null);

  const [filters, setFilters] = useState({ status: "" });
  const [sortColumn, setSortColumn] = useState("dateOfEvent");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const observerRef = useRef(null);
  const loadedPages = useRef(new Set());
  const filtersRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const sortKeyMap = useMemo(() => ({
    title: "title",
    dateOfEvent: "dateOfEvent",
    status: "status",
  }), []);

  // === DATA FETCHING ===
  const fetchEvents = useCallback(
    async (page = 1, reset = false) => {
      if (loadedPages.current.has(page) && !reset) return;
      loadedPages.current.add(page);

      try {
        setLoading(true);
        const mappedSort = sortKeyMap[sortColumn] || undefined;
        const { items = [], totalPages = 1 } = await api.get("/Events", {
          params: {
            pageNumber: page,
            pageSize: 20,
            ...(searchQuery && { q: searchQuery }),
            ...(filters.status && { status: filters.status }),
            ...(mappedSort && { orderBy: mappedSort }),
            ...(sortDirection && { sortDirection }),
          },
        });

        setEvents((prev) =>
          page === 1 ? items : [...prev, ...items.filter((i) => !prev.some((p) => p.id === i.id))]
        );
        setHasMore(page < (totalPages || 1));

        if (page === 1 && items.length === 0) {
          setSelectedRow(null);
          setSelectedEventDetails(null);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load events.");
      } finally {
        setLoading(false);
      }
    },
    [filters, searchQuery, sortColumn, sortDirection, sortKeyMap]
  );

  useEffect(() => {
    loadedPages.current.clear();
    setPageNumber(1);
    fetchEvents(1, true);
  }, [filters, sortColumn, sortDirection, fetchEvents]);

  useEffect(() => {
    if (searchQuery !== undefined) {
      const handler = setTimeout(() => {
        loadedPages.current.clear();
        setPageNumber(1);
        fetchEvents(1, true);
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [searchQuery, fetchEvents]);

    const handleRowSelect = useCallback(async (row) => {
    if (!row) {
      setSelectedRow(null);
      setSelectedEventDetails(null);
      lastSelectedId.current = null;
      return;
    }

    lastSelectedId.current = row.id;
    setSelectedRow(row);
    try {
      const full = await api.get(`/Events/${row.id}`);
      setSelectedEventDetails(full);
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to load event details.",
        type: "error",
      });
    }
  }, []);

  const openCreateModal = () => {
    setFormEventData(null);
    setEventFormMode("create");
    setShowEventModal(true);
  };

  const openEditModal = (row) => {
    if (!row) return;
    setFormEventData(row._raw);
    setEventFormMode("edit");
    setShowEventModal(true);
  };

  const handleEventSuccess = async (eventId) => {
    setShowEventModal(false);
    setToast({ message: `Event ${eventFormMode === 'create' ? 'created' : 'updated'} successfully!`, type: 'success' });
    loadedPages.current.clear();
    fetchEvents(1, true);
  };

  const confirmPublish = async () => {
    if (!actionableEvent) return;
    try {
      await api.put(`/Events/${actionableEvent._raw.id}/publish`);
      setToast({ message: "Event published successfully.", type: "success" });
      setActionableEvent(null);
      loadedPages.current.clear();
      fetchEvents(1, true);
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Failed to publish event.", type: "error" });
    }
  };

  const confirmCancel = async () => {
    if (!actionableEvent) return;
    try {
      await api.put(`/Events/${actionableEvent._raw.id}/cancel`);
      setToast({ message: "Event canceled successfully.", type: "success" });
      setActionableEvent(null);
      loadedPages.current.clear();
      fetchEvents(1, true);
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Failed to cancel event.", type: "error" });
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };


  // === TABLE CONFIGURATION ===
  const columns = [
    { key: "id", label: "ID", width: "8%", sortable: false },
    { key: "title", label: "Title", width: "30%", sortable: true },
    { key: "dateOfEvent", label: "Event Date", width: "22%", sortable: true },
    { key: "status", label: "Status", width: "20%", sortable: true },
  ];

  const toRow = useCallback((e) => ({
    id: e.id,
    title: e.title || "—",
    dateOfEvent: new Date(e.dateOfEvent).toLocaleDateString(),
    status: e.status,
    _raw: e,
  }), []);

  const rows = useMemo(() => events.map(toRow), [events, toRow]);

    const detailsConfig = {
        status: {
            key: "status",
            render: (data) => {
                const statusColors = {
                    Created: "var(--info)",
                    Published: "var(--success)",
                    Finished: "var(--secondary)",
                    Canceled: "var(--error)",
                };
                return (
                    <div
                        className="badge"
                        style={{
                            backgroundColor: statusColors[data.status] || "var(--secondary)",
                            color: "white",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "4px",
                        }}
                    >
                        {data.status}
                    </div>
                );
            },
        },
        fields: [
            { label: "Id", key: "id" },
            { label: "Title", key: "title" },
            { label: "Description", key: "description", isColumn: true },
            { label: "Event Date", key: "dateOfEvent", render: (data) => new Date(data.dateOfEvent).toLocaleString() },
            { label: "Publish Date", key: "dateOfPublish", render: (data) => data.dateOfPublish ? new Date(data.dateOfPublish).toLocaleString() : "—" },
            { label: "Address", key: "address", render: (data) => data.address ? `${data.address.street} ${data.address.building}, ${data.address.city}` : "—" },
            { label: "Created By", key: "createdByUser", render: (data) => data.createdByUser ? `${data.createdByUser.firstName} ${data.createdByUser.lastName}` : "—" },
            {
                label: "Image",
                key: "image",
                isColumn: true,
                render: (data) => {
                    return (
                        <div style={{ display: "block", width: "100%", marginTop: "0.5rem" }}>
                            {!data.image ? (
                                <div style={{ color: "var(--secondary)", fontStyle: "italic" }}>
                                    No image uploaded
                                </div>
                            ) : (
                                <img
                                    src={`data:image/jpeg;base64,${data.image}`}
                                    alt="Event"
                                    style={{
                                        display: "block",
                                        maxWidth: "100%",
                                        maxHeight: "300px",
                                        objectFit: "contain",
                                        borderRadius: "8px",
                                    }}
                                />
                            )}
                        </div>
                    );
                },
            },
        ],
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
          title="Events"
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          selectedRow={selectedRow}
          onSelectRow={handleRowSelect}
          detailsData={selectedEventDetails}
          detailsConfig={detailsConfig}
          onAdd={openCreateModal}
          onEdit={() => openEditModal(selectedRow)}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSearchChange={(value) => setSearchQuery(value)}
          searchValue={searchQuery}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          // Publish button (using changePassword slot)
          onChangePassword={() => setActionableEvent(selectedRow)}
          changePasswordButtonLabel="Publish"
          changePasswordButtonClass="btn-confirm-positive"
          changePasswordDisabled={!selectedRow || selectedRow?._raw?.status !== 'Created'}
          changePasswordButtonIcon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                d="M5 12l5 5L20 7"
              />
            </svg>
          }
          // Cancel button (using changeLogin slot)
          onChangeLogin={() => setActionableEvent(selectedRow)}
          changeLoginButtonLabel="Cancel Event"
          changeLoginButtonClass="btn-confirm-negative"
          changeLoginDisabled={!selectedRow || selectedRow?._raw?.status === 'Canceled' || selectedRow?._raw?.status === 'Finished'}
          changeLoginButtonIcon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                d="M6 6l12 12M6 18L18 6"
              />
            </svg>
          }
          // Hide delete button
          hideDeleteButton={true}
        />

        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="Created">Created</option>
              <option value="Published">Published</option>
              <option value="Finished">Finished</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>
        )}

        <div ref={observerRef} style={{ height: "1px" }} />
        {loading && (
          <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>
        )}
      </main>

      <EventFormModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        mode={eventFormMode}
        event={eventFormMode === "edit" ? formEventData : null}
        onEventSaved={handleEventSuccess}
      />

      {actionableEvent && actionableEvent._raw?.status === 'Created' &&
        <PublishConfirmDialog
          event={actionableEvent}
          onConfirm={confirmPublish}
          onCancel={() => setActionableEvent(null)}
        />
      }

      {actionableEvent && actionableEvent._raw?.status !== 'Canceled' && actionableEvent._raw?.status !== 'Finished' &&
        <CancelConfirmDialog
          event={actionableEvent}
          onConfirm={confirmCancel}
          onCancel={() => setActionableEvent(null)}
        />
      }

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
