// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../../api/apiClient";
import Header from "../../../components/Header";
import BaseListPage from "../../BaseListPage";
import MessageBox from "../../../components/MessageBox";
import ViewDetailsModal from "./Modals/ViewDetailsModal";
import AddModal from "./Modals/AddModal";
import EditModal from "./Modals/EditModal";
import RemoveModal from "./Modals/RemoveModal";

// === COMPONENT ===
/**
 * Warehouse Structure page - Manage warehouse locations and their structure
 * Displays ALL warehouse locations (including empty ones)
 * Shows Zone-Column-Shelf structure with product counts per location
 * Supports viewing products at each location, adding/editing/deactivating locations
 * Allows filtering by location code, zone, and active status
 * Features automatic sorting by location code and product counts
 */
export default function Warehouses() {
  // === STATE ===
  // Data state
  const [locations, setLocations] = useState([]); // Array of location objects from API
  const [pageNumber, setPageNumber] = useState(1); // Current page number for pagination
  const [hasMore, setHasMore] = useState(true); // Whether more pages are available
  const [loading, setLoading] = useState(false); // Loading indicator for API requests
  const [error, setError] = useState(null); // Error message if API call fails

  // UI state
  const [showFilters, setShowFilters] = useState(false); // Toggle for filter panel visibility
  const [toast, setToast] = useState(null); // Toast notification state (message, type)
  const [selectedRow, setSelectedRow] = useState(null); // Currently selected location row

  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false); // Controls Details modal visibility
  const [showAddModal, setShowAddModal] = useState(false); // Controls Add Location modal visibility
  const [showEditModal, setShowEditModal] = useState(false); // Controls Edit Location modal visibility
  const [showRemoveModal, setShowRemoveModal] = useState(false); // Controls Remove/Deactivate modal visibility
  const [locationProducts, setLocationProducts] = useState([]); // Products at selected location for Details modal

  // Filter and sort state
  const [filters, setFilters] = useState({
    code: "", // Filter by location code
    zone: "" // Filter by zone
  });
  const [sortColumn, setSortColumn] = useState("code"); // Column to sort by (default: code)
  const [sortDirection, setSortDirection] = useState("asc"); // Sort direction (default: ascending)

  // Refs
  const lastSelectedId = useRef(null); // Stores last selected location ID for persistence
  const observerRef = useRef(null); // Ref for intersection observer (infinite scroll)
  const filtersRef = useRef(null); // Ref for filters panel (click-outside detection)

  // User context
  const currentUser = JSON.parse(localStorage.getItem("user")); // Current logged-in user

  // === DATA FETCHING ===
  /**
   * Fetches warehouse locations with pagination, filtering, and sorting
   * Backend provides LocationCode and ProductCount for each location
   * @param {number} page - Page number to fetch
   * @param {boolean} reset - If true, clears existing data
   */
  const fetchLocations = useCallback(async (page = 1, reset = false) => {
    setLoading(true);
    if (reset) {
      setPageNumber(1);
      setLocations([]);
    }
    try {
      // Fetch locations with filters
      const params = {
        PageNumber: page,
        PageSize: 50,
        orderBy: sortColumn,
        sortDirection: sortDirection,
      };

      // Add filters if present
      if (filters.code) params.q = filters.code;
      if (filters.zone) params.zone = filters.zone;

      const response = await api.get("/Location", { params });
      const items = response.items || [];
      const totalPages = response.totalPages || 1;

      setLocations(prev => reset ? items : [...prev, ...items.filter(i => !prev.some(p => p.id === i.id))]);
      setHasMore(page < totalPages);
    } catch (err) {
      setError("Failed to load locations.");
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
    fetchLocations(1, true);
  }, [filters, sortColumn, sortDirection, fetchLocations]);

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
      fetchLocations(pageNumber);
    }
  }, [pageNumber, fetchLocations]);

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
   * Column definitions for the locations table
   * Defines headers, widths, and sortability for each column
   */
  const columns = [
    { key: "id", label: "ID", width: "8%", sortable: false },
    { key: "code", label: "Location Code", width: "20%", sortable: true },
    { key: "zone", label: "Zone", width: "12%", sortable: true },
    { key: "col", label: "Column", width: "12%", sortable: true },
    { key: "shelf", label: "Shelf", width: "12%", sortable: true },
    { key: "productCount", label: "Distinct Products", width: "18%", sortable: true },
    { key: "totalQuantity", label: "Total Quantity", width: "18%", sortable: true },
  ];

  /**
   * Transforms location data to table row format
   * Backend provides LocationCode, ProductCount, and TotalQuantity directly
   * @param {object} location - Raw location data from API
   * @returns {object} Formatted row object for table display
   */
  const toRow = useCallback((location) => {
    return {
      ...location,
      code: location.locationCode,
      zone: location.zone,
      col: location.col,
      shelf: location.shelf,
      productCount: location.productCount || 0,
      totalQuantity: location.totalQuantity || 0,
    };
  }, []);

  /**
   * Memoized table rows to prevent unnecessary recalculations
   * Applies toRow transformation to all locations
   */
  const rows = useMemo(() => {
    return locations.map(toRow);
  }, [locations, toRow]);

  /**
   * Configuration for the details panel
   * Defines how to display selected location information
   */
  const detailsConfig = {
    fields: [
      { label: "ID", key: "id" },
      { label: "Location Code", key: "code" },
      { label: "Zone", key: "zone" },
      { label: "Column", key: "col" },
      { label: "Shelf", key: "shelf" },
      { label: "Distinct Products", key: "productCount" },
      { label: "Total Quantity", key: "totalQuantity" },
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
   * @param {object} row - Selected location row object
   */
  const handleRowSelect = (row) => {
    setSelectedRow(row);
    lastSelectedId.current = row?.id;
  };

  /**
   * Resets all filters to default values
   * Clears code and zone filters
   */
  const handleResetFilters = () => {
    setFilters({ code: "", zone: "" });
  };

  /**
   * Opens the View Details modal to show products at selected location
   * Fetches all products at the selected location using search-product-rows endpoint
   */
  const handleViewDetails = async () => {
    if (!selectedRow) return;

    try {
      const response = await api.get("/products-in-warehouse/search-product-rows", {
        params: {
          locationId: selectedRow.id,
          pageNumber: 1,
          pageSize: 1000,
        },
      });
      setLocationProducts(response.items || []);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Failed to fetch location products:", err);
      setToast({ message: "Failed to load products at location.", type: "error" });
    }
  };

  /**
   * Opens the Add modal to create a new location
   */
  const handleAdd = () => {
    setShowAddModal(true);
  };

  /**
   * Handles successful location creation
   * Refreshes the list and shows success message
   */
  const handleAddSuccess = () => {
    fetchLocations(1, true);
    setToast({ message: "Location created successfully", type: "success" });
  };

  /**
   * Opens the Edit modal to modify existing location
   * Only works if a row is selected
   */
  const handleEdit = () => {
    if (!selectedRow) return;
    setShowEditModal(true);
  };

  /**
   * Handles successful location update
   * Refreshes the list and shows success message
   */
  const handleEditSuccess = () => {
    fetchLocations(1, true);
    setToast({ message: "Location updated successfully", type: "success" });
  };

  /**
   * Opens the deactivation confirmation dialog
   * Only works if a row is selected and the location is active
   */
  const handleDelete = () => {
    if (!selectedRow || !selectedRow._isActive) return;
    setShowRemoveModal(true);
  };

  /**
   * Confirms and executes location deactivation
   * Calls API to deactivate, refreshes list, and shows success message
   */
  const handleConfirmDeactivate = async () => {
    if (!selectedRow) return;

    try {
      await api.delete(`/Location/${selectedRow.id}`);
      setShowRemoveModal(false);
      setSelectedRow(null);
      fetchLocations(1, true);
      setToast({ message: "Location deactivated successfully", type: "success" });
    } catch (err) {
      setToast({
        message: err.response?.data?.error || err.response?.data?.message || "Failed to deactivate location. Make sure it has no products.",
        type: "error"
      });
    }
  };

  /**
   * Cancels the deactivation operation
   * Closes the confirmation dialog without making changes
   */
  const handleCancelDeactivate = () => {
    setShowRemoveModal(false);
  };

  // === RENDER ===
  return (
    <div className="page-container">
      <Header user={currentUser} onLogout={() => { localStorage.clear(); window.location.href = "/"; }} />
      <main className="page-content">
        <BaseListPage
          title="Warehouse Structure"
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
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
        />

        {/* Filter Panel - Conditional rendering based on showFilters state */}
        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>
            <div className="filter-group">
              <label htmlFor="code">Location Code</label>
              <input
                id="code"
                name="code"
                type="text"
                value={filters.code}
                onChange={handleFilterChange}
                placeholder="Enter location code..."
              />
            </div>
            <div className="filter-group">
              <label htmlFor="zone">Zone</label>
              <input
                id="zone"
                name="zone"
                type="text"
                value={filters.zone}
                onChange={handleFilterChange}
                placeholder="Enter zone..."
              />
            </div>
            <button onClick={handleResetFilters}>
              Reset Filters
            </button>
          </div>
        )}

        {/* Intersection Observer target for infinite scroll */}
        <div ref={observerRef} style={{ height: "1px" }} />
      </main>

      {/* Modals */}
      <ViewDetailsModal
        show={showDetailsModal}
        location={selectedRow}
        products={locationProducts}
        onClose={() => {
          setShowDetailsModal(false);
          setLocationProducts([]);
        }}
      />

      <AddModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

      <EditModal
        show={showEditModal}
        location={selectedRow}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
      />

      <RemoveModal
        show={showRemoveModal}
        location={selectedRow}
        onConfirm={handleConfirmDeactivate}
        onCancel={handleCancelDeactivate}
      />

      {/* Toast notifications */}
      {toast && (
        <MessageBox message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} className="centered" />
      )}
    </div>
  );
}
