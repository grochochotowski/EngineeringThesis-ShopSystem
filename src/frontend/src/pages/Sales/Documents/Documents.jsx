// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import { api } from "../../../api/apiClient";
import { useSearchParams } from "react-router-dom";
import Header from "../../../components/Header";
import { useToast } from "../../../components/ToastContext";
import ViewDetailsModal from "./Modals/ViewDetailsModal";
import { salesDocumentTypesData } from "../../../data/salesDocumentTypes";
import { paymentOptionsData } from "../../../data/paymentOptions";
import { printSalesDocumentPDF } from "../../../utils/printService";
import "../../../styles/PagesStyles/salesDocuments.css";
import "../../../styles/PagesStyles/baseListPage.css";

// === COMPONENT ===
/**
 * Documents (Sales Documents) page - View and manage sales transactions
 * Displays comprehensive list of sales documents (receipts, invoices, returns)
 * with advanced filtering by type, payment method, date range, and amount
 * Supports viewing detailed document information and generating PDF printouts
 */
export default function SalesDocuments() {
  const { showToast } = useToast();
  // === STATE ===
  // URL state
  const [searchParams, setSearchParams] = useSearchParams(); // Query parameters for search

  // Data state
  const [documents, setDocuments] = useState([]); // Array of sales document objects from API
  const [pageNumber, setPageNumber] = useState(1); // Current page number for pagination
  const [hasMore, setHasMore] = useState(true); // Whether more pages are available
  const [loading, setLoading] = useState(false); // Loading indicator for API requests
  const [initialDataLoaded, setInitialDataLoaded] = useState(false); // Flag to prevent premature fetches

  // Selection state
  const [selectedDocument, setSelectedDocument] = useState(null); // Currently selected document row
  const [selectedDocumentDetails, setSelectedDocumentDetails] = useState(null); // Full document with items/payments

  // UI state // Toast notification state (message, type)
  const [showDetailsModal, setShowDetailsModal] = useState(false); // Controls Details modal visibility
  const [showFilters, setShowFilters] = useState(false); // Toggle for filter panel visibility
  const [showDocumentTypeFilters, setShowDocumentTypeFilters] = useState(false); // Expand/collapse document types
  const [showPaymentTypeFilters, setShowPaymentTypeFilters] = useState(false); // Expand/collapse payment types

  // Filter state
  const [searchQuery, setSearchQuery] = useState(""); // Main search input value
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState([1, 2, 3]); // Document type checkboxes (all by default)
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState([1, 2, 3, 4, 5]); // Payment type checkboxes (all by default)
  const [filters, setFilters] = useState({
    from: "", // Issue date from filter
    to: "", // Issue date to filter
    minAmount: "", // Minimum total amount filter
    maxAmount: "", // Maximum total amount filter
  });

  // Sort state
  const [sortColumn, setSortColumn] = useState("issueDate"); // Column to sort by (default: issue date)
  const [sortDirection, setSortDirection] = useState("desc"); // Sort direction (default: newest first)

  // Refs
  const observerRef = useRef(null); // Ref for intersection observer (infinite scroll)
  const filtersRef = useRef(null); // Ref for filters panel (click-outside detection)

  // User context
  const user = JSON.parse(localStorage.getItem("user")); // Current logged-in user

  // === DATA FETCHING ===
  /**
   * Fetches sales documents from API with pagination, filtering, and sorting
   * Handles both backend sorting (for supported columns) and client-side filtering (for types)
   *
   * @param {number} page - Page number to fetch
   * @param {object} currentFilters - Filter values (from, to, minAmount, maxAmount)
   * @param {string} currentSearchQuery - Search query string
   * @param {string} currentSortColumn - Column to sort by
   * @param {string} currentSortDirection - Sort direction (asc/desc)
   * @param {array} currentDocumentTypes - Selected document type IDs
   * @param {array} currentPaymentTypes - Selected payment type IDs
   */
  const fetchDocumentsData = async (
    page,
    currentFilters,
    currentSearchQuery,
    currentSortColumn,
    currentSortDirection,
    currentDocumentTypes,
    currentPaymentTypes
  ) => {
    try {
      setLoading(true);
      const source = axios.CancelToken.source();

      // Backend only supports sorting for specific columns
      const backendSortableColumns = ["documentNumber", "issueDate"];
      const useBackendSort = currentSortColumn && backendSortableColumns.includes(currentSortColumn);

      // Build API request parameters
      const params = {
        PageNumber: page,
        PageSize: 50,
        ...(currentSearchQuery && { q: currentSearchQuery }),
        ...(currentFilters.from && { from: currentFilters.from }),
        ...(currentFilters.to && { to: currentFilters.to }),
        ...(currentFilters.minAmount && { minAmount: currentFilters.minAmount }),
        ...(currentFilters.maxAmount && { maxAmount: currentFilters.maxAmount }),
        ...(useBackendSort && { orderBy: currentSortColumn }),
        ...(useBackendSort && { sortDirection: currentSortDirection }),
      };

      // Add document type filter if not all types selected (backend may only support single type)
      if (currentDocumentTypes && currentDocumentTypes.length > 0 && currentDocumentTypes.length < 3) {
        params.type = currentDocumentTypes[0]; // Backend limitation: single type only
      }

      // Fetch from API
      const { items, totalPages } = await api.get("/SalesDocument", {
        params,
        cancelToken: source.token,
      });

      if (items?.length) {
        // Apply client-side filtering for document types and payment types
        let filteredItems = items;

        // Filter by document types if not all selected
        if (currentDocumentTypes && currentDocumentTypes.length > 0 && currentDocumentTypes.length < 3) {
          filteredItems = filteredItems.filter(item => {
            // Backend returns enum as string (e.g., "Receipt"), map to ID
            const docType = salesDocumentTypesData.find(t => t.value === item.documentType);
            return docType ? currentDocumentTypes.includes(docType.id) : false;
          });
        }

        // Filter by payment types if not all selected
        const allPaymentTypes = [1, 2, 3]; // Card, Cash, GiftCard
        if (currentPaymentTypes && currentPaymentTypes.length > 0 && currentPaymentTypes.length < allPaymentTypes.length) {
          filteredItems = filteredItems.filter(item => {
            if (!item.paymentType) return false;
            const paymentTypeId = paymentOptionsData.find(p => p.value === item.paymentType)?.id;
            return currentPaymentTypes.includes(paymentTypeId);
          });
        }

        setDocuments(filteredItems);
        setHasMore(page < (totalPages || 1));
      } else {
        setDocuments([]);
        setHasMore(false);
      }
    } catch (err) {
      // Ignore cancelled requests
      if (axios.isCancel(err)) {
        return;
      }
      console.error("Failed to load sales documents:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Debounced fetch for search queries
   * Adds 500ms delay to avoid excessive API calls while typing
   */
  const debouncedFetchDocuments = useCallback(() => {
    if (!initialDataLoaded) return;
    const delay = setTimeout(() => {
      setDocuments([]);
      setPageNumber(1);
      fetchDocumentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedDocumentTypes, selectedPaymentTypes);
    }, 500);

    return () => clearTimeout(delay);
  }, [filters, searchQuery, initialDataLoaded, sortColumn, sortDirection, selectedDocumentTypes, selectedPaymentTypes]);

  /**
   * Immediate fetch for filter/sort changes
   * No debounce needed for explicit user actions (clicking filters, sorting)
   */
  const immediateFetchDocuments = useCallback(() => {
    if (!initialDataLoaded) return;
    setDocuments([]);
    setPageNumber(1);
    fetchDocumentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedDocumentTypes, selectedPaymentTypes);
  }, [sortColumn, sortDirection, filters, searchQuery, initialDataLoaded, selectedDocumentTypes, selectedPaymentTypes]);

  // === EFFECTS ===
  /**
   * Initialize data loaded flag
   * Prevents fetches before component is fully mounted
   */
  useEffect(() => {
    setInitialDataLoaded(true);
  }, []);

  /**
   * Handle auto-search from query parameters
   * Allows direct linking to search results (e.g., from POS after creating document)
   */
  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam && initialDataLoaded) {
      setSearchQuery(searchParam);
      setSearchParams({}); // Clear from URL after applying
    }
  }, [searchParams, initialDataLoaded, setSearchParams]);

  /**
   * Trigger debounced fetch for search queries
   * Uses 500ms delay to reduce API calls while user is typing
   */
  useEffect(() => {
    if (searchQuery) {
      debouncedFetchDocuments();
    } else {
      immediateFetchDocuments();
    }
  }, [debouncedFetchDocuments, immediateFetchDocuments, searchQuery]);

  /**
   * Trigger immediate fetch for filters and sorting
   * No debounce needed for explicit filter/sort changes
   */
  useEffect(() => {
    immediateFetchDocuments();
  }, [immediateFetchDocuments, filters, sortColumn, sortDirection, selectedDocumentTypes, selectedPaymentTypes]);

  /**
   * Infinite scroll observer setup
   * Detects when user scrolls to bottom and loads next page
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
   * Load next page when pageNumber increments
   * Appends new data to existing documents array
   */
  useEffect(() => {
    if (pageNumber > 1) {
      fetchDocumentsData(pageNumber, filters, searchQuery, sortColumn, sortDirection, selectedDocumentTypes, selectedPaymentTypes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber]);

  /**
   * Close filters panel when clicking outside
   * Listens for clicks outside the filters panel and closes it if detected
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
   * Column definitions for the documents table
   * Defines headers, widths, and sortability for each column
   */
  const columns = [
    { key: "documentNumber", label: "Document #", width: "14%", sortable: true },
    { key: "documentType", label: "Type", width: "10%", sortable: false },
    { key: "issueDate", label: "Issue Date", width: "16%", sortable: true },
    { key: "totalGross", label: "Total", width: "11%", sortable: true },
    { key: "totalTax", label: "Total Tax", width: "11%", sortable: true },
    { key: "numberOfProducts", label: "Products", width: "10%", sortable: true },
    { key: "paymentType", label: "Payment", width: "14%", sortable: false },
    { key: "userName", label: "User", width: "14%", sortable: false },
  ];

  /**
   * Formats date string to locale date-time format
   * @param {string} dateStr - ISO date string to format
   * @returns {string} Formatted date string (DD/MM/YYYY HH:MM)
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  /**
   * Gets human-readable label for document type
   * Backend serializes enums as strings (e.g., "Receipt"), not numbers
   * @param {string|number} typeValue - Document type enum value
   * @returns {string} Human-readable document type label
   */
  const getDocumentTypeLabel = (typeValue) => {
    // If it's a number, find by id
    if (typeof typeValue === 'number') {
      return salesDocumentTypesData.find(t => t.id === typeValue)?.value || "Unknown";
    }
    // If it's a string (enum name), find by value
    const found = salesDocumentTypesData.find(t => t.value === typeValue);
    return found ? found.value : "Unknown";
  };

  /**
   * Gets human-readable label for payment option
   * Backend serializes enums as strings (e.g., "GiftCard"), not numbers
   * Handles special "Mix" case for multiple payment methods
   * @param {string|number} paymentValue - Payment option enum value
   * @returns {string} Human-readable payment option label
   */
  const getPaymentOptionLabel = (paymentValue) => {
    // Handle special case for mixed payments
    if (paymentValue === "Mix") {
      return "Mixed";
    }
    // If it's a number, find by id
    if (typeof paymentValue === 'number') {
      return paymentOptionsData.find(p => p.id === paymentValue)?.label || "Unknown";
    }
    // If it's a string (enum name), find by value and return label
    const found = paymentOptionsData.find(p => p.value === paymentValue);
    if (found) {
      return found.label;
    }
    return "Unknown";
  };

  /**
   * Transforms raw document data to table row format
   * Includes both display values and raw values for sorting
   */
  const baseRows = documents.map((d) => ({
    id: d.id,
    documentType: d.documentType, // Keep raw for badge checking
    documentNumber: d.documentNumber,
    issueDate: formatDate(d.issueDate),
    totalGross: `$${d.totalGross.toFixed(2)}`,
    totalTax: `$${d.totalTax.toFixed(2)}`,
    numberOfProducts: d.numberOfProducts,
    paymentType: d.paymentType ? getPaymentOptionLabel(d.paymentType) : "—",
    userName: d.userName || "—",
    // Raw values for sorting and logic
    rawDocumentType: d.documentType,
    rawClientId: d.clientId,
    rawTotalGross: d.totalGross,
    rawTotalTax: d.totalTax,
    rawNumberOfProducts: d.numberOfProducts,
    rawIssueDate: new Date(d.issueDate),
  }));

  /**
   * Applies frontend sorting for columns not supported by backend
   * Backend handles: documentNumber, issueDate
   * Frontend handles: totalGross, totalTax, numberOfProducts
   */
  const rows = useMemo(() => {
    if (!sortColumn || !sortDirection) return baseRows;

    // Columns that need frontend sorting
    const frontendSortColumns = ["totalGross", "totalTax", "numberOfProducts"];

    if (!frontendSortColumns.includes(sortColumn)) {
      return baseRows; // Backend handles documentNumber and issueDate
    }

    // Perform frontend sorting
    const sorted = [...baseRows].sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case "totalGross":
          aValue = a.rawTotalGross;
          bValue = b.rawTotalGross;
          break;
        case "totalTax":
          aValue = a.rawTotalTax;
          bValue = b.rawTotalTax;
          break;
        case "numberOfProducts":
          aValue = a.rawNumberOfProducts;
          bValue = b.rawNumberOfProducts;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [baseRows, sortColumn, sortDirection]);

  // === EVENT HANDLERS ===
  /**
   * Handles search input changes
   * Clears selection when search query changes
   * @param {string} value - New search query value
   */
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setSelectedDocument(null);
    setSelectedDocumentDetails(null);
  };

  /**
   * Handles filter input changes
   * Updates filter state when user modifies filter fields
   * @param {Event} e - Change event from input/select elements
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handles document type checkbox toggle
   * Adds or removes type ID from selected types array
   * @param {number} typeId - Document type ID to toggle
   * @param {boolean} checked - Whether checkbox is checked
   */
  const handleDocumentTypeToggle = (typeId, checked) => {
    setSelectedDocumentTypes(prev => {
      if (checked) {
        return [...prev, typeId];
      } else {
        return prev.filter(id => id !== typeId);
      }
    });
  };

  /**
   * Handles payment type checkbox toggle
   * Adds or removes payment ID from selected types array
   * @param {number} paymentId - Payment type ID to toggle
   * @param {boolean} checked - Whether checkbox is checked
   */
  const handlePaymentTypeToggle = (paymentId, checked) => {
    setSelectedPaymentTypes(prev => {
      if (checked) {
        return [...prev, paymentId];
      } else {
        return prev.filter(id => id !== paymentId);
      }
    });
  };

  /**
   * Resets all filters to default values
   * Selects all document types, all payment types, and clears date/amount ranges
   */
  const handleResetFilters = () => {
    setSelectedDocumentTypes([1, 2, 3]);
    setSelectedPaymentTypes([1, 2, 3, 4, 5]);
    setFilters({
      from: "",
      to: "",
      minAmount: "",
      maxAmount: "",
    });
  };

  /**
   * Handles row selection in the table
   * Toggles selection if same row clicked again
   * @param {object} row - Selected document row object
   */
  const handleRowSelect = (row) => {
    if (selectedDocument && selectedDocument.id === row.id) {
      setSelectedDocument(null);
    } else {
      setSelectedDocument(row);
    }
  };

  /**
   * Handles column header clicks for sorting
   * Cycles through: asc -> desc -> no sort
   * @param {string} column - Column key to sort by
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
   * Handles View Details button click
   * Fetches full document details including items, payments, and client data
   * Opens modal to display comprehensive document information
   */
  const handleViewDetails = async () => {
    if (!selectedDocument) {
      showToast("Please select a document to view details.", "warning",
      );
      return;
    }

    try {
      // Fetch full document with items and payments
      const full = await api.get(`/SalesDocument/${selectedDocument.id}`);

      // Fetch client data if clientId exists
      if (full.clientId) {
        try {
          const clientData = await api.get(`/Clients/${full.clientId}`);
          full.clientData = clientData; // Store full client data
          full.clientName = clientData.name;
        } catch (err) {
          console.error("Failed to load client data:", err);
          full.clientData = null;
          full.clientName = null;
        }
      }

      setSelectedDocumentDetails(full);
      setShowDetailsModal(true);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to load document details.", "error",
      );
    }
  };

  /**
   * Handles Print button click
   * Generates PDF document from selected sales document
   * Uses printService utility to create formatted PDF with all details
   */
  const handlePrint = async () => {
    if (!selectedDocument) {
      showToast("Please select a document to print.", "warning",
      );
      return;
    }

    try {
      // Show loading toast
      showToast("Generating PDF...", "info",
      );

      // Fetch full document details if not already loaded
      let documentToPrint = selectedDocumentDetails;
      if (!documentToPrint || documentToPrint.id !== selectedDocument.id) {
        const full = await api.get(`/SalesDocument/${selectedDocument.id}`);

        // Fetch client data if clientId exists
        if (full.clientId) {
          try {
            const clientData = await api.get(`/Clients/${full.clientId}`);
            full.clientData = clientData;
            full.clientName = clientData.name;
          } catch (err) {
            console.error("Failed to load client data:", err);
            full.clientData = null;
            full.clientName = null;
          }
        }

        documentToPrint = full;
      }

      // Generate PDF with formatters
      const fileName = await printSalesDocumentPDF(documentToPrint, {
        formatDate,
        getDocumentTypeLabel,
        getPaymentOptionLabel,
      });

      showToast(`PDF generated successfully: ${fileName}`, "success",
      );
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      showToast(err.message || "Failed to generate PDF.", "error",
      );
    }
  };

  // === RENDER ===
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
        <div className="base-list-wrapper">
          <div className="base-list-container">
            {/* === LEFT SIDEBAR === */}
            <aside className="sidebar">
              {/* Search Panel */}
              <div className="search-panel">
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                <div className="search-buttons">
                  <button
                    className="btn-filter"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilters(prev => !prev);
                    }}
                  >
                    Filters
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                {/* View Details Button */}
                <button
                  onClick={handleViewDetails}
                  className={`btn-action btn-view-details ${!selectedDocument ? "disabled" : ""}`}
                  disabled={!selectedDocument}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  View Details
                </button>

                {/* Print Button */}
                <button
                  onClick={handlePrint}
                  className={`btn-action btn-print ${!selectedDocument ? "disabled" : ""}`}
                  disabled={!selectedDocument}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                  </svg>
                  Print
                </button>
              </div>
            </aside>

            {/* === MAIN CONTENT AREA === */}
            <div className="main-content">
              <div className="content-header">
                <h2>Sales Documents</h2>
              </div>

              {/* Data Table */}
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      {columns.map(col => (
                        <th
                          key={col.key}
                          style={{ width: col.width }}
                          className={col.sortable !== false ? "sortable" : ""}
                          onClick={() => col.sortable !== false && handleSort(col.key)}
                        >
                          {col.label}
                          {col.sortable !== false && sortColumn === col.key && (
                            <span className="sort-icon">
                              {sortDirection === "asc" ? " ▲" : " ▼"}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* No data message */}
                    {rows.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={columns.length} className="no-data">
                          No documents found
                        </td>
                      </tr>
                    ) : (
                      // Map documents to table rows
                      rows.map(row => (
                        <tr
                          key={row.id}
                          className={selectedDocument && selectedDocument.id === row.id ? "selected" : ""}
                          onClick={() => handleRowSelect(row)}
                        >
                          {columns.map(col => {
                            // Special rendering for payment type column (badge)
                            if (col.key === "paymentType" && row[col.key] !== "—") {
                              return (
                                <td key={col.key}>
                                  <span className={`payment-badge ${row[col.key].toLowerCase().replace(/\s+/g, '-')}`}>
                                    {row[col.key]}
                                  </span>
                                </td>
                              );
                            }
                            // Special rendering for document type column (badge with color)
                            if (col.key === "documentType") {
                              const isReturn = row.documentType === "ReceiptReturn" || row.documentType === "InvoiceReturn";
                              return (
                                <td key={col.key}>
                                  <span className={isReturn ? "doc-badge-return" : "doc-badge-sale"}>
                                    {row[col.key]}
                                  </span>
                                </td>
                              );
                            }
                            // Default cell rendering
                            return <td key={col.key}>{row[col.key]}</td>;
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Intersection Observer sentinel for infinite scroll */}
                <div ref={observerRef} style={{ height: "1px" }} />
                {loading && (
                  <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* === MODALS === */}
      {/* View Details Modal */}
      <ViewDetailsModal
        show={showDetailsModal}
        document={selectedDocumentDetails}
        onClose={() => setShowDetailsModal(false)}
        formatDate={formatDate}
        getDocumentTypeLabel={getDocumentTypeLabel}
        getPaymentOptionLabel={getPaymentOptionLabel}
      />

      {/* === FILTERS PANEL === */}
      {showFilters && (
        <div className="filters-panel" ref={filtersRef}>
          {/* Panel Header with Reset Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0 }}>Filters</h4>
            <button
              onClick={handleResetFilters}
              className="btn-reset-filters"
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.8rem',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-sm)',
                background: 'white',
                color: 'var(--text-dark)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Reset
            </button>
          </div>

          {/* Document Types Filter - Collapsible */}
          <div className="filter-group">
            <label
              onClick={() => setShowDocumentTypeFilters(prev => !prev)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Document Type:</span>
              <span style={{ fontSize: '0.8rem' }}>{showDocumentTypeFilters ? '▼' : '▶'}</span>
            </label>
            {showDocumentTypeFilters && (
              <div className="status-checkbox-group">
                {salesDocumentTypesData
                  .filter(t => t.id !== 0)
                  .map(t => (
                    <label key={t.id} className="status-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedDocumentTypes.includes(t.id)}
                        onChange={(e) => handleDocumentTypeToggle(t.id, e.target.checked)}
                      />
                      <span>{t.value}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>

          {/* Payment Types Filter - Collapsible */}
          <div className="filter-group">
            <label
              onClick={() => setShowPaymentTypeFilters(prev => !prev)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Payment Type:</span>
              <span style={{ fontSize: '0.8rem' }}>{showPaymentTypeFilters ? '▼' : '▶'}</span>
            </label>
            {showPaymentTypeFilters && (
              <div className="status-checkbox-group">
                {paymentOptionsData
                  .filter(p => p.id !== 0) // Exclude Unspecified
                  .map(p => (
                    <label key={p.id} className="status-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedPaymentTypes.includes(p.id)}
                        onChange={(e) => handlePaymentTypeToggle(p.id, e.target.checked)}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>

          {/* Issue Date Range Filter */}
          <div className="filter-date-group">
            <label>Issue Date:</label>
            <div className="filter-date-inputs">
              <input
                type="date"
                name="from"
                value={filters.from}
                onChange={handleFilterChange}
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                name="to"
                value={filters.to}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          {/* Amount Range Filter */}
          <div className="filter-date-group">
            <label>Amount:</label>
            <div className="filter-date-inputs">
              <input
                type="number"
                name="minAmount"
                placeholder="Min"
                value={filters.minAmount}
                onChange={handleFilterChange}
                step="0.01"
                min="0"
              />
              <span className="date-separator">to</span>
              <input
                type="number"
                name="maxAmount"
                placeholder="Max"
                value={filters.maxAmount}
                onChange={handleFilterChange}
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>
      )}

      {/* === TOAST NOTIFICATIONS === */}
    </div>
  );
}
