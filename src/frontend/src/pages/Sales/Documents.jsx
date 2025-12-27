import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import { api } from "../../api/apiClient";
import { useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import Modal from "../../components/Modal";
import MessageBox from "../../components/MessageBox";
import { salesDocumentTypesData } from "../../data/salesDocumentTypes";
import { paymentOptionsData } from "../../data/paymentOptions";
import "../../styles/PagesStyles/salesDocuments.css";
import "../../styles/PagesStyles/baseListPage.css";

export default function SalesDocuments() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [selectedDocumentDetails, setSelectedDocumentDetails] = useState(null);
    const [toast, setToast] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const [documents, setDocuments] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [sortColumn, setSortColumn] = useState("documentNumber");
    const [sortDirection, setSortDirection] = useState("desc");

    // Filters - using arrays for checkboxes
    const [selectedDocumentTypes, setSelectedDocumentTypes] = useState([1, 2, 3]); // All types by default
    const [selectedPaymentTypes, setSelectedPaymentTypes] = useState([1, 2, 3, 4, 5]); // All payment types by default
    const [filters, setFilters] = useState({
        from: "",
        to: "",
        minAmount: "",
        maxAmount: "",
    });

    // Main search input
    const [searchQuery, setSearchQuery] = useState("");

    // Filters panel state
    const [showFilters, setShowFilters] = useState(false);
    const [showDocumentTypeFilters, setShowDocumentTypeFilters] = useState(false);
    const [showPaymentTypeFilters, setShowPaymentTypeFilters] = useState(false);

    const observerRef = useRef(null);
    const filtersRef = useRef(null);

    // Helper function to fetch documents from API
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

            // Only send backend sorting for columns that backend supports
            const backendSortableColumns = ["documentNumber", "issueDate"];
            const useBackendSort = currentSortColumn && backendSortableColumns.includes(currentSortColumn);

            // Build params
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

            // Add document types if selected (note: backend may not support multiple, so we'll filter client-side if needed)
            if (currentDocumentTypes && currentDocumentTypes.length > 0 && currentDocumentTypes.length < 3) {
                // If not all types selected, add filter
                params.type = currentDocumentTypes[0]; // Backend might only support single type
            }

            const { items, totalPages } = await api.get("/SalesDocument", {
                params,
                cancelToken: source.token,
            });

            if (items?.length) {
                // Client-side filtering for document types and payment types
                let filteredItems = items;

                // Filter by document types if not all selected
                if (currentDocumentTypes && currentDocumentTypes.length > 0 && currentDocumentTypes.length < 3) {
                    filteredItems = filteredItems.filter(item => {
                        // Backend returns enum as string (e.g., "Receipt"), need to map to ID
                        const docType = salesDocumentTypesData.find(t => t.value === item.documentType);
                        return docType ? currentDocumentTypes.includes(docType.id) : false;
                    });
                }

                // Filter by payment types if not all selected
                const allPaymentTypes = [1, 2, 3,]; // Card, Cash, GiftCard
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
            if (axios.isCancel(err)) {
                return;
            }
            console.error(err);
            setError("Failed to load sales documents.");
        } finally {
            setLoading(false);
        }
    };

    // Initialize data loaded flag
    useEffect(() => {
        setInitialDataLoaded(true);
    }, []);

    // Handle auto-search from query parameters
    useEffect(() => {
        const searchParam = searchParams.get("search");
        if (searchParam && initialDataLoaded) {
            setSearchQuery(searchParam);
            setSearchParams({});
        }
    }, [searchParams, initialDataLoaded, setSearchParams]);

    const debouncedFetchDocuments = useCallback(() => {
        if (!initialDataLoaded) return;
        const delay = setTimeout(() => {
            setDocuments([]);
            setPageNumber(1);
            fetchDocumentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedDocumentTypes, selectedPaymentTypes);
        }, 500);

        return () => clearTimeout(delay);
    }, [filters, searchQuery, initialDataLoaded, sortColumn, sortDirection, selectedDocumentTypes, selectedPaymentTypes]);

    const immediateFetchDocuments = useCallback(() => {
        if (!initialDataLoaded) return;
        setDocuments([]);
        setPageNumber(1);
        fetchDocumentsData(1, filters, searchQuery, sortColumn, sortDirection, selectedDocumentTypes, selectedPaymentTypes);
    }, [sortColumn, sortDirection, filters, searchQuery, initialDataLoaded, selectedDocumentTypes, selectedPaymentTypes]);

    // Trigger debounced fetch for search
    useEffect(() => {
        if (searchQuery) {
            debouncedFetchDocuments();
        } else {
            immediateFetchDocuments();
        }
    }, [debouncedFetchDocuments, immediateFetchDocuments, searchQuery]);

    // Trigger immediate fetch for filters and sorting
    useEffect(() => {
        immediateFetchDocuments();
    }, [filters, sortColumn, sortDirection, selectedDocumentTypes, selectedPaymentTypes]);

    // Infinite scroll observer
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
            fetchDocumentsData(pageNumber, filters, searchQuery, sortColumn, sortDirection, selectedDocumentTypes, selectedPaymentTypes);
        }
    }, [pageNumber]);

    // Columns for table
    const columns = [
        { key: "documentNumber", label: "Document #", width: "16%", sortable: true },
        { key: "documentType", label: "Type", width: "14%", sortable: false },
        { key: "issueDate", label: "Issue Date", width: "18%", sortable: true },
        { key: "totalGross", label: "Total", width: "12%", sortable: true },
        { key: "totalTax", label: "Total Tax", width: "12%", sortable: true },
        { key: "numberOfProducts", label: "Products", width: "12%", sortable: true },
        { key: "paymentType", label: "Payment", width: "16%", sortable: false },
    ];

    // Format date for display
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

    // Get document type label
    // Backend serializes enums as strings (e.g., "Receipt"), not numbers
    const getDocumentTypeLabel = (typeValue) => {
        // If it's a number, find by id
        if (typeof typeValue === 'number') {
            return salesDocumentTypesData.find(t => t.id === typeValue)?.value || "Unknown";
        }
        // If it's a string (enum name), find by value
        const found = salesDocumentTypesData.find(t => t.value === typeValue);
        return found ? found.value : "Unknown";
    };

    // Get payment option label
    // Backend serializes enums as strings (e.g., "GiftCard"), not numbers
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

    // Map documents to rows with raw values for sorting
    const baseRows = documents.map((d) => ({
        id: d.id,
        documentType: getDocumentTypeLabel(d.documentType),
        documentNumber: d.documentNumber,
        issueDate: formatDate(d.issueDate),
        totalGross: `$${d.totalGross.toFixed(2)}`,
        totalTax: `$${d.totalTax.toFixed(2)}`,
        numberOfProducts: d.numberOfProducts,
        paymentType: d.paymentType ? getPaymentOptionLabel(d.paymentType) : "—",
        rawDocumentType: d.documentType,
        rawClientId: d.clientId,
        rawTotalGross: d.totalGross,
        rawTotalTax: d.totalTax,
        rawNumberOfProducts: d.numberOfProducts,
        rawIssueDate: new Date(d.issueDate),
    }));

    // Frontend sorting for columns that need it
    const rows = useMemo(() => {
        if (!sortColumn || !sortDirection) return baseRows;

        // Columns that need frontend sorting
        const frontendSortColumns = ["totalGross", "totalTax", "numberOfProducts"];

        if (!frontendSortColumns.includes(sortColumn)) {
            return baseRows; // Backend handles documentNumber and issueDate
        }

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

    const user = JSON.parse(localStorage.getItem("user"));

    // Updating search query
    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setSelectedDocument(null);
        setSelectedDocumentDetails(null);
    };

    // Auto-updating filters
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    // Handle checkbox toggle for document types
    const handleDocumentTypeToggle = (typeId, checked) => {
        setSelectedDocumentTypes(prev => {
            if (checked) {
                return [...prev, typeId];
            } else {
                return prev.filter(id => id !== typeId);
            }
        });
    };

    // Handle checkbox toggle for payment types
    const handlePaymentTypeToggle = (paymentId, checked) => {
        setSelectedPaymentTypes(prev => {
            if (checked) {
                return [...prev, paymentId];
            } else {
                return prev.filter(id => id !== paymentId);
            }
        });
    };

    // Reset all filters
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

    // Close filters when clicking outside
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

    // Handle row selection - just select the row, don't load details automatically
    const handleRowSelect = (row) => {
        if (selectedDocument && selectedDocument.id === row.id) {
            setSelectedDocument(null);
        } else {
            setSelectedDocument(row);
        }
    };

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

    // Handle View Details button - load details and open modal
    const handleViewDetails = async () => {
        if (!selectedDocument) {
            setToast({
                message: "Please select a document to view details.",
                type: "warning",
            });
            return;
        }

        try {
            const full = await api.get(`/SalesDocument/${selectedDocument.id}`);
            setSelectedDocumentDetails(full);
            setShowDetailsModal(true);
        } catch (err) {
            console.error(err);
            setToast({
                message: err.response?.data?.message || "Failed to load document details.",
                type: "error",
            });
        }
    };

    // Handle Print button - show alert
    const handlePrint = () => {
        if (!selectedDocument) {
            setToast({
                message: "Please select a document to print.",
                type: "warning",
            });
            return;
        }

        // Show web alert
        alert("printing");
    };

    // Render
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
                            {/* Search */}
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

                            {/* Table */}
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
                                        {rows.length === 0 && !loading ? (
                                            <tr>
                                                <td colSpan={columns.length} className="no-data">
                                                    No documents found
                                                </td>
                                            </tr>
                                        ) : (
                                            rows.map(row => (
                                                <tr
                                                    key={row.id}
                                                    className={selectedDocument && selectedDocument.id === row.id ? "selected" : ""}
                                                    onClick={() => handleRowSelect(row)}
                                                >
                                                    {columns.map(col => {
                                                        if (col.key === "paymentType" && row[col.key] !== "—") {
                                                            return (
                                                                <td key={col.key}>
                                                                    <span className={`payment-badge ${row[col.key].toLowerCase().replace(/\s+/g, '-')}`}>
                                                                        {row[col.key]}
                                                                    </span>
                                                                </td>
                                                            );
                                                        }
                                                        return <td key={col.key}>{row[col.key]}</td>;
                                                    })}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>

                                {/* Infinite scroll sentinel */}
                                <div ref={observerRef} style={{ height: "1px" }} />
                                {loading && (
                                    <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Details Modal */}
            {showDetailsModal && selectedDocumentDetails && (
                <Modal
                    title={`Sales Document #${selectedDocumentDetails.documentNumber}`}
                    onClose={() => setShowDetailsModal(false)}
                    wide
                >
                    <div className="document-details-modal">
                        {/* Document Header Information */}
                        <div className="detail-section">
                            <h3>Document Information</h3>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Document ID:</span>
                                    <span className="detail-value">{selectedDocumentDetails.id}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Document Type:</span>
                                    <span className="detail-value">{getDocumentTypeLabel(selectedDocumentDetails.documentType)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Document Number:</span>
                                    <span className="detail-value">{selectedDocumentDetails.documentNumber}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Issue Date:</span>
                                    <span className="detail-value">{formatDate(selectedDocumentDetails.issueDate)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Client ID:</span>
                                    <span className="detail-value">{selectedDocumentDetails.clientId || "—"}</span>
                                </div>
                                {selectedDocumentDetails.description && (
                                    <div className="detail-item full-width">
                                        <span className="detail-label">Description:</span>
                                        <span className="detail-value">{selectedDocumentDetails.description}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="detail-section">
                            <h3>Document Items</h3>
                            {selectedDocumentDetails.items && selectedDocumentDetails.items.length > 0 ? (
                                <div className="items-table-wrapper">
                                    <table className="items-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>SKU</th>
                                                <th>Location</th>
                                                <th>Qty</th>
                                                <th>Unit Price (Net)</th>
                                                <th>Tax Rate</th>
                                                <th>Line Net</th>
                                                <th>Line Tax</th>
                                                <th>Line Gross</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedDocumentDetails.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="product-name">{item.productName || `Product #${item.productId}`}</td>
                                                    <td className="sku">{item.productSKU || "—"}</td>
                                                    <td className="location">
                                                        {item.fromLocationCode ? (
                                                            <span className="location-badge">{item.fromLocationCode}</span>
                                                        ) : (
                                                            <span className="no-location">—</span>
                                                        )}
                                                    </td>
                                                    <td className="quantity">{item.quantity}</td>
                                                    <td className="price">${item.unitPriceNet.toFixed(2)}</td>
                                                    <td className="tax-rate">{item.taxCode || "—"}</td>
                                                    <td className="line-net">${item.lineNet.toFixed(2)}</td>
                                                    <td className="line-tax">${item.lineTax.toFixed(2)}</td>
                                                    <td className="line-gross">${item.lineGross.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="totals-row">
                                                <td colSpan="6" className="totals-label">Subtotal:</td>
                                                <td className="total-net">${selectedDocumentDetails.totalNet.toFixed(2)}</td>
                                                <td className="total-tax">${selectedDocumentDetails.totalTax.toFixed(2)}</td>
                                                <td className="total-gross">${selectedDocumentDetails.totalGross.toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <p className="no-data">No items in this document.</p>
                            )}
                        </div>

                        {/* Tax Breakdown Section */}
                        <div className="detail-section">
                            <h3>Tax Summary</h3>
                            <div className="tax-summary">
                                <div className="tax-row">
                                    <span className="tax-label">Total Net Amount:</span>
                                    <span className="tax-value">${selectedDocumentDetails.totalNet.toFixed(2)}</span>
                                </div>
                                <div className="tax-row">
                                    <span className="tax-label">Total Tax Amount:</span>
                                    <span className="tax-value tax-amount">${selectedDocumentDetails.totalTax.toFixed(2)}</span>
                                </div>
                                <div className="tax-row total">
                                    <span className="tax-label">Total Gross Amount:</span>
                                    <span className="tax-value gross-amount">${selectedDocumentDetails.totalGross.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payments Section */}
                        <div className="detail-section">
                            <h3>Payment Details</h3>
                            {selectedDocumentDetails.payments && selectedDocumentDetails.payments.length > 0 ? (
                                <div className="payments-table-wrapper">
                                    <table className="payments-table">
                                        <thead>
                                            <tr>
                                                <th>Payment Method</th>
                                                <th>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedDocumentDetails.payments.map((payment, idx) => (
                                                <tr key={idx}>
                                                    <td className="payment-method">
                                                        <span className={`payment-badge ${(getPaymentOptionLabel(payment.paymentOption) || 'Unspecified').toLowerCase().replace(/\s+/g, '-')}`}>
                                                            {getPaymentOptionLabel(payment.paymentOption)}
                                                        </span>
                                                    </td>
                                                    <td className="payment-amount">${payment.amount.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="totals-row">
                                                <td colSpan="2" style={{ textAlign: 'right', padding: '0.75rem', fontSize: '1.05rem' }}>
                                                    {(() => {
                                                        const totalAmount = selectedDocumentDetails.payments.reduce((sum, p) => sum + p.amount, 0);
                                                        const totalPaid = selectedDocumentDetails.payments.reduce((sum, p) => sum + (p.amountTendered || p.amount), 0);
                                                        const totalChange = selectedDocumentDetails.payments.reduce((sum, p) => sum + (p.change || 0), 0);

                                                        return (
                                                            <>
                                                                <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                                                                    Total Amount: ${totalAmount.toFixed(2)}
                                                                </span>
                                                                {' │ '}
                                                                <span style={{
                                                                    color: totalPaid === totalAmount ? '#10b981' : '#f97316',
                                                                    fontWeight: 'bold'
                                                                }}>
                                                                    Total Paid: ${totalPaid.toFixed(2)}
                                                                </span>
                                                                {' │ '}
                                                                <span style={{
                                                                    color: totalChange === 0 ? '#10b981' : (totalChange < 0 ? '#dc2626' : '#10b981'),
                                                                    fontWeight: 'bold'
                                                                }}>
                                                                    Total Change: {totalChange < 0 ? '-' : ''}${Math.abs(totalChange).toFixed(2)}
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <p className="no-data">No payments recorded for this document.</p>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Filters Panel */}
            {showFilters && (
                <div className="filters-panel" ref={filtersRef}>
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

                    {/* Document Types - Collapsible */}
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

                    {/* Payment Types - Collapsible */}
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

                    {/* Issue Date Range - One Line */}
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

                    {/* Amount Range - One Line */}
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
