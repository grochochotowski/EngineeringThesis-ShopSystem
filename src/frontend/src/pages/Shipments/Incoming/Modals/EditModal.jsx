// === IMPORTS ===
import React, { useState, useRef } from "react";
import Modal from "../../../../components/Modal";
import { countries, getCountryName } from "../../../../data/countries";
import { api } from "../../../../api/apiClient";

// === COMPONENT ===
/**
 * EditModal - Edit existing incoming shipment
 *
 * Allows users to modify existing shipment records with:
 * - Updated basic information (status, dates, dimensions)
 * - Sender information updates (read-only address in edit mode)
 * - Read-only receiver information
 * - Product list modifications (add/remove products, adjust quantities)
 *
 * Features:
 * - Full status dropdown with all shipment statuses
 * - Read-only address display (address cannot be changed after creation)
 * - Searchable product dropdown for adding new products
 * - Infinite scroll for product suggestions
 * - Real-time quantity validation
 * - Product removal capability
 *
 * @param {object} props - Component props
 * @param {boolean} props.show - Whether to show the modal
 * @param {function} props.onClose - Callback to close the modal
 * @param {object} props.editForm - Form state object containing all shipment fields
 * @param {function} props.handleEditFormChange - Handler for form field changes
 * @param {function} props.handleSaveEdit - Handler for saving edits
 * @param {boolean} props.savingEdit - Whether edits are currently being saved
 * @param {array} props.shipmentStatusesData - Array of all possible shipment statuses
 * @param {string} props.editProductSearch - Current product search query for edit modal
 * @param {function} props.setEditProductSearch - Setter for edit product search query
 * @param {function} props.handleEditProductSearchKeyDown - Handler for edit product search keyboard events
 * @param {boolean} props.showEditProductDropdown - Whether to show edit product suggestions dropdown
 * @param {function} props.setShowEditProductDropdown - Setter for edit dropdown visibility
 * @param {array} props.editProductSuggestions - Array of product suggestions for edit modal
 * @param {object} props.editProductDropdownRef - Ref for edit product dropdown element
 * @param {function} props.handleEditProductDropdownScroll - Handler for edit dropdown scroll
 * @param {number} props.editHighlightedIndex - Index of currently highlighted suggestion in edit modal
 * @param {function} props.setEditHighlightedIndex - Setter for edit highlighted index
 * @param {function} props.handleEditAddProduct - Handler for adding product in edit mode
 * @param {boolean} props.loadingEditProducts - Whether edit products are currently being loaded
 * @param {array} props.editSelectedProducts - Array of products in edited shipment
 * @param {function} props.handleEditProductQuantityChange - Handler for edit product quantity changes
 * @param {function} props.handleEditRemoveProduct - Handler for removing product in edit mode
 */
