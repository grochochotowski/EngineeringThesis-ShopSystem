// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../../api/apiClient";
import Header from "../../../components/Header";
import BaseListPage from "../../BaseListPage";
import { useToast } from "../../../components/ToastContext";
import AddModal from "./Modals/AddModal";
import StatusConfirmDialog from "./Modals/StatusConfirmDialog";

// === COMPONENT ===
/**
 * GiftCards page - Manage gift cards in the system
 * Uses BaseListPage for consistent list UI with infinite scroll, sorting, and filtering
 * Supports creating new gift cards and deactivating existing ones
 * Gift cards can also be created through POS transactions
 */
export default function GiftCards() {
  const { showToast } = useToast();
  // === STATE ===
  // Data state
  const [giftCards, setGiftCards] = useState([]); // Array of gift card objects from API
  const [pageNumber, setPageNumber] = useState(1); // Current page number for pagination
  const [hasMore, setHasMore] = useState(true); // Whether more pages are available
  const [loading, setLoading] = useState(false); // Loading indicator for API requests
  const [error, setError] = useState(null); // Error message if API call fails

  // UI state
  const [showFilters, setShowFilters] = useState(false); // Toggle for filter panel visibility // Toast notification state (message, type)
  const [selectedRow, setSelectedRow] = useState(null); // Currently selected gift card row

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false); // Controls Add modal visibility
  const [giftCardToDeactivate, setGiftCardToDeactivate] = useState(null); // Gift card selected for deactivation

  // Filter and sort state
  const [filters, setFilters] = useState({
    code: "", // Filter by gift card number
    isActive: "true" // Filter by active status (default: active only)
  });
  const [sortColumn, setSortColumn] = useState("dateIssued"); // Column to sort by
  const [sortDirection, setSortDirection] = useState("desc"); // Sort direction (asc/desc)

  // Refs
      const lastSelectedId = useRef(null); // Stores last selected gift card ID for remembering selection  const observerRef = useRef(null); // Ref for intersection observer (infinite scroll)
  const filtersRef = useRef(null); // Ref for filters panel (click-outside detection)

  // User context
  const currentUser = JSON.parse(localStorage.getItem("user")); // Current logged-in user

  // === DATA FETCHING ===
  /**
   * Fetches gift cards with pagination, filtering, and sorting
   * @param {number} page - Page number to fetch
   * @param {boolean} reset - If true, clears existing data
   */
  const fetchGiftCards = useCallback(async (page = 1, reset = false) => {
    setLoading(true);
    if (reset) {
      setPageNumber(1);
      setGiftCards([]);
    }
    try {
      const response = await api.get("/GiftCard", {
        params: {
          PageNumber: page,
          PageSize: 50,
          ...(filters.code && { code: filters.code }),
          ...(filters.isActive !== "" && { isActive: filters.isActive }),
          orderBy: sortColumn,
          sortDirection: sortDirection,
        },
      });
      const items = response.items || [];
      const totalPages = response.totalPages || 1;
      setGiftCards(prev => reset ? items : [...prev, ...items.filter(i => !prev.some(p => p.id === i.id))]);
      setHasMore(page < totalPages);
    } catch (err) {
      setError("Failed to load gift cards.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, sortColumn, sortDirection]);

  // === EFFECTS ===
  /**
   * Initial load and refresh when filters/sorting change
   * Triggers a full data reset and fetches page 1 whenever filters or sort options change
   */
  useEffect(() => {
    fetchGiftCards(1, true);
  }, [filters, sortColumn, sortDirection, fetchGiftCards]);

  /**
   * Infinite scroll observer setup
   * Sets up IntersectionObserver to detect when user scrolls to bottom
   * Increments page number when observer element becomes visible
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
   * Fetches additional data when infinite scroll triggers page increment
   */
  useEffect(() => {
    if (pageNumber > 1) {
      fetchGiftCards(pageNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber]);

  /**
   * Close filters panel when clicking outside
   * Listens for clicks outside the filters panel and closes it if detected
   * Cleans up event listener on component unmount or when filters close
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
  /**
   * Formats date string to locale date format
   * @param {string} dateString - ISO date string to format
   * @returns {string} Formatted date string (MM/DD/YYYY)
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  /**
   * Column definitions for the gift cards table
   * Defines headers, widths, and sortability for each column
   */
  const columns = [
    { key: "id", label: "ID", width: "8%", sortable: false },
    { key: "code", label: "Gift Card Number", width: "25%", sortable: false },
    { key: "value", label: "Value", width: "12%", sortable: true },
    { key: "dateIssued", label: "Date Issued", width: "15%", sortable: true },
    { key: "dateValidUntil", label: "Valid Until", width: "15%", sortable: true },
    { key: "isActive", label: "Status", width: "10%", sortable: true },
  ];

  /**
   * Transforms gift card data to table row format
   * Formats values for display (currency, dates, status text)
   * @param {object} gc - Raw gift card data from API
   * @returns {object} Formatted row object for table display
   */
  const toRow = useCallback((gc) => {
    const active = typeof gc.isActive === "boolean" ? gc.isActive : Boolean(gc.isActive);
    return {
      ...gc,
      _isActive: active,
      value: `$${gc.value.toFixed(2)}`,
      dateIssued: formatDate(gc.dateIssued),
      dateValidUntil: formatDate(gc.dateValidUntil),
      isActive: active ? "Active" : "Inactive",
    };
  }, []);

  /**
   * Memoized table rows to prevent unnecessary recalculations
   * Applies toRow transformation to all gift cards
   */
  const rows = useMemo(() => {
    return giftCards.map(toRow);
  }, [giftCards, toRow]);

  /**
   * Configuration for the details panel
   * Defines how to display selected gift card information
   */
  const detailsConfig = {
    status: {
      key: "_isActive",
      activeLabel: "Active",
      inactiveLabel: "Inactive",
    },
    fields: [
      { label: "ID", key: "id" },
      { label: "Gift Card Number", key: "code" },
      { label: "Value", key: "value" },
      { label: "Date Issued", key: "dateIssued" },
      { label: "Valid Until", key: "dateValidUntil" },
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
   * Handles filter input changes
   * Updates filter state when user modifies filter fields
   * @param {Event} e - Change event from input/select elements
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handles row selection in the table
   * Updates selected row state and stores ID in ref for persistence
   * @param {object} row - Selected gift card row object
   */
  const handleRowSelect = (row) => {
    setSelectedRow(row);
    lastSelectedId.current = row?.id;
  };

  /**
   * Resets all filters to default values
   * Clears code filter and sets status to "Active" only
   */
  const handleResetFilters = () => {
    setFilters({ code: "", isActive: "true" });
  };

  /**
   * Opens the Add modal to create a new gift card
   */
  const handleAdd = () => {
    setShowAddModal(true);
  };

  /**
   * Handles successful gift card creation
   * Refreshes the list and shows success message
   */
  const handleAddSuccess = () => {
    fetchGiftCards(1, true);
    showToast("Gift card created successfully", "success" );
  };

  /**
   * Opens the deactivation confirmation dialog
   * Only works if a row is selected and the gift card is active
   */
  const handleDelete = () => {
    if (!selectedRow || !selectedRow._isActive) return;
    setGiftCardToDeactivate(selectedRow);
  };

  /**
   * Confirms and executes gift card deactivation
   * Calls API to deactivate, refreshes list, and shows success message
   */
  const handleConfirmDeactivate = async () => {
    if (!giftCardToDeactivate) return;

    try {
      await api.delete(`/GiftCard/${giftCardToDeactivate.id}`);
      setGiftCardToDeactivate(null);
      setSelectedRow(null);
      fetchGiftCards(1, true);
      showToast("Gift card deactivated successfully", "success" );
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to deactivate gift card", "error" );
    }
  };

  /**
   * Cancels the deactivation operation
   * Closes the confirmation dialog without making changes
   */
  const handleCancelDeactivate = () => {
    setGiftCardToDeactivate(null);
  };

  // === RENDER ===
  return (
    <div className="page-container">
      <Header user={currentUser} onLogout={() => { localStorage.clear(); window.location.href = "/"; }} />
      <main className="page-content">
        <BaseListPage
          title="Gift Cards"
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          selectedRow={selectedRow}
          onSelectRow={handleRowSelect}
          detailsData={selectedRow}
          detailsConfig={detailsConfig}
          onToggleFilters={() => setShowFilters(p => !p)}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onAdd={handleAdd}
          onDelete={handleDelete}
          hideEditButton={true}
          observerRef={observerRef}
        />

        {/* Filter Panel - Conditional rendering based on showFilters state */}
        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>
            <div className="filter-group">
              <label htmlFor="code">Gift Card Number</label>
              <input
                id="code"
                name="code"
                type="text"
                value={filters.code}
                onChange={handleFilterChange}
                placeholder="Enter gift card number..."
              />
            </div>
            <div className="filter-group">
              <label htmlFor="isActive">Status</label>
              <select
                id="isActive"
                name="isActive"
                value={filters.isActive}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <button onClick={handleResetFilters}>
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <AddModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

      <StatusConfirmDialog
        giftCard={giftCardToDeactivate}
        onConfirm={handleConfirmDeactivate}
        onCancel={handleCancelDeactivate}
      />

      {/* Toast notifications */}
    </div>
  );
}
