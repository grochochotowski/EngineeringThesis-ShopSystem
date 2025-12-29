import React, { useState, useEffect } from "react";
import { api } from "../../api/apiClient";
import Header from "../../components/Header";
import MessageBox from "../../components/MessageBox";
import { printInventoryReportPDF } from "../../utils/printService";
import "../../styles/PagesStyles/baseListPage.css";
import "../../styles/PagesStyles/reports.css";

const CHANGE_TYPES = {
  Add: { label: "Add", value: 0, color: "#4CAF50" },
  Remove: { label: "Remove", value: 1, color: "#f44336" },
  Move: { label: "Move", value: 2, color: "#2196F3" },
  Sell: { label: "Sell", value: 3, color: "#FF9800" },
  Return: { label: "Return", value: 4, color: "#9C27B0" },
  Collect: { label: "Collect", value: 5, color: "#00BCD4" },
  Send: { label: "Send", value: 6, color: "#FF5722" },
};

export default function InventoryReports() {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [datePreset, setDatePreset] = useState("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedChangeType, setSelectedChangeType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Handle preset date selection
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

  // Handle manual date changes
  const handleDateFromChange = (e) => {
    setDateFrom(e.target.value);
    setDatePreset("custom");
  };

  const handleDateToChange = (e) => {
    setDateTo(e.target.value);
    setDatePreset("custom");
  };

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format date for display (DD/MM/YYYY)
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format time for display (HH:MM:SS)
  const formatTimeForDisplay = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Time";

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  // Get change type badge
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

  // Generate report
  const handleGenerateReport = async () => {
    // Validate custom date range
    if (datePreset === "custom" && (!dateFrom || !dateTo)) {
      setToast({ type: "error", message: "Please select both From Date and To Date for custom range." });
      return;
    }

    setLoading(true);
    try {
      const params = { pageSize: 1000 };
      if (dateFrom) params.from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        params.to = endDate.toISOString();
      }
      if (selectedChangeType) params.changeType = selectedChangeType;
      if (searchTerm) params.q = searchTerm;

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

  // Calculate summary statistics
  const calculateSummary = () => {
    if (!reportData || !reportData.items) return null;

    const summary = {
      totalChanges: reportData.totalCount || 0,
      byType: {},
      totalAdded: 0,
      totalRemoved: 0,
    };

    // Initialize counts for all change types
    Object.keys(CHANGE_TYPES).forEach(key => {
      summary.byType[key] = {
        count: 0,
        quantity: 0,
        label: CHANGE_TYPES[key].label,
      };
    });

    reportData.items.forEach(change => {
      // changeType is a string like "Add", "Remove", etc.
      const typeKey = change.changeType;
      if (summary.byType[typeKey]) {
        summary.byType[typeKey].count++;
        summary.byType[typeKey].quantity += Math.abs(change.quantity);
      }

      // Calculate total added/removed
      if (change.quantity > 0) {
        summary.totalAdded += change.quantity;
      } else {
        summary.totalRemoved += Math.abs(change.quantity);
      }
    });

    return summary;
  };

  const summary = calculateSummary();

  // Handle print to PDF
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

  return (
    <div className="page-container">
      <Header />
      <main className="page-content">
        <div className="base-list-wrapper">
          <div className="base-list-container">
            {/* SIDEBAR */}
            <aside className="sidebar">
              <h3 className="sidebar-title">Report Criteria</h3>

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

              <div className="filter-group date-group">
                <label>Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={handleDateFromChange}
                  className="filter-input"
                />
              </div>

              <div className="filter-group date-group">
                <label>Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={handleDateToChange}
                  className="filter-input"
                />
              </div>

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

              <div className="button-group">
                <button
                  className="btn-generate-report"
                  onClick={handleGenerateReport}
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate Report"}
                </button>
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

            {/* MAIN CONTENT */}
            <main className="main-content">
              {!reportData ? (
                <div className="reports-empty">
                  Select criteria and generate report
                </div>
              ) : (
                <div className="report-display">
                  {/* Title */}
                  <h2 className="report-title">
                    Inventory Changes Report
                    {dateFrom && dateTo && (
                      <> from {formatDateForDisplay(dateFrom)} to {formatDateForDisplay(dateTo)}</>
                    )}
                  </h2>

                  {/* Summary Section */}
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
                          {Object.entries(summary.byType).map(([key, value]) => (
                            value.count > 0 && (
                              <tr key={key}>
                                <td>{getChangeTypeBadge(key)}</td>
                                <td>{value.count}</td>
                                <td>{value.quantity}</td>
                              </tr>
                            )
                          ))}
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

                  {/* Detailed Changes Section */}
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
                          reportData.items.map((change, idx) => (
                            <tr key={idx}>
                              <td>
                                {formatDateForDisplay(change.timestamp)}
                                <br />
                                <small style={{ color: "#666" }}>
                                  {formatTimeForDisplay(change.timestamp)}
                                </small>
                              </td>
                              <td>{getChangeTypeBadge(change.changeType)}</td>
                              <td>{change.productName || "N/A"}</td>
                              <td>{change.productSku || "—"}</td>
                              <td>{change.productEan || "—"}</td>
                              <td>
                                {change.fromLocationCode ? (
                                  <span className="location-badge">{change.fromLocationCode}</span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td>
                                {change.toLocationCode ? (
                                  <span className="location-badge">{change.toLocationCode}</span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td
                                style={{
                                  color: change.quantity > 0 ? "#4CAF50" : "#f44336",
                                  fontWeight: "600",
                                }}
                              >
                                {change.quantity > 0 ? "+" : ""}
                                {change.quantity}
                              </td>
                              <td>{change.userName || "System"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
                              No changes found for the selected criteria
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </section>

                  {/* Pagination Info */}
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
