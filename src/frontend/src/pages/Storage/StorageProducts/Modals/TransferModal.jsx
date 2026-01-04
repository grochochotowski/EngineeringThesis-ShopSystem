// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * TransferModal - Move product between warehouse locations
 * Allows selecting source and destination locations and quantity to transfer
 * Validates that source and destination are different
 * Shows current quantity at each location
 * Can transfer to new location or add to existing location
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.selectedProduct - Currently selected product with location data
 * @param {object} props.formData - Form state (fromLocationId, toLocationId, quantity)
 * @param {array} props.allLocations - List of all available warehouse locations
 * @param {function} props.onClose - Callback to close the modal
 * @param {function} props.onFormChange - Callback when form fields change
 * @param {function} props.onSubmit - Callback to submit the form
 * @param {function} props.onKeyPress - Callback for Enter key press to submit
 * @param {function} props.getProductLocations - Function to get locations where product exists
 * @param {function} props.getMaxQuantityForLocation - Function to get max quantity at a location
 */
export default function TransferModal({
  show,
  selectedProduct,
  formData,
  allLocations,
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
    <Modal
      title={`${selectedProduct.rawData.productSKU} - ${selectedProduct.rawData.productName}`}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} onKeyPress={onKeyPress}>
        <div className="form-grid">
          {/* === SOURCE LOCATION === */}
          <label>
            Move From
            <select
              name="fromLocationId"
              value={formData.fromLocationId}
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

          {/* === DESTINATION LOCATION === */}
          <label>
            Move To
            <select
              name="toLocationId"
              value={formData.toLocationId}
              onChange={onFormChange}
              required
              className="location-select"
            >
              <option value="">Select a location</option>
              {/* Show all active locations except the selected source */}
              {allLocations
                .filter((l) => l.isActive && parseInt(l.id) !== parseInt(formData.fromLocationId || -1))
                .map((l) => {
                  // Show existing quantity if product is already at this destination
                  const productLocation = getProductLocations().find(pl => pl.locationId === l.id);
                  return (
                    <option key={l.id} value={l.id}>
                      {l.locationCode}{productLocation ? ` (Qty: ${productLocation.quantity})` : ""}
                    </option>
                  );
                })}
            </select>
          </label>

          {/* === QUANTITY INPUT === */}
          <label>
            Quantity to Move
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={onFormChange}
              min="1"
              max={formData.fromLocationId ? getMaxQuantityForLocation(parseInt(formData.fromLocationId)) : 1}
              required
            />
            {/* Show max quantity hint based on source location */}
            {formData.fromLocationId && (
              <small style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Max: {getMaxQuantityForLocation(parseInt(formData.fromLocationId))}
              </small>
            )}
          </label>
        </div>

        {/* === MODAL ACTIONS === */}
        <div className="modal-actions">
          <button type="button" className="btn-action" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-action btn-primary">
            Move
          </button>
        </div>
      </form>
    </Modal>
  );
}
