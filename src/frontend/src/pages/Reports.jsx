import React, { useState } from "react";
import { api } from "../api/apiClient";
import Header from "../components/Header";
import MessageBox from "../components/MessageBox";
import { printSalesReportPDF } from "../utils/printService";
import "../styles/PagesStyles/baseListPage.css";
import "../styles/PagesStyles/reports.css";

export default function Reports() {
  const [datePreset, setDatePreset] = useState("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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

  // Format time for display (HH:MM)
  const formatTimeForDisplay = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Time";

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Format currency ($X,XXX.XX)
  const formatCurrency = (amount) => {
    return `$${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format percentage (XX%)
  const formatPercentage = (rate) => {
    return `${Number(rate).toFixed(2)}%`;
  };

  // Generate report
  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString();
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        params.dateTo = endDate.toISOString();
      }

      const data = await api.get("/Reports/sales", { params });
      setReportData(data);
      setToast({ type: "success", message: "Report generated successfully!" });
    } catch (err) {
      console.error("Failed to generate report:", err);
      setToast({ type: "error", message: err.response?.data?.error || "Failed to generate report." });
    } finally {
      setLoading(false);
    }
  };

  // Print report to PDF
  const handlePrintReport = async () => {
    if (!reportData) return;

    try {
      const formatters = {
        formatCurrency,
        formatPercentage,
        formatDate: formatDateForDisplay,
        formatTime: formatTimeForDisplay,
      };

      await printSalesReportPDF(reportData, formatters);
      // No toast message - PDF download starts automatically
    } catch (err) {
      console.error("Failed to print report:", err);
      setToast({ type: "error", message: "Failed to generate PDF." });
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

            <div className="filter-group">
              <label>From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={handleDateFromChange}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={handleDateToChange}
                className="filter-input"
              />
            </div>

            <button
              className="btn-generate-report"
              onClick={handleGenerateReport}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>

            <button
              className="btn-print-report"
              onClick={handlePrintReport}
              disabled={!reportData}
            >
              Print to PDF
            </button>
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
                  Sales Report from {formatDateForDisplay(reportData.dateFrom)} to{" "}
                  {formatDateForDisplay(reportData.dateTo)}
                </h2>

                {/* Earnings Summary Table */}
                <section className="report-section">
                  <h3>Earnings Summary</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Receipts</th>
                        <th>Invoices Personal</th>
                        <th>Invoices Company</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Count of Documents</td>
                        <td>{reportData.receipts.count}</td>
                        <td>{reportData.invoicesPersonal.count}</td>
                        <td>{reportData.invoicesCompany.count}</td>
                        <td className="total-cell">{reportData.total.count}</td>
                      </tr>
                      <tr>
                        <td>Total Net Amount</td>
                        <td>{formatCurrency(reportData.receipts.totalNet)}</td>
                        <td>{formatCurrency(reportData.invoicesPersonal.totalNet)}</td>
                        <td>{formatCurrency(reportData.invoicesCompany.totalNet)}</td>
                        <td className="total-cell">{formatCurrency(reportData.total.totalNet)}</td>
                      </tr>
                      <tr>
                        <td>Total Tax Amount</td>
                        <td>{formatCurrency(reportData.receipts.totalTax)}</td>
                        <td>{formatCurrency(reportData.invoicesPersonal.totalTax)}</td>
                        <td>{formatCurrency(reportData.invoicesCompany.totalTax)}</td>
                        <td className="total-cell">{formatCurrency(reportData.total.totalTax)}</td>
                      </tr>
                      <tr>
                        <td>Total Gross Amount</td>
                        <td>{formatCurrency(reportData.receipts.totalGross)}</td>
                        <td>{formatCurrency(reportData.invoicesPersonal.totalGross)}</td>
                        <td>{formatCurrency(reportData.invoicesCompany.totalGross)}</td>
                        <td className="total-cell">{formatCurrency(reportData.total.totalGross)}</td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                {/* Tax Breakdown Table */}
                <section className="report-section">
                  <h3>Tax Breakdown</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Tax Code</th>
                        <th>Tax Rate</th>
                        <th>Total Products</th>
                        <th>Distinct Products</th>
                        <th>Receipts Tax</th>
                        <th>Invoices Personal Tax</th>
                        <th>Invoices Company Tax</th>
                        <th>Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.taxBreakdown.map((tax, idx) => (
                        <tr key={idx}>
                          <td>{tax.taxCode}</td>
                          <td>{formatPercentage(tax.taxRate)}</td>
                          <td>{tax.totalProducts}</td>
                          <td>{tax.distinctProducts}</td>
                          <td>{formatCurrency(tax.taxReceipts)}</td>
                          <td>{formatCurrency(tax.taxInvoicesPersonal)}</td>
                          <td>{formatCurrency(tax.taxInvoicesCompany)}</td>
                          <td className="total-cell">{formatCurrency(tax.taxTotal)}</td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="tax-breakdown-total-row">
                        <td colSpan="2" className="total-cell"><strong>Total</strong></td>
                        <td className="total-cell">
                          <strong>{reportData.taxBreakdown.reduce((sum, tax) => sum + tax.totalProducts, 0)}</strong>
                        </td>
                        <td className="total-cell">
                          <strong>{reportData.taxBreakdown.reduce((sum, tax) => sum + tax.distinctProducts, 0)}</strong>
                        </td>
                        <td className="total-cell">
                          <strong>{formatCurrency(reportData.taxBreakdown.reduce((sum, tax) => sum + tax.taxReceipts, 0))}</strong>
                        </td>
                        <td className="total-cell">
                          <strong>{formatCurrency(reportData.taxBreakdown.reduce((sum, tax) => sum + tax.taxInvoicesPersonal, 0))}</strong>
                        </td>
                        <td className="total-cell">
                          <strong>{formatCurrency(reportData.taxBreakdown.reduce((sum, tax) => sum + tax.taxInvoicesCompany, 0))}</strong>
                        </td>
                        <td className="total-cell">
                          <strong>{formatCurrency(reportData.taxBreakdown.reduce((sum, tax) => sum + tax.taxTotal, 0))}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                {/* Footer */}
                <footer className="report-footer">
                  Report generated on {formatDateForDisplay(reportData.generatedAt)} at{" "}
                  {formatTimeForDisplay(reportData.generatedAt)} by {reportData.generatedBy}
                </footer>
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