export default function EditModal({
  show,
  onClose,
  editForm,
  handleEditFormChange,
  handleSaveEdit,
  savingEdit,
  shipmentStatusesData,
  editProductSearch,
  setEditProductSearch,
  handleEditProductSearchKeyDown,
  showEditProductDropdown,
  setShowEditProductDropdown,
  editProductSuggestions,
  editProductDropdownRef,
  handleEditProductDropdownScroll,
  editHighlightedIndex,
  setEditHighlightedIndex,
  handleEditAddProduct,
  loadingEditProducts,
  editSelectedProducts,
  handleEditProductQuantityChange,
  handleEditRemoveProduct,
}) {
  if (!show) return null;

  return (
    <Modal
      title="Edit Shipment"
      onClose={onClose}
      wide
    >
      <div className="edit-shipment-modal">
        <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <div className="form-content" style={{ flex: 1, overflowY: "auto", paddingBottom: "20px" }}>
            {/* Section A: Basic Information */}
            <div className="form-section">
              <h4 className="section-title">Basic Information</h4>
              <div className="form-grid-2col">
                <div className="form-field">
                  <label htmlFor="edit-status">Status *</label>
                  <select
                    id="edit-status"
                    name="status"
                    value={editForm.status}
                    onChange={handleEditFormChange}
                    required
                  >
                    {shipmentStatusesData.map(status => (
                      <option key={status.id} value={status.id}>{status.value}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="edit-sendDate">Send Date</label>
                  <input
                    type="date"
                    id="edit-sendDate"
                    name="sendDate"
                    value={editForm.sendDate}
                    onChange={handleEditFormChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="edit-deliveryDate">Delivery Date</label>
                  <input
                    type="date"
                    id="edit-deliveryDate"
                    name="deliveryDate"
                    value={editForm.deliveryDate}
                    onChange={handleEditFormChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="edit-weight">Weight (kg)</label>
                  <input
                    type="number"
                    id="edit-weight"
                    name="weight"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editForm.weight}
                    onChange={handleEditFormChange}
                  />
                </div>
              </div>

              <div className="form-grid-3col">
                <div className="form-field">
                  <label htmlFor="edit-length">Length (cm)</label>
                  <input
                    type="number"
                    id="edit-length"
                    name="length"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editForm.length}
                    onChange={handleEditFormChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="edit-width">Width (cm)</label>
                  <input
                    type="number"
                    id="edit-width"
                    name="width"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editForm.width}
                    onChange={handleEditFormChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="edit-height">Height (cm)</label>
                  <input
                    type="number"
                    id="edit-height"
                    name="height"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editForm.height}
                    onChange={handleEditFormChange}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  name="description"
                  rows="3"
                  placeholder="Enter shipment description..."
                  value={editForm.description}
                  onChange={handleEditFormChange}
                />
              </div>
            </div>

            {/* Section B: Sender Details */}
            <div className="form-section">
              <h4 className="section-title">Sender Details</h4>
              <div className="form-grid-2col">
                <div className="form-field">
                  <label htmlFor="edit-senderName">Name *</label>
                  <input
                    type="text"
                    id="edit-senderName"
                    name="senderName"
                    placeholder="Company or person name"
                    value={editForm.senderName}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="edit-senderTaxId">Tax ID *</label>
                  <input
                    type="text"
                    id="edit-senderTaxId"
                    name="senderTaxId"
                    placeholder="Tax identification number"
                    value={editForm.senderTaxId}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>

                <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="edit-senderDetails">Sender Details</label>
                  <textarea
                    id="edit-senderDetails"
                    name="senderDetails"
                    rows="2"
                    placeholder="Additional notes about sender (optional)"
                    value={editForm.senderDetails}
                    onChange={handleEditFormChange}
                  />
                </div>
              </div>
            </div>

            {/* Section C: Sender Address (Read-Only in Edit Mode) */}
            <div className="form-section">
              <h4 className="section-title">Sender Address</h4>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>Address (Read Only)</label>
                <p style={{ margin: "0.5rem 0", color: "#374151", padding: "1rem", background: "#f9fafb", border: "1px solid var(--border-muted)", borderRadius: "var(--radius-sm)", lineHeight: "1.6" }}>
                  <strong>{editForm.senderStreet} {editForm.senderBuilding}</strong>
                  {editForm.senderPremises && <span>, {editForm.senderPremises}</span>}
                  <br />
                  {editForm.senderPostalCode} {editForm.senderCity}
                  <br />
                  {getCountryName(editForm.senderCountry) || countries[editForm.senderCountry] || "N/A"}
                </p>
                <small style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Address cannot be changed after shipment creation
                </small>
              </div>
            </div>

            {/* Section D: Receiver Information (Display Only) */}
            <div className="form-section">
              <h4 className="section-title">Receiver Information (Read Only)</h4>
              <div className="receiver-info-display">
                <div className="info-row">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{editForm.receiverName || "—"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tax ID:</span>
                  <span className="info-value">{editForm.receiverTaxId || "—"}</span>
                </div>
              </div>
              <div className="form-field" style={{ marginTop: "15px" }}>
                <label htmlFor="edit-receiverDetails">Receiver Details</label>
                <textarea
                  id="edit-receiverDetails"
                  name="receiverDetails"
                  rows="2"
                  placeholder="Additional notes about receiver (optional)"
                  value={editForm.receiverDetails}
                  onChange={handleEditFormChange}
                />
              </div>
            </div>

            {/* Section E: Product Management */}
            <div className="form-section">
              <h4 className="section-title">Products *</h4>
              <div className="product-search-panel">
                <input
                  type="text"
                  placeholder="Search products by name or SKU... (Type full SKU and press Enter for exact match)"
                  value={editProductSearch}
                  onChange={(e) => setEditProductSearch(e.target.value)}
                  onKeyDown={handleEditProductSearchKeyDown}
                  onFocus={() => editProductSuggestions.length > 0 && setShowEditProductDropdown(true)}
                  className="product-search-input"
                  autoComplete="off"
                />
                {showEditProductDropdown && editProductSuggestions.length > 0 && (
                  <div
                    className="product-suggestions"
                    ref={editProductDropdownRef}
                    onScroll={handleEditProductDropdownScroll}
                  >
                    {editProductSuggestions.map((product, index) => (
                      <div
                        key={product.productId || product.id}
                        className={`product-suggestion-item ${index === editHighlightedIndex ? "highlighted" : ""}`}
                        onClick={() => handleEditAddProduct(product)}
                        onMouseEnter={() => setEditHighlightedIndex(index)}
                      >
                        <div className="product-suggestion-main">
                          <strong>{product.name}</strong>
                          <span className="product-sku">{product.sku}</span>
                        </div>
                        <span className="product-stock">Stock: {product.totalQuantity || 0}</span>
                      </div>
                    ))}
                    {loadingEditProducts && (
                      <div className="product-suggestion-item loading-item">
                        Loading more products...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {editSelectedProducts.length > 0 ? (
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>Amount in Shipment</th>
                      <th>Amount in Store</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editSelectedProducts.map(product => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.sku}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => handleEditProductQuantityChange(product.id, e.target.value)}
                            className="quantity-input"
                          />
                        </td>
                        <td>{product.currentStock}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleEditRemoveProduct(product.id)}
                            className="btn-remove-product"
                            title="Remove product"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-products-message">No products added. Search and select products above.</p>
              )}
            </div>
          </div>

          {/* Section F: Actions */}
          <div className="form-actions" style={{ flexShrink: 0, paddingTop: "10px", borderTop: "1px solid #ddd" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
              disabled={savingEdit}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-confirm"
              disabled={savingEdit}
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
