// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * RemoveModal - Remove product quantity from warehouse location
 * Allows selecting a location where the product exists and specifying quantity to remove
 * Shows current quantity at each location and enforces max removal limit
 * Completely removes product from location if quantity reaches zero
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.selectedProduct - Currently selected product with location data
 * @param {object} props.formData - Form state (locationId, quantity)
 * @param {function} props.onClose - Callback to close the modal
 * @param {function} props.onFormChange - Callback when form fields change
 * @param {function} props.onSubmit - Callback to submit the form
 * @param {function} props.onKeyPress - Callback for Enter key press to submit
 * @param {function} props.getProductLocations - Function to get locations where product exists
 * @param {function} props.getMaxQuantityForLocation - Function to get max quantity at a location
 */
export default function RemoveModal({
  show,
  selectedProduct,
  formData,
  onClose,
  onFormChange,
  onSubmit,
  onKeyPress,
  getProductLocations,
  getMaxQuantityForLocation,
}) {
  // Don't render if modal is not shown or product is missing
  if (!show || !selectedProduct) return null;

  return (
    <Modal title="Remove Product from Warehouse" onClose={onClose}>
      <form onSubmit={onSubmit} onKeyPress={onKeyPress}>
        <div className="form-grid">
          {/* === LOCATION SELECTION === */}
          <label>
            Location
            <select
              name="locationId"
              value={formData.locationId}
              onChange={onFormChange}
              required
              className="location-select"
            >
              <option value="">Select a location</option>
              {/* Show only locations where this product exists */}
              {getProductLocations().map((loc) => (
                <option key={loc.locationId} value={loc.locationId}>
                  {loc.locationCode} (Qty: {loc.quantity})
                </option>
              ))}
            </select>
          </label>

          {/* === QUANTITY INPUT === */}
          <label>
            Quantity to Remove
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={onFormChange}
              min="1"
              max={formData.locationId ? getMaxQuantityForLocation(parseInt(formData.locationId)) : 1}
              required
            />
            {/* Show max quantity hint */}
            {formData.locationId && (
              <small style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Max: {getMaxQuantityForLocation(parseInt(formData.locationId))}
              </small>
            )}
          </label>
        </div>

        {/* === MODAL ACTIONS === */}
        <div className="modal-actions">
          <button type="button" className="btn-action" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-action btn-danger">
            Remove
          </button>
        </div>
      </form>
    </Modal>
  );
}
