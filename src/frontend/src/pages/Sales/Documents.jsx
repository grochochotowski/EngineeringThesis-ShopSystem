import React, { useEffect, useState, useRef } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import ConfirmDialog from "../../components/ConfirmDialog";
import MessageBox from "../../components/MessageBox";
import { salesDocumentTypesData } from "../../data/salesDocumentTypes";
import { paymentOptionsData } from "../../data/paymentOptions";
import "../../styles/PagesStyles/salesDocuments.css";

import DocumentDetailsModal from "./components/DocumentDetailsModal";

export default function SalesDocuments() {
  const [documents, setDocuments] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [toast, setToast] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortColumn, setSortColumn] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Modal visibility states
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    documentType: "",
    paymentType: "",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
  });

  const observerRef = useRef(null);
  const filtersRef = useRef(null);

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user")) || {};
  } catch (e) {
    user = {};
  }

  // Table columns
  const columns = [
    { key: "documentNumber", label: "Document Number", width: "15%", sortable: true, sortKey: "documentnumber" },
    { key: "numberOfProducts", label: "Number of Products", width: "12%", sortable: false },
    { key: "totalTax", label: "Total Tax", width: "10%", sortable: false },
    { key: "totalNet", label: "Net Amount", width: "12%", sortable: false },
    { key: "totalGross", label: "Gross Amount", width: "12%", sortable: true, sortKey: "grossamount" },
    { key: "paymentType", label: "Payment Type", width: "12%", sortable: false },
    { key: "issueDate", label: "Date", width: "15%", sortable: true, sortKey: "date" },
  ];

  // Payment type options including Mix
  const paymentTypeOptions = [
    { value: "", label: "All Payment Types" },
    ...paymentOptionsData
      .filter(p => p.id > 0 && p.value !== "BankTransfer" && p.value !== "Voucher")
      .map(p => ({ value: p.value, label: p.value })),
    { value: "Mix", label: "Mix (Multiple)" },
  ];

  // Document type options
  const documentTypeOptions = [
    { value: "", label: "All Document Types" },
    ...salesDocumentTypesData
      .filter(t => t.id > 0)
      .map(t => ({ value: t.id, label: t.value })),
  ];

  // Fetch documents data
  const fetchDocumentsData = async (page, currentFilters, currentSearchQuery, currentSortColumn, currentSortDirection) => {
    try {
      setLoading(true);

      // Translate frontend column key to backend sort key
      const columnDef = columns.find(c => c.key === currentSortColumn);
      const backendSortKey = columnDef?.sortKey || currentSortColumn;

      // Build params object
      const params = {
        pageNumber: page,
        pageSize: 20,
        ...(currentSearchQuery && { q: currentSearchQuery }),
        ...(currentFilters.documentType && { type: currentFilters.documentType }),
        ...(currentFilters.paymentType && { paymentType: currentFilters.paymentType }),
        ...(currentFilters.dateFrom && { from: new Date(currentFilters.dateFrom).toISOString() }),
        ...(currentFilters.dateTo && { to: new Date(currentFilters.dateTo).toISOString() }),
        ...(currentFilters.minAmount && { minAmount: parseFloat(currentFilters.minAmount) }),
        ...(currentFilters.maxAmount && { maxAmount: parseFloat(currentFilters.maxAmount) }),
        ...(backendSortKey && { orderBy: backendSortKey }),
        ...(currentSortDirection && { sortDirection: currentSortDirection }),
      };

      const response = await api.get("/SalesDocument", { params });

      if (page === 1) {
        setDocuments(response?.data || []);
      } else {
        setDocuments((prev) => [...prev, ...(response?.data || [])]);
      }

      const totalPages = Math.ceil((response?.totalCount || 0) / 20);
      setHasMore(page < totalPages);
      setError(null);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setDocuments([]);
      setError("Failed to load sales documents. Please try again.");
      setToast({ type: "error", message: "Failed to load sales documents." });
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDocumentsData(1, filters, searchQuery, sortColumn, sortDirection);
  }, []);

  // Search handler (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageNumber(1);
      fetchDocumentsData(1, filters, searchQuery, sortColumn, sortDirection);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const nextPage = pageNumber + 1;
          setPageNumber(nextPage);
          fetchDocumentsData(nextPage, filters, searchQuery, sortColumn, sortDirection);
        }
      },
      { threshold: 1.0 }
    );

    if (observerRef.current) observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [loading, hasMore, pageNumber, filters, searchQuery, sortColumn, sortDirection]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    setPageNumber(1);
    fetchDocumentsData(1, newFilters, searchQuery, sortColumn, sortDirection);
  };

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = {
      documentType: "",
      paymentType: "",
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: "",
    };
    setFilters(clearedFilters);
    setSearchQuery("");
    setPageNumber(1);
    fetchDocumentsData(1, clearedFilters, "", sortColumn, sortDirection);
  };

  // Handle column sorting
  const handleSort = (columnKey) => {
    const column = columns.find(c => c.key === columnKey);
    if (!column?.sortable) return;

    let newDirection = "asc";
    if (sortColumn === columnKey) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }

    setSortColumn(columnKey);
    setSortDirection(newDirection);
    setPageNumber(1);
    fetchDocumentsData(1, filters, searchQuery, columnKey, newDirection);
  };

  // Handle "See Details" action
  const handleSeeDetails = async (documentId) => {
    try {
      const response = await api.get(`/SalesDocument/${documentId}`);
      setSelectedDocument(response);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Error fetching document details:", err);
      setToast({ type: "error", message: "Failed to load document details." });
    }
  };

  // Handle "Print" action
  const handlePrint = async (documentId) => {
    try {
      const response = await api.get(`/SalesDocument/${documentId}`);
      printDocument(response);
    } catch (err) {
      console.error("Error fetching document for print:", err);
      setToast({ type: "error", message: "Failed to load document for printing." });
    }
  };

  // Print document function
  const printDocument = (doc) => {
    const printWindow = window.open("", "_blank");

    const documentTypeLabel = salesDocumentTypesData.find(t => t.id === doc.documentType)?.value || "Document";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.documentNumber} - ${documentTypeLabel}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 { font-size: 24px; margin-bottom: 10px; }
          h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #333; }
          .header-info { margin-bottom: 20px; }
          .header-info p { margin: 5px 0; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .totals {
            margin-top: 20px;
            text-align: right;
          }
          .totals p {
            margin: 5px 0;
            font-size: 16px;
          }
          .totals .grand-total {
            font-size: 20px;
            font-weight: bold;
            margin-top: 10px;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>${documentTypeLabel}</h1>
        <div class="header-info">
          <p><strong>Document Number:</strong> ${doc.documentNumber}</p>
          <p><strong>Issue Date:</strong> ${new Date(doc.issueDate).toLocaleString()}</p>
          ${doc.description ? `<p><strong>Description:</strong> ${doc.description}</p>` : ''}
          ${doc.clientId ? `<p><strong>Client ID:</strong> ${doc.clientId}</p>` : ''}
        </div>

        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Unit Price (Net)</th>
              <th>Tax Rate</th>
              <th>Line Net</th>
              <th>Line Tax</th>
              <th>Line Gross</th>
            </tr>
          </thead>
          <tbody>
            ${doc.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.productSKU || 'N/A'}</td>
                <td>${item.quantity}</td>
                <td>${item.unitPriceNet.toFixed(2)}</td>
                <td>${item.taxCode || 'N/A'}</td>
                <td>${item.lineNet.toFixed(2)}</td>
                <td>${item.lineTax.toFixed(2)}</td>
                <td>${item.lineGross.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <p><strong>Total Net:</strong> ${doc.totalNet.toFixed(2)}</p>
          <p><strong>Total Tax:</strong> ${doc.totalTax.toFixed(2)}</p>
          <p class="grand-total"><strong>Total Gross:</strong> ${doc.totalGross.toFixed(2)}</p>
        </div>

        ${doc.payments.length > 0 ? `
          <h2>Payments</h2>
          <table>
            <thead>
              <tr>
                <th>Payment Method</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${doc.payments.map(payment => `
                <tr>
                  <td>${paymentOptionsData.find(p => p.id === payment.paymentOption)?.value || payment.paymentOption}</td>
                  <td>${payment.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "€0.00";
    return `€${Number(amount).toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return "Invalid Date";
    }
  };

  // Get document type label
  const getDocumentTypeLabel = (typeId) => {
    return salesDocumentTypesData.find(t => t.id === typeId)?.value || "Unknown";
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  // Close filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  return (
    <div className="sales-documents-page">
      <div className="page-wrapper">
        <Header user={user} onLogout={handleLogout} />

      <div className="page-container">
        <div className="page-header">
          <h1>Sales Documents</h1>
        </div>

        {/* Search and Filter Bar */}
        <div className="controls-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by document number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button
            className="btn-filter"
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters {Object.values(filters).some(v => v) ? "(Active)" : ""}
          </button>

          {Object.values(filters).some(v => v) && (
            <button className="btn-clear-filters" onClick={handleClearFilters}>
              Clear Filters
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <div className="filter-row">
              <div className="filter-group">
                <label>Document Type</label>
                <select
                  value={filters.documentType}
                  onChange={(e) => handleFilterChange("documentType", e.target.value)}
                >
                  {documentTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Payment Type</label>
                <select
                  value={filters.paymentType}
                  onChange={(e) => handleFilterChange("paymentType", e.target.value)}
                >
                  {paymentTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label>Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                />
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label>Min Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Max Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={col.sortable ? "sortable" : ""}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    {col.label}
                    {col.sortable && sortColumn === col.key && (
                      <span className="sort-indicator">
                        {sortDirection === "asc" ? " ▲" : " ▼"}
                      </span>
                    )}
                  </th>
                ))}
                <th style={{ width: "12%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!documents || documents.length === 0) && !loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="no-data">
                    No sales documents found.
                  </td>
                </tr>
              ) : (
                (documents || []).map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.documentNumber}</td>
                    <td>{doc.numberOfProducts}</td>
                    <td>{formatCurrency(doc.totalTax)}</td>
                    <td>{formatCurrency(doc.totalNet)}</td>
                    <td>{formatCurrency(doc.totalGross)}</td>
                    <td>{doc.paymentType}</td>
                    <td>{formatDate(doc.issueDate)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-details"
                          onClick={() => handleSeeDetails(doc.id)}
                          title="See Details"
                        >
                          Details
                        </button>
                        <button
                          className="btn-action btn-print"
                          onClick={() => handlePrint(doc.id)}
                          title="Print Document"
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Loading indicator */}
          {loading && (
            <div className="loading-indicator">
              <p>Loading...</p>
            </div>
          )}

          {/* Infinite scroll trigger */}
          {hasMore && !loading && <div ref={observerRef} className="scroll-trigger" />}
        </div>
      </div>

      {/* Document Details Modal */}
      {showDetailsModal && selectedDocument && (
        <DocumentDetailsModal
          document={selectedDocument}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedDocument(null);
          }}
        />
      )}

      {/* Toast Messages */}
      {toast && (
        <MessageBox
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      </div>
    </div>
  );
}
