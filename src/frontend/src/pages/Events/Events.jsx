// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import { useToast } from "../../components/ToastContext";
import EventFormModal from "./Modals/EventFormModal";
import CancelConfirmDialog from "./Modals/CancelConfirmDialog";
import SocialMediaShareModal from "./Modals/SocialMediaShareModal";
import "../../styles/PagesStyles/organizationPages.css";

// === ROLE HELPER FUNCTIONS ===
const ROLE_HIERARCHY = ["Marketer", "ItTechnician", "ShopAssistant", "DeputyManager", "Manager", "CEO", "Admin", "Root"];
const getRoleLevel = (role) => ROLE_HIERARCHY.indexOf(role);
const isDeputyManagerOrAbove = (role) => getRoleLevel(role) >= getRoleLevel("DeputyManager");
const isManagerOrAbove = (role) => getRoleLevel(role) >= getRoleLevel("Manager");

// === COMPONENT ===
export default function Events() {
  const { showToast } = useToast();

  // === STATE ===
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const lastSelectedId = useRef(null);

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventFormMode, setEventFormMode] = useState("create");
  const [formEventData, setFormEventData] = useState(null);
  const [actionableEvent, setActionableEvent] = useState(null);
  const [actionType, setActionType] = useState(null); // 'publish' or 'cancel'
  const [showSocialMediaModal, setShowSocialMediaModal] = useState(false);
  const [eventToPublish, setEventToPublish] = useState(null);

  const [filters, setFilters] = useState({ status: "" });
  const [sortColumn, setSortColumn] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const observerRef = useRef(null);
  const loadedPages = useRef(new Set());
  const filtersRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const userRole = currentUser?.role;
  const canCreateEdit = isDeputyManagerOrAbove(userRole);
  const canCancelPublish = isManagerOrAbove(userRole);

  const sortKeyMap = useMemo(() => ({
    id: "id",
    title: "title",
    dateOfEvent: "dateofevent",
    dateOfPublish: "dateofpublish",
  }), []);

  // === DATA FETCHING ===
  const fetchEvents = useCallback(
    async (page = 1, reset = false) => {
      if (loadedPages.current.has(page) && !reset) return;
      loadedPages.current.add(page);

      setLoading(true);
      const mappedSort = sortKeyMap[sortColumn] || undefined;
      const { items = [] } = await api.get("/Events", {
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

      if (page === 1 && items.length === 0) {
        setSelectedRow(null);
        setSelectedEventDetails(null);
      }
      setLoading(false);
    },
    [filters, searchQuery, sortColumn, sortDirection, sortKeyMap]
  );

  useEffect(() => {
    loadedPages.current.clear();
    fetchEvents(1, true);
  }, [filters, sortColumn, sortDirection, fetchEvents]);

  useEffect(() => {
    if (searchQuery !== undefined) {
      const handler = setTimeout(() => {
        loadedPages.current.clear();
        fetchEvents(1, true);
      }, 500);
      return () => clearTimeout(handler);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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
      showToast(err.response?.data?.message || "Failed to load event details.", "error");
    }
  }, [showToast]);

  const openCreateModal = () => {
    if (!canCreateEdit) {
      showToast("You don't have permission to create events", "error");
      return;
    }
    setFormEventData(null);
    setEventFormMode("create");
    setShowEventModal(true);
  };

  const openEditModal = (row) => {
    if (!row) return;
    if (!canCreateEdit) {
      showToast("You don't have permission to edit events", "error");
      return;
    }
    setFormEventData(row._raw);
    setEventFormMode("edit");
    setShowEventModal(true);
  };

  const handleEventSuccess = async (eventId) => {
    setShowEventModal(false);
    showToast(`Event ${eventFormMode === 'create' ? 'created' : 'updated'} successfully!`, 'success');

    // Refresh the event list
    loadedPages.current.clear();
    await fetchEvents(1, true);

    // After refreshing the event list, fetch and select the event details
    try {
      const full = await api.get(`/Events/${eventId}`);
      setSelectedEventDetails(full);
      // Create row representation for the selected event
      const selectedRowData = {
        id: full.id,
        title: full.title || "—",
        dateOfEvent: new Date(full.dateOfEvent).toLocaleDateString(),
        dateOfPublish: full.dateOfPublish ? new Date(full.dateOfPublish).toLocaleDateString() : "—",
        status: full.status,
        _raw: full,
      };
      setSelectedRow(selectedRowData);
      lastSelectedId.current = eventId;
    } catch (err) {
      console.error("Failed to load event details after save:", err);
      showToast("Event saved, but failed to load details. Please select the event manually.", "error");
    }
  };

  const handlePublishAfterShare = async (eventId) => {
    await api.put(`/Events/${eventId}/publish`);
    showToast("Event published successfully!", "success");

    // Refresh the event list
    loadedPages.current.clear();
    await fetchEvents(1, true);

    // Re-select the event to show updated status
    try {
      const full = await api.get(`/Events/${eventId}`);
      setSelectedEventDetails(full);
      const selectedRowData = {
        id: full.id,
        title: full.title || "—",
        dateOfEvent: new Date(full.dateOfEvent).toLocaleDateString(),
        dateOfPublish: full.dateOfPublish ? new Date(full.dateOfPublish).toLocaleDateString() : "—",
        status: full.status,
        _raw: full,
      };
      setSelectedRow(selectedRowData);
      lastSelectedId.current = eventId;
    } catch (err) {
      console.error("Failed to reload event details:", err);
    }
  };

  const confirmCancel = async () => {
    if (!actionableEvent) return;
    if (!canCancelPublish) {
      showToast("You don't have permission to cancel events", "error");
      return;
    }
    const eventId = actionableEvent._raw.id;
    try {
      await api.put(`/Events/${eventId}/cancel`);
      showToast("Event canceled successfully.", "success");
      setActionableEvent(null);
      setActionType(null);

      // Refresh the event list
      loadedPages.current.clear();
      await fetchEvents(1, true);

      // Re-select the event to show updated status
      try {
        const full = await api.get(`/Events/${eventId}`);
        setSelectedEventDetails(full);
        const selectedRowData = {
          id: full.id,
          title: full.title || "—",
          dateOfEvent: new Date(full.dateOfEvent).toLocaleDateString(),
          dateOfPublish: full.dateOfPublish ? new Date(full.dateOfPublish).toLocaleDateString() : "—",
          status: full.status,
          _raw: full,
        };
        setSelectedRow(selectedRowData);
        lastSelectedId.current = eventId;
      } catch (err) {
        console.error("Failed to reload event details:", err);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel event.", "error");
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setShowFilters(false);
  };

  const handleSort = (column) => {
    const colDef = columns.find(c => c.key === column);
    if (!colDef || colDef.sortable === false) return;

    if (sortColumn === column) {
      // Toggle between asc and desc for the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Switch to new column, start with asc
      setSortColumn(column);
      setSortDirection("asc");
    }
  };


  // === TABLE CONFIGURATION ===
  const columns = [
    { key: "id", label: "ID", width: "8%", sortable: true },
    { key: "title", label: "Title", width: "25%", sortable: true },
    { key: "dateOfEvent", label: "Event Date", width: "20%", sortable: true },
    { key: "dateOfPublish", label: "Date Published", width: "20%", sortable: true },
    { key: "status", label: "Status", width: "17%", sortable: false },
  ];

  const toRow = useCallback((e) => ({
    id: e.id,
    title: e.title || "—",
    dateOfEvent: new Date(e.dateOfEvent).toLocaleDateString(),
    dateOfPublish: e.dateOfPublish ? new Date(e.dateOfPublish).toLocaleDateString() : "—",
    status: e.status,
    _raw: e,
  }), []);

  const rows = useMemo(() => events.map(toRow), [events, toRow]);

    const detailsConfig = {
        status: {
            key: "status",
            render: (data) => {
                const statusStyles = {
                    Created: {
                        bg: "#ebf8ff",
                        border: "#1e3a8a",
                        text: "#1e3a8a"
                    },
                    Published: {
                        bg: "#e6fffa",
                        border: "#22543d",
                        text: "#22543d"
                    },
                    Finished: {
                        bg: "#fffbea",
                        border: "#744210",
                        text: "#744210"
                    },
                    Canceled: {
                        bg: "#fff5f5",
                        border: "#742a2a",
                        text: "#742a2a"
                    }
                };
                const style = statusStyles[data.status] || statusStyles.Created;
                return (
                    <div
                        className="badge"
                        style={{
                            backgroundColor: style.bg,
                            borderColor: style.border,
                            color: style.text,
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
            { label: "Address", key: "address", render: (data) => {
              if (!data.address) return "—";
              const parts = [
                data.address.street,
                data.address.building,
                data.address.premises
              ].filter(Boolean);
              return `${parts.join(' ')}, ${data.address.city}`;
            }},
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
          selectedRow={selectedRow}
          onSelectRow={handleRowSelect}
          detailsData={selectedEventDetails}
          detailsConfig={detailsConfig}
          onAdd={openCreateModal}
          disableAdd={!canCreateEdit}
          onEdit={() => openEditModal(selectedRow)}
          disableEdit={!selectedRow || selectedRow?._raw?.status !== 'Created' || !canCreateEdit}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSearchChange={(value) => setSearchQuery(value)}
          searchValue={searchQuery}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          // Publish button (using changePassword slot)
          onChangePassword={() => {
            if (!canCancelPublish) {
              showToast("You don't have permission to publish events", "error");
              return;
            }
            // Check if event has an image before opening the modal
            const eventData = selectedRow?._raw || selectedRow;
            if (!eventData?.image) {
              showToast("Cannot publish event without an image. Please add an image to the event first.", "error");
              return;
            }
            // Open social media modal directly WITHOUT publishing yet
            setEventToPublish(selectedRow);
            setShowSocialMediaModal(true);
          }}
          changePasswordButtonLabel="Publish"
          changePasswordButtonClass="btn-confirm-positive"
          changePasswordDisabled={!selectedRow || selectedRow?._raw?.status !== 'Created' || !canCancelPublish}
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
          onChangeLogin={() => {
            if (!canCancelPublish) {
              showToast("You don't have permission to cancel events", "error");
              return;
            }
            setActionableEvent(selectedRow);
            setActionType('cancel');
          }}
          changeLoginButtonLabel="Cancel Event"
          changeLoginButtonClass="btn-confirm-negative"
          changeLoginDisabled={!selectedRow || selectedRow?._raw?.status === 'Canceled' || selectedRow?._raw?.status === 'Finished' || !canCancelPublish}
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

      {actionableEvent && actionType === 'cancel' && (
        <CancelConfirmDialog
          event={actionableEvent}
          onConfirm={confirmCancel}
          onCancel={() => {
            setActionableEvent(null);
            setActionType(null);
          }}
        />
      )}

      <SocialMediaShareModal
        isOpen={showSocialMediaModal}
        onClose={() => {
          setShowSocialMediaModal(false);
          setEventToPublish(null);
        }}
        event={eventToPublish}
        onPublish={handlePublishAfterShare}
      />
    </div>
  );
}
