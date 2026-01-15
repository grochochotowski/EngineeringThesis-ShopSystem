// === IMPORTS ===
import React, { useState } from "react";
import { api } from "../../../api/apiClient";
import Header from "../../../components/Header";
import MessageBox from "../../../components/MessageBox";
import { printInventoryReportPDF } from "../../../utils/printService";
import "../../../styles/PagesStyles/baseListPage.css";
import "../../../styles/PagesStyles/reports.css";

// === CONSTANTS ===
/**
 * Inventory change type definitions
 * Maps change types to display labels and colors for badges
 * Each type has a value (enum number), label (display text), and color (hex)
 */
const CHANGE_TYPES = {
  Add: { label: "Add", value: 0, color: "#4CAF50" }, // Green - products added to warehouse
  Remove: { label: "Remove", value: 1, color: "#f44336" }, // Red - products removed from warehouse
  Move: { label: "Move", value: 2, color: "#2196F3" }, // Blue - products transferred between locations
  Sell: { label: "Sell", value: 3, color: "#FF9800" }, // Orange - products sold via POS
  Return: { label: "Return", value: 4, color: "#9C27B0" }, // Purple - products returned to warehouse
  Collect: { label: "Collect", value: 5, color: "#00BCD4" }, // Cyan - products collected for shipment
  Send: { label: "Send", value: 6, color: "#FF5722" }, // Deep Orange - products sent in shipment
};

// === COMPONENT ===
/**
 * InventoryReports page - Generate and view inventory change reports
 * Read-only reporting page with no modals or data modification
 * Supports flexible date range selection (presets + custom)
 * Filters by change type and search term (SKU/EAN/product name)
 * Displays summary statistics and detailed change log
 * Supports PDF export via printService utility
 */
