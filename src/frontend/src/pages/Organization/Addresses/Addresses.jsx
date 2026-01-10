// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../../api/apiClient";
import Header from "../../../components/Header";
import BaseListPage from "../../BaseListPage";
import MessageBox from "../../../components/MessageBox";

// === COMPONENT ===
/**
 * Addresses page - view-only list of all addresses in the system
 * Uses BaseListPage for consistent list UI with infinite scroll, sorting, and filtering
 * Read-only page - no create, edit, or delete operations
 * Addresses are managed through Users and Clients pages
 */
export default function Addresses() {
  // === STATE ===
  const [addresses, setAddresses] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState(null);

  const [countries, setCountries] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedAddressDetails, setSelectedAddressDetails] = useState(null);
  const lastSelectedId = useRef(null);

  const [filters, setFilters] = useState({
    country: "",
    city: "",
  });
  const [sortColumn, setSortColumn] = useState("city");
  const [sortDirection, setSortDirection] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const observerRef = useRef(null);
  const loadedPages = useRef(new Set());
  const filtersRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const sortKeyMap = useMemo(() => ({
    country: "country",
    city: "city",
    street: "street",
    postalCode: "postalCode",
  }), []);

  // === DATA FETCHING ===
  /**
   * Fetches available countries for filter dropdown
   */
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await api.get("/Addresses/countries");
        setCountries(response || []);
      } catch (err) {
        console.error("Failed to load countries.", err);
      }
    };
    fetchCountries();
  }, []);

  /**
   * Fetches addresses with pagination, filtering, and sorting
   * Uses loadedPages ref to prevent duplicate requests
   * @param {number} page - Page number to fetch
   * @param {boolean} reset - If true, clears cache and fetches from page 1
   */
  const fetchAddresses = useCallback(
    async (page = 1, reset = false) => {
      if (loadedPages.current.has(page) && !reset) return;
      loadedPages.current.add(page);

      try {
        setLoading(true);
        const mappedSort = sortKeyMap[sortColumn] || undefined;
        const { items = [], totalPages = 1 } = await api.get("/Addresses", {
          params: {
            PageNumber: page,
            PageSize: 20,
            ...(searchQuery && { search: searchQuery }),
            ...(filters.country && { country: filters.country }),
            ...(filters.city && { city: filters.city }),
            ...(mappedSort && { orderBy: mappedSort }),
            ...(sortDirection && { sortDirection }),
          },
        });

        setAddresses((prev) =>
          page === 1 ? items : [...prev, ...items.filter((i) => !prev.some((p) => p.id === i.id))]
        );
        setHasMore(page < (totalPages || 1));

        if (page === 1 && items.length === 0) {
          setSelectedRow(null);
          setSelectedAddressDetails(null);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load addresses.");
      } finally {
        setLoading(false);
      }
    },
    [filters, searchQuery, sortColumn, sortDirection, sortKeyMap]
  );

  // === EFFECTS ===
  /**
   * Initial load and immediate fetch when filters/sorting change
   */
  useEffect(() => {
    fetchAddresses(1, true);
  }, [filters, sortColumn, sortDirection, fetchAddresses]);

  /**
   * Debounced search effect
   */
  useEffect(() => {
    if (searchQuery !== undefined) {
      const handler = setTimeout(() => {
        fetchAddresses(1, true);
      }, 500);
      return () => clearTimeout(handler);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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
    if (pageNumber > 1) fetchAddresses(pageNumber);
  }, [pageNumber, fetchAddresses]);

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
    if (!lastSelectedId.current || addresses.length === 0) return;
    const target = addresses.find((a) => a.id === lastSelectedId.current);
    if (!target) {
      setSelectedRow(null);
      setSelectedAddressDetails(null);
      return;
    }
    if (selectedRow?.id === target.id && selectedAddressDetails) return;
    handleRowSelect(toRow(target));
  }, [addresses, selectedRow, selectedAddressDetails, handleRowSelect, toRow]);

  // === TABLE CONFIGURATION ===
  const columns = [
    { key: "id", label: "ID", width: "8%", sortable: false },
    { key: "country", label: "Country", width: "15%", sortable: true },
    { key: "city", label: "City", width: "15%", sortable: true },
    { key: "street", label: "Street", width: "25%", sortable: true },
    { key: "building", label: "Building", width: "12%", sortable: false },
    { key: "premises", label: "Premises", width: "10%", sortable: false },
    { key: "postalCode", label: "Postal Code", width: "15%", sortable: true },
  ];

  /**
   * Transforms address data to table row format
   */
  const toRow = useCallback((a) => {
    return {
      id: a.id,
      country: a.country,
      city: a.city,
      street: a.street,
      building: a.building || "—",
      premises: a.premises || "—",
      postalCode: a.postalCode,
    };
  }, []);

  const rows = useMemo(() => addresses.map(toRow), [addresses, toRow]);

  const addressDetailsConfig = {
    fields: [
      { label: "Id", key: "id" },
      { label: "Country", key: "country" },
      { label: "City", key: "city" },
      { label: "Street", key: "street" },
      { label: "Building", key: "building" },
      { label: "Premises", key: "premises" },
      { label: "Postal Code", key: "postalCode" },
    ],
  };

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
    setSelectedAddressDetails(null);
  };

  /**
   * Handles filter input changes
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handles row selection and loads full address details
   */
  const handleRowSelect = useCallback(async (row) => {
    if (!row) {
      setSelectedRow(null);
      setSelectedAddressDetails(null);
      lastSelectedId.current = null;
      return;
    }

    lastSelectedId.current = row.id;
    setSelectedRow(row);
    try {
      const full = await api.get(`/Addresses/${row.id}`);
      setSelectedAddressDetails(full);
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to load address details.",
        type: "error",
      });
    }
  }, []);

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
          title="Addresses"
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          selectedRow={selectedRow}
          onSelectRow={handleRowSelect}
          detailsData={selectedAddressDetails}
          detailsConfig={addressDetailsConfig}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSearchChange={handleSearchChange}
          searchValue={searchQuery}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          hideAddButton={true}
          hideEditButton={true}
          hideDeleteButton={true}
        />

        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>
            <select
              name="country"
              value={filters.country}
              onChange={handleFilterChange}
            >
              <option value="">All Countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="city"
              placeholder="Filter by City"
              value={filters.city}
              onChange={handleFilterChange}
            />
          </div>
        )}

        <div ref={observerRef} style={{ height: "1px" }} />
        {loading && (
          <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>
        )}
      </main>

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
