// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * ViewDetailsModal - Displays comprehensive sales document details
 * Shows document header, line items, tax breakdown, and payment information
 * Supports both sale and return documents with client information
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.document - Full sales document object with items and payments
 * @param {function} props.onClose - Callback to close the modal
 * @param {function} props.formatDate - Function to format dates for display
 * @param {function} props.getDocumentTypeLabel - Function to get readable document type
 * @param {function} props.getPaymentOptionLabel - Function to get readable payment option
 */
export default function ViewDetailsModal({
  show,
  document,
  onClose,
  formatDate,
  getDocumentTypeLabel,
  getPaymentOptionLabel,
}) {
  // Don't render if modal is not shown or document is missing
  if (!show || !document) return null;

  // Determine if this is a return document
  const isReturn = document.documentType === "ReceiptReturn" || document.documentType === "InvoiceReturn";

  return (
    <Modal
      title={
        isReturn
          ? `Return Document #${document.documentNumber}`
          : `Sales Document #${document.documentNumber}`
      }
      onClose={onClose}
      wide
    >
      <div className="document-details-modal">
        {/* === DOCUMENT HEADER INFORMATION === */}
        <div className="detail-section">
          <h3>Document Information</h3>
          <div className="detail-grid">
            {/* Document Number */}
            <div className="detail-item">
              <span className="detail-label">Document Number:</span>
              <span className="detail-value">{document.documentNumber}</span>
            </div>

            {/* Original Document Number (for returns) */}
            {document.originalDocumentNumber && (
              <div className="detail-item">
                <span className="detail-label">Original Document:</span>
                <span className="detail-value">{document.originalDocumentNumber}</span>
              </div>
            )}

            {/* Document Type */}
            <div className="detail-item">
              <span className="detail-label">Document Type:</span>
              <span className="detail-value">{getDocumentTypeLabel(document.documentType)}</span>
            </div>

            {/* Issue Date */}
            <div className="detail-item">
              <span className="detail-label">Issue Date:</span>
              <span className="detail-value">{formatDate(document.issueDate)}</span>
            </div>

            {/* Created By User */}
            <div className="detail-item">
              <span className="detail-label">Created By:</span>
              <span className="detail-value">{document.userName || "—"}</span>
            </div>

            {/* Client Information */}
            <div className="detail-item">
              <span className="detail-label">Client:</span>
              <span className="detail-value">
                {document.clientName || "—"}
                {/* Show Tax ID for company clients */}
                {document.clientData?.type === "Company" && document.clientData?.taxId && (
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Tax ID: {document.clientData.taxId}
                  </div>
                )}
              </span>
            </div>

            {/* Client Address */}
            <div className="detail-item">
              <span className="detail-label">Client Address:</span>
              <span className="detail-value">
                {document.clientData?.address ? (
                  `${document.clientData.address.street} ${document.clientData.address.building}${document.clientData.address.premises ? `/${document.clientData.address.premises}` : ''}, ${document.clientData.address.postalCode} ${document.clientData.address.city}, ${document.clientData.address.country}`
                ) : "—"}
              </span>
            </div>

            {/* Description (if exists) */}
            {document.description && (
              <div className="detail-item full-width">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{document.description}</span>
              </div>
            )}
          </div>
        </div>

        {/* === DOCUMENT ITEMS === */}
        <div className="detail-section">
          <h3>Document Items</h3>
          {document.items && document.items.length > 0 ? (
            <div className="items-table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Location</th>
                    <th>Qty</th>
                    <th>Unit Price (Gross)</th>
                    <th>Tax Rate</th>
                    <th>Line Net</th>
                    <th>Line Tax</th>
                    <th>Line Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Map through each line item */}
                  {document.items.map((item, idx) => (
                    <tr key={idx}>
                      {/* Product Name */}
                      <td className="product-name">{item.productName || `Product #${item.productId}`}</td>

                      {/* SKU */}
                      <td className="sku">{item.productSKU || "—"}</td>

                      {/* Location Code */}
                      <td className="location">
                        {item.fromLocationCode ? (
                          <span className="location-badge">{item.fromLocationCode}</span>
                        ) : (
                          <span className="no-location">—</span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="quantity">{item.quantity}</td>

                      {/* Unit Price (Gross) */}
                      <td className="price">${item.unitGross.toFixed(2)}</td>

                      {/* Tax Rate - Extract percentage from tax code */}
                      <td className="tax-rate">
                        {item.taxCode ? (
                          (() => {
                            const match = item.taxCode.match(/\d+/);
                            return match ? `${match[0]}%` : item.taxCode;
                          })()
                        ) : "—"}
                      </td>

                      {/* Line Net Amount */}
                      <td className="line-net">${item.lineNet.toFixed(2)}</td>

                      {/* Line Tax Amount */}
                      <td className="line-tax">${item.lineTax.toFixed(2)}</td>

                      {/* Line Gross Amount */}
                      <td className="line-gross">${item.lineGross.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {/* Document Totals Row */}
                  <tr className="totals-row">
                    <td colSpan="6" className="totals-label">Subtotal:</td>
                    <td className="total-net">${document.totalNet.toFixed(2)}</td>
                    <td className="total-tax">${document.totalTax.toFixed(2)}</td>
                    <td className="total-gross">${document.totalGross.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="no-data">No items in this document.</p>
          )}
        </div>

        {/* === TAX SUMMARY === */}
        <div className="detail-section">
          <h3>Tax Summary</h3>
          <div className="tax-summary">
            {/* Total Net Amount */}
            <div className="tax-row">
              <span className="tax-label">Total Net Amount:</span>
              <span className="tax-value">${document.totalNet.toFixed(2)}</span>
            </div>

            {/* Total Tax Amount */}
            <div className="tax-row">
              <span className="tax-label">Total Tax Amount:</span>
              <span className="tax-value tax-amount">${document.totalTax.toFixed(2)}</span>
            </div>

            {/* Total Gross Amount */}
            <div className="tax-row total">
              <span className="tax-label">Total Gross Amount:</span>
              <span className="tax-value gross-amount">${document.totalGross.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* === PAYMENT DETAILS === */}
        <div className="detail-section">
          <h3>Payment Details</h3>
          {document.payments && document.payments.length > 0 ? (
            <div className="payments-table-wrapper">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Payment Method</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Map through each payment */}
                  {document.payments.map((payment, idx) => (
                    <tr key={idx}>
                      {/* Payment Method with Badge */}
                      <td className="payment-method">
                        <span className={`payment-badge ${(getPaymentOptionLabel(payment.paymentOption) || 'Unspecified').toLowerCase().replace(/\s+/g, '-')}`}>
                          {getPaymentOptionLabel(payment.paymentOption)}
                        </span>
                        {/* Show gift card code if applicable */}
                        {payment.giftCardCode && (
                          <div className="gift-card-code">
                            Code: {payment.giftCardCode}
                          </div>
                        )}
                      </td>

                      {/* Payment Amount */}
                      <td className="payment-amount">${payment.amount.toFixed(2)}</td>

                      {/* Amount Tendered */}
                      <td className="payment-amount" style={{ fontWeight: '600' }}>
                        ${(payment.amountTendered || payment.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {/* Payment Totals and Change */}
                  <tr className="totals-row">
                    <td colSpan="3" style={{ textAlign: 'right', padding: '0.75rem', fontSize: '1.05rem' }}>
                      {(() => {
                        // Calculate payment totals
                        const totalAmount = document.payments.reduce((sum, p) => sum + p.amount, 0);
                        const totalPaid = document.payments.reduce((sum, p) => sum + (p.amountTendered || p.amount), 0);
                        const totalChange = document.payments.reduce((sum, p) => sum + (p.change || 0), 0);

                        return (
                          <>
                            {/* Total Amount */}
                            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                              Total Amount: ${totalAmount.toFixed(2)}
                            </span>
                            {' │ '}

                            {/* Total Paid - Color changes if not exact */}
                            <span style={{
                              color: totalPaid === totalAmount ? '#10b981' : '#f97316',
                              fontWeight: 'bold'
                            }}>
                              Total Paid: ${totalPaid.toFixed(2)}
                            </span>
                            {' │ '}

                            {/* Total Change - Color changes if change given */}
                            <span style={{
                              color: totalChange !== 0 ? '#dc2626' : '#10b981',
                              fontWeight: 'bold'
                            }}>
                              Total Change: ${totalChange.toFixed(2)}
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
  );
}
