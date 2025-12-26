import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { api } from "../../api/apiClient";
import { useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import BaseListPage from "../BaseListPage";
import MessageBox from "../../components/MessageBox";
import { salesDocumentTypesData } from "../../data/salesDocumentTypes";
import { paymentOptionsData } from "../../data/paymentOptions";
import "../../styles/PagesStyles/salesDocuments.css";

export default function SalesDocuments() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedRow, setSelectedRow] = useState(null);
    const [selectedDocumentDetails, setSelectedDocumentDetails] = useState(null);
    const [toast, setToast] = useState(null);

    const [documents, setDocuments] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [sortColumn, setSortColumn] = useState("id");
    const [sortDirection, setSortDirection] = useState("desc");

    // Filters
    const [filters, setFilters] = useState({
        documentType: "",
        clientId: "",
        from: "",
        to: "",
        paymentType: "",
        minAmount: "",
        maxAmount: "",
    });

    // Main search input
    const [searchQuery, setSearchQuery] = useState("");

    // Client list for filter
    const [clients, setClients] = useState([]);

    const observerRef = useRef(null);
    const filtersRef = useRef(null);

    // Helper function to fetch documents from API
    const fetchDocumentsData = async (
        page,
        currentFilters,
        currentSearchQuery,
        currentSortColumn,
        currentSortDirection
    ) => {
        try {
            setLoading(true);
            const source = axios.CancelToken.source();
            const { items, totalPages } = await api.get("/SalesDocument", {
                params: {
                    PageNumber: page,
                    PageSize: 50,
                    ...(currentSearchQuery && { q: currentSearchQuery }),
                    ...(currentFilters.documentType !== "" && { type: currentFilters.documentType }),
                    ...(currentFilters.clientId && { clientId: currentFilters.clientId }),
                    ...(currentFilters.from && { from: currentFilters.from }),
                    ...(currentFilters.to && { to: currentFilters.to }),
                    ...(currentFilters.paymentType && { paymentType: currentFilters.paymentType }),
                    ...(currentFilters.minAmount && { minAmount: currentFilters.minAmount }),
                    ...(currentFilters.maxAmount && { maxAmount: currentFilters.maxAmount }),
                    ...(currentSortColumn && { orderBy: currentSortColumn }),
                    ...(currentSortDirection && { sortDirection: currentSortDirection }),
                },
                cancelToken: source.token,
            });

            if (items?.length) {
                setDocuments(items);
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

    // Load clients for filter
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const clientsRes = await api.get("/Clients", {
                    params: {
                        pageNumber: 1,
                        pageSize: 1000, // Get all clients for dropdown
                    },
                });
                setClients(clientsRes.items || []);
                setInitialDataLoaded(true);
            } catch (err) {
                console.error("Failed to fetch initial data", err);
                setError("Failed to load initial page data.");
            }
        };

        fetchInitialData();
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
            fetchDocumentsData(1, filters, searchQuery, sortColumn, sortDirection);
        }, 500);

        return () => clearTimeout(delay);
    }, [filters, searchQuery, initialDataLoaded, sortColumn, sortDirection]);

    const immediateFetchDocuments = useCallback(() => {
        if (!initialDataLoaded) return;
        setDocuments([]);
        setPageNumber(1);
        fetchDocumentsData(1, filters, searchQuery, sortColumn, sortDirection);
    }, [sortColumn, sortDirection, filters, searchQuery, initialDataLoaded]);

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
    }, [filters, sortColumn, sortDirection]);

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
            fetchDocumentsData(pageNumber, filters, searchQuery, sortColumn, sortDirection);
        }
    }, [pageNumber]);

    // Columns for table
    const columns = [
        { key: "id", label: "ID", width: "6%", sortable: true },
        { key: "documentType", label: "Type", width: "12%", sortable: true },
        { key: "documentNumber", label: "Document #", width: "14%", sortable: true },
        { key: "issueDate", label: "Issue Date", width: "14%", sortable: true },
        { key: "client", label: "Client", width: "16%", sortable: false },
        { key: "totalGross", label: "Total", width: "10%", sortable: true },
        { key: "numberOfProducts", label: "Products", width: "8%", sortable: true },
        { key: "paymentType", label: "Payment", width: "12%", sortable: true },
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
    const getDocumentTypeLabel = (typeId) => {
        return salesDocumentTypesData.find(t => t.id === typeId)?.value || "Unknown";
    };

    // Get client name
    const getClientName = (clientId) => {
        if (!clientId) return "—";
        const client = clients.find(c => c.id === clientId);
        return client ? `${client.name}${client.taxId ? ` (${client.taxId})` : ""}` : `Client #${clientId}`;
    };

    const rows = documents.map((d) => ({
        id: d.id,
        documentType: getDocumentTypeLabel(d.documentType),
        documentNumber: d.documentNumber,
        issueDate: formatDate(d.issueDate),
        client: getClientName(d.clientId),
        totalGross: `$${d.totalGross.toFixed(2)}`,
        numberOfProducts: d.numberOfProducts,
        paymentType: d.paymentType || "—",
        rawDocumentType: d.documentType,
        rawClientId: d.clientId,
    }));

    const user = JSON.parse(localStorage.getItem("user"));

    // Updating search query
    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setSelectedRow(null);
        setSelectedDocumentDetails(null);
    };

    // Auto-updating filters
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
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

    // Handle row selection to load full document details
    const handleRowSelect = async (row) => {
        if (!row) {
            setSelectedRow(null);
            setSelectedDocumentDetails(null);
            return;
        }

        setSelectedRow(row);
        try {
            const full = await api.get(`/SalesDocument/${row.id}`);
            setSelectedDocumentDetails(full);
        } catch (err) {
            console.error(err);
            setToast({
                message: err.response?.data?.message || "Failed to load document details.",
                type: "error",
            });
        }
    };

    const documentDetailsConfig = {
        status: null, // No status badge for sales documents
        fields: [
            { label: "ID", key: "id" },
            { label: "Document Type", key: "documentType", render: (data) => getDocumentTypeLabel(data.documentType) },
            { label: "Document Number", key: "documentNumber" },
            { label: "Issue Date", key: "issueDate", render: (data) => formatDate(data.issueDate) },
            { label: "Client", key: "clientId", render: (data) => getClientName(data.clientId) },
            { label: "Total Net", key: "totalNet", render: (data) => `$${data.totalNet.toFixed(2)}` },
            { label: "Total Tax", key: "totalTax", render: (data) => `$${data.totalTax.toFixed(2)}` },
            { label: "Total Gross", key: "totalGross", render: (data) => `$${data.totalGross.toFixed(2)}` },
            {
                label: "Items",
                key: "items",
                isColumn: true,
                render: (data) => {
                    if (!data.items || data.items.length === 0) return "No items";
                    return (
                        <div className="document-items-list">
                            {data.items.map((item, idx) => (
                                <div key={idx} className="document-item">
                                    <span className="item-name">{item.productName || `Product #${item.productId}`}</span>
                                    <span className="item-details">
                                        Qty: {item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.totalGross.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    );
                }
            },
            {
                label: "Payments",
                key: "payments",
                isColumn: true,
                render: (data) => {
                    if (!data.payments || data.payments.length === 0) return "No payments";
                    return (
                        <div className="document-payments-list">
                            {data.payments.map((payment, idx) => (
                                <div key={idx} className="document-payment">
                                    <span className="payment-type">{payment.paymentOption || "Unknown"}</span>
                                    <span className="payment-amount">${payment.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    );
                }
            },
            { label: "Description", key: "description", isColumn: true },
        ],
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

    // Handle View Details button
    const handleViewDetails = () => {
        if (!selectedRow) {
            setToast({
                message: "Please select a document to view details.",
                type: "warning",
            });
        }
        // Details are already shown in the details panel, so just show a message
        else {
            setToast({
                message: "Document details are displayed in the right panel.",
                type: "info",
            });
        }
    };

    // Handle Print button
    const handlePrint = () => {
        if (!selectedRow) {
            setToast({
                message: "Please select a document to print.",
                type: "warning",
            });
            return;
        }

        // TODO: Implement actual print functionality
        // For now, just show a placeholder message
        setToast({
            message: `Print functionality for document #${selectedRow.documentNumber} will be implemented soon.`,
            type: "info",
        });
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
                <BaseListPage
                    title="Sales Documents"
                    columns={columns}
                    data={rows}
                    loading={loading}
                    error={error}
                    selectedRow={selectedRow}
                    onSelectRow={handleRowSelect}
                    detailsData={selectedDocumentDetails}
                    detailsConfig={initialDataLoaded ? documentDetailsConfig : null}
                    onSort={handleSort}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onToggleFilters={() => setShowFilters((prev) => !prev)}
                    onSearchChange={handleSearchChange}
                    searchValue={searchQuery}
                    hideAddButton={true}
                    hideEditButton={true}
                    hideDeleteButton={true}
                    // Custom action buttons for View Details and Print
                    changePasswordButtonLabel="View Details"
                    changePasswordButtonClass="btn-view"
                    changePasswordDisabled={!selectedRow}
                    onChangePassword={handleViewDetails}
                    changePasswordButtonIcon={
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                            <path fill="none" stroke="currentColor" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path fill="none" stroke="currentColor" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                    }
                    changeLoginButtonLabel="Print"
                    changeLoginButtonClass="btn-print"
                    changeLoginDisabled={!selectedRow}
                    onChangeLogin={handlePrint}
                    changeLoginButtonIcon={
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                            <path fill="none" stroke="currentColor" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                        </svg>
                    }
                />

                {/* Sidebar filter panel */}
                {showFilters && (
                    <div className="filters-panel" ref={filtersRef}>
                        <h4>Filters</h4>

                        <div className="filter-group">
                            <label>Document Type:</label>
                            <select
                                name="documentType"
                                value={filters.documentType}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Types</option>
                                {salesDocumentTypesData
                                    .filter(t => t.id !== 0)
                                    .map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.value}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Client:</label>
                            <select
                                name="clientId"
                                value={filters.clientId}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Clients</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}{c.taxId ? ` (${c.taxId})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Payment Type:</label>
                            <select
                                name="paymentType"
                                value={filters.paymentType}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Payment Types</option>
                                {paymentOptionsData
                                    .filter(p => p.id !== 0)
                                    .map(p => (
                                        <option key={p.id} value={p.value}>
                                            {p.value}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Issue Date From:</label>
                            <input
                                type="date"
                                name="from"
                                value={filters.from}
                                onChange={handleFilterChange}
                            />
                        </div>

                        <div className="filter-group">
                            <label>Issue Date To:</label>
                            <input
                                type="date"
                                name="to"
                                value={filters.to}
                                onChange={handleFilterChange}
                            />
                        </div>

                        <div className="filter-group">
                            <label>Min Amount ($):</label>
                            <input
                                type="number"
                                name="minAmount"
                                placeholder="Min amount"
                                value={filters.minAmount}
                                onChange={handleFilterChange}
                                step="0.01"
                                min="0"
                            />
                        </div>

                        <div className="filter-group">
                            <label>Max Amount ($):</label>
                            <input
                                type="number"
                                name="maxAmount"
                                placeholder="Max amount"
                                value={filters.maxAmount}
                                onChange={handleFilterChange}
                                step="0.01"
                                min="0"
                            />
                        </div>
                    </div>
                )}

                {/* Infinite scroll sentinel */}
                <div ref={observerRef} style={{ height: "1px" }} />
                {loading && (
                    <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>
                )}
            </main>

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
