import React from "react";
import Modal from "../../../components/Modal";
import { salesDocumentTypesData } from "../../../data/salesDocumentTypes";
import { paymentOptionsData } from "../../../data/paymentOptions";
import "../../../styles/PagesStyles/salesDocuments.css";

export default function DocumentDetailsModal({ document, onClose }) {
  if (!document) return null;

  const formatCurrency = (amount) => `${amount.toFixed(2)}`;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const getDocumentTypeLabel = (typeId) => {
    return salesDocumentTypesData.find(t => t.id === typeId)?.value || "Unknown";
  };

  const getPaymentTypeLabel = (paymentId) => {
    return paymentOptionsData.find(p => p.id === paymentId)?.value || "Unknown";
  };

  return (
    <Modal title="Sales Document Details" onClose={onClose}>
      <div className="document-details-content">
        {/* Document Header Information */}
        <div className="details-section">
          <h3>Document Information</h3>
          <div className="details-grid">
            <div className="detail-item">
              <label>Document Number:</label>
              <span>{document.documentNumber}</span>
            </div>
            <div className="detail-item">
              <label>Document Type:</label>
              <span>{getDocumentTypeLabel(document.documentType)}</span>
            </div>
            <div className="detail-item">
              <label>Issue Date:</label>
              <span>{formatDate(document.issueDate)}</span>
            </div>
            {document.clientId && (
              <div className="detail-item">
                <label>Client ID:</label>
                <span>{document.clientId}</span>
              </div>
            )}
            {document.description && (
              <div className="detail-item full-width">
                <label>Description:</label>
                <span>{document.description}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Section */}
        <div className="details-section">
          <h3>Items ({document.items.length})</h3>
          <div className="details-table-container">
            <table className="details-table">
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
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {document.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{item.productSKU || 'N/A'}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unitPriceNet)}</td>
                    <td>{item.taxCode || 'N/A'}</td>
                    <td>{formatCurrency(item.lineNet)}</td>
                    <td>{formatCurrency(item.lineTax)}</td>
                    <td>{formatCurrency(item.lineGross)}</td>
                    <td>{item.fromLocationCode || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="details-section">
          <h3>Totals</h3>
          <div className="totals-grid">
            <div className="total-item">
              <label>Total Net:</label>
              <span>{formatCurrency(document.totalNet)}</span>
            </div>
            <div className="total-item">
              <label>Total Tax:</label>
              <span>{formatCurrency(document.totalTax)}</span>
            </div>
            <div className="total-item grand-total">
              <label>Total Gross:</label>
              <span>{formatCurrency(document.totalGross)}</span>
            </div>
          </div>
        </div>

        {/* Payments Section */}
        {document.payments && document.payments.length > 0 && (
          <div className="details-section">
            <h3>Payments ({document.payments.length})</h3>
            <div className="details-table-container">
              <table className="details-table">
                <thead>
                  <tr>
                    <th>Payment Method</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {document.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{getPaymentTypeLabel(payment.paymentOption)}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {document.payments.length > 1 && (
              <div className="payment-summary">
                <label>Total Paid:</label>
                <span>{formatCurrency(document.payments.reduce((sum, p) => sum + p.amount, 0))}</span>
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <div className="modal-actions">
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