export default function InventoryReports() {
  // === STATE ===
  // User context
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}"); // Current logged-in user

  // Filter state
  const [datePreset, setDatePreset] = useState("custom"); // Selected date preset (custom, today, yesterday, etc.)
  const [dateFrom, setDateFrom] = useState(""); // Start date for report (YYYY-MM-DD format)
  const [dateTo, setDateTo] = useState(""); // End date for report (YYYY-MM-DD format)
  const [selectedChangeType, setSelectedChangeType] = useState(""); // Filter by change type (empty = all)
  const [searchTerm, setSearchTerm] = useState(""); // Search term for product SKU/EAN/name

  // Data state
  const [reportData, setReportData] = useState(null); // Generated report data from API
  const [loading, setLoading] = useState(false); // Loading indicator for report generation

  // UI state
  const [toast, setToast] = useState(null); // Toast notification state (message, type)

  // === DATE FORMATTING HELPERS ===
  /**
   * Formats Date object for input field
   * @param {Date} date - Date object to format
   * @returns {string} Date string in YYYY-MM-DD format
   */
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  /**
   * Formats ISO date string for display
   * @param {string} dateString - ISO date string from API
   * @returns {string} Date string in DD/MM/YYYY format
   */
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  /**
   * Formats ISO date string for time display
   * @param {string} dateString - ISO date string from API
   * @returns {string} Time string in HH:MM:SS format
   */
  const formatTimeForDisplay = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Time";

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  // === EVENT HANDLERS ===
  /**
   * Handles date preset selection
   * Automatically calculates and sets date range based on preset
   * Supports: today, yesterday, last week, last month, last year, all time, custom
   * @param {Event} e - Change event from select element
   */
  const handlePresetChange = (e) => {
    const preset = e.target.value;
    setDatePreset(preset);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let from = null;
    let to = null;

    switch (preset) {
      case "today":
        from = today;
        to = today;
        break;
      case "yesterday":
        from = new Date(today);
        from.setDate(from.getDate() - 1);
        to = new Date(today);
        to.setDate(to.getDate() - 1);
        break;
      case "lastWeek":
        from = new Date(today);
        from.setDate(from.getDate() - 7);
        to = today;
        break;
      case "lastMonth":
        from = new Date(today);
        from.setDate(from.getDate() - 30);
        to = today;
        break;
      case "lastYear":
        from = new Date(today);
        from.setDate(from.getDate() - 365);
        to = today;
        break;
      case "all":
        from = null;
        to = null;
        break;
      case "custom":
      default:
        return;
    }

    setDateFrom(from ? formatDateForInput(from) : "");
    setDateTo(to ? formatDateForInput(to) : "");
  };

  /**
   * Handles manual date from changes
   * Automatically switches to custom preset when dates are manually edited
   * @param {Event} e - Change event from date input
   */
  const handleDateFromChange = (e) => {
    setDateFrom(e.target.value);
    setDatePreset("custom");
  };

  /**
   * Handles manual date to changes
   * Automatically switches to custom preset when dates are manually edited
   * @param {Event} e - Change event from date input
   */
  const handleDateToChange = (e) => {
    setDateTo(e.target.value);
    setDatePreset("custom");
  };

  /**
   * Generates inventory report based on selected criteria
   * Validates custom date range before submitting
   * Fetches up to 1000 inventory changes from API
   * Sets report data and shows success/error toast
   */
  const handleGenerateReport = async () => {
    // Validate custom date range
    if (datePreset === "custom" && (!dateFrom || !dateTo)) {
      setToast({ type: "error", message: "Please select both From Date and To Date for custom range." });
      return;
    }

    setLoading(true);
    try {
      // Build API request parameters
      const params = { pageSize: 1000 };

      // Add date range if provided
      if (dateFrom) params.from = new Date(dateFrom).toISOString();
      if (dateTo) {
        // Set end date to end of day (23:59:59.999)
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        params.to = endDate.toISOString();
      }

      // Add change type filter if selected
      if (selectedChangeType) params.changeType = selectedChangeType;

      // Add search term if provided
      if (searchTerm) params.q = searchTerm;

      // Fetch report data from API
      const data = await api.get("/InventoryChange", { params });
      setReportData(data);
      setToast({ type: "success", message: "Report generated successfully!" });
    } catch (err) {
      console.error("Failed to generate report:", err);
      setToast({ type: "error", message: err.response?.data?.error || "Failed to generate report." });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generates PDF export of the current report
   * Uses printService utility to create formatted PDF
   * Includes summary statistics and detailed change log
   */
  const handlePrint = async () => {
    if (!reportData) {
      setToast({ type: "error", message: "No report data to print. Please generate a report first." });
      return;
    }

    try {
      const fileName = await printInventoryReportPDF(
        {
          items: reportData.items,
          summary: summary,
          dateFrom: dateFrom,
          dateTo: dateTo,
          generatedAt: new Date().toISOString(),
          generatedBy: currentUser?.name || "Unknown User",
        },
        {
          formatDate: formatDateForDisplay,
          formatTime: formatTimeForDisplay,
          getChangeTypeInfo: (changeType) => {
            return CHANGE_TYPES[changeType] || { label: changeType || "Unknown", color: "#757575" };
          },
        }
      );
      setToast({ type: "success", message: `Report saved as ${fileName}` });
    } catch (error) {
      console.error("Failed to print report:", error);
      setToast({ type: "error", message: "Failed to generate PDF. Please try again." });
    }
  };

  // === RENDERING HELPERS ===
  /**
   * Renders a colored badge for change type
   * Uses color from CHANGE_TYPES constant
   * @param {string} changeType - Change type key (e.g., "Add", "Remove")
   * @returns {JSX.Element} Styled span element with change type label
   */
  const getChangeTypeBadge = (changeType) => {
    // changeType is a string like "Add", "Remove", etc.
    const typeInfo = CHANGE_TYPES[changeType] || { label: changeType || "Unknown", color: "#757575" };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 8px",
          borderRadius: "4px",
          backgroundColor: typeInfo.color,
          color: "white",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        {typeInfo.label}
      </span>
    );
  };

  /**
   * Calculates summary statistics from report data
   * Aggregates changes by type and calculates total added/removed quantities
   * @returns {object|null} Summary object with totalChanges, byType, totalAdded, totalRemoved
   */
  const calculateSummary = () => {
    if (!reportData || !reportData.items) return null;

    const summary = {
      totalChanges: reportData.totalCount || 0, // Total number of changes
      byType: {}, // Count and quantity by change type
      totalAdded: 0, // Total quantity added (positive changes)
      totalRemoved: 0, // Total quantity removed (negative changes)
    };

    // Initialize counts for all change types
    Object.keys(CHANGE_TYPES).forEach(key => {
      summary.byType[key] = {
        count: 0, // Number of changes of this type
        quantity: 0, // Total quantity affected
        label: CHANGE_TYPES[key].label,
      };
    });

    // Aggregate statistics from report items
    reportData.items.forEach(change => {
      // changeType is a string like "Add", "Remove", etc.
      const typeKey = change.changeType;
      if (summary.byType[typeKey]) {
        summary.byType[typeKey].count++;
        summary.byType[typeKey].quantity += Math.abs(change.quantity);
      }

      // Calculate total added/removed (positive vs negative quantities)
      if (change.quantity > 0) {
        summary.totalAdded += change.quantity;
      } else {
        summary.totalRemoved += Math.abs(change.quantity);
      }
    });

    return summary;
  };

  // Calculate summary for current report data
  const summary = calculateSummary();

  // === RENDER ===
  return (
    <div className="page-container">
      <Header user={currentUser} />
      <main className="page-content">
        <div className="base-list-wrapper">
          <div className="base-list-container">
            {/* === LEFT SIDEBAR (FILTER PANEL) === */}
            <aside className="sidebar">
              <h3 className="sidebar-title">Report Criteria</h3>

              {/* Date Range Preset Selector */}
              <div className="filter-group">
                <label>Date Range Preset</label>
                <select
                  value={datePreset}
                  onChange={handlePresetChange}
                  className="filter-input"
                >
                  <option value="custom">Custom</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="lastWeek">Last Week</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="lastYear">Last Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              {/* Date From Input */}
              <div className="filter-group date-group">
                <label>Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={handleDateFromChange}
                  className="filter-input"
                />
              </div>

              {/* Date To Input */}
              <div className="filter-group date-group">
                <label>Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={handleDateToChange}
                  className="filter-input"
                />
              </div>

              {/* Change Type Filter */}
              <div className="filter-group">
                <label>Change Type</label>
                <select
                  value={selectedChangeType}
                  onChange={(e) => setSelectedChangeType(e.target.value)}
                  className="filter-input"
                >
                  <option value="">All Types</option>
                  {Object.entries(CHANGE_TYPES).map(([key, info]) => (
                    <option key={key} value={info.value}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Input */}
              <div className="filter-group">
                <label>Search (SKU/EAN/Product)</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="filter-input"
                />
              </div>

              {/* Action Buttons */}
              <div className="button-group">
                {/* Generate Report Button */}
                <button
                  className="btn-generate-report"
                  onClick={handleGenerateReport}
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate Report"}
                </button>

                {/* Print Report Button (only shown when report exists) */}
                {reportData && (
                  <button
                    className="btn-print-report"
                    onClick={handlePrint}
                  >
                    Print Report
                  </button>
                )}
              </div>
            </aside>

            {/* === MAIN CONTENT (REPORT DISPLAY) === */}
            <main className="main-content">
              {!reportData ? (
                // Empty state - no report generated yet
                <div className="reports-empty">
                  Select criteria and generate report
                </div>
              ) : (
                <div className="report-display">
                  {/* === REPORT TITLE === */}
                  <h2 className="report-title">
                    Inventory Changes Report
                    {dateFrom && dateTo && (
                      <> from {formatDateForDisplay(dateFrom)} to {formatDateForDisplay(dateTo)}</>
                    )}
                  </h2>

                  {/* === SUMMARY SECTION === */}
                  {summary && (
                    <section className="report-section">
                      <h3>Summary</h3>
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>Change Type</th>
                            <th>Count</th>
                            <th>Total Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Show only change types with count > 0 */}
                          {Object.entries(summary.byType).map(([key, value]) => (
                            value.count > 0 && (
                              <tr key={key}>
                                <td>{getChangeTypeBadge(key)}</td>
                                <td>{value.count}</td>
                                <td>{value.quantity}</td>
                              </tr>
                            )
                          ))}
                          {/* Totals Row */}
                          <tr className="tax-breakdown-total-row">
                            <td className="total-cell"><strong>Total</strong></td>
                            <td className="total-cell"><strong>{summary.totalChanges}</strong></td>
                            <td className="total-cell">
                              <strong>+{summary.totalAdded} / -{summary.totalRemoved}</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </section>
                  )}

                  {/* === DETAILED CHANGES SECTION === */}
                  <section className="report-section">
                    <h3>Detailed Changes</h3>
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Type</th>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>EAN</th>
                          <th>From Location</th>
                          <th>To Location</th>
                          <th>Quantity</th>
                          <th>User</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.items && reportData.items.length > 0 ? (
                          // Map through each inventory change
                          reportData.items.map((change, idx) => (
                            <tr key={idx}>
                              {/* Timestamp (Date + Time) */}
                              <td>
                                {formatDateForDisplay(change.timestamp)}
                                <br />
                                <small style={{ color: "#666" }}>
                                  {formatTimeForDisplay(change.timestamp)}
                                </small>
                              </td>

                              {/* Change Type Badge */}
                              <td>{getChangeTypeBadge(change.changeType)}</td>

                              {/* Product Name */}
                              <td>{change.productName || "N/A"}</td>

                              {/* Product SKU */}
                              <td>{change.productSku || "—"}</td>

                              {/* Product EAN */}
                              <td>{change.productEan || "—"}</td>

                              {/* From Location */}
                              <td>
                                {change.fromLocationCode ? (
                                  <span className="location-badge">{change.fromLocationCode}</span>
                                ) : (
                                  "—"
                                )}
                              </td>

                              {/* To Location */}
                              <td>
                                {change.toLocationCode ? (
                                  <span className="location-badge">{change.toLocationCode}</span>
                                ) : (
                                  "—"
                                )}
                              </td>

                              {/* Quantity (colored: green for positive, red for negative) */}
                              <td
                                style={{
                                  color: change.quantity > 0 ? "#4CAF50" : "#f44336",
                                  fontWeight: "600",
                                }}
                              >
                                {change.quantity > 0 ? "+" : ""}
                                {change.quantity}
                              </td>

                              {/* User Name */}
                              <td>{change.userName || "System"}</td>
                            </tr>
                          ))
                        ) : (
                          // No data message
                          <tr>
                            <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
                              No changes found for the selected criteria
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </section>

                  {/* === PAGINATION WARNING === */}
                  {/* Show warning if results are truncated at 1000 items */}
                  {reportData.totalCount > 1000 && (
                    <div style={{ padding: "10px", textAlign: "center", color: "#666" }}>
                      Showing first 1000 of {reportData.totalCount} changes. Narrow your search criteria to see more specific results.
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </main>

      {/* === TOAST NOTIFICATIONS === */}
      {toast && (
        <MessageBox
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
