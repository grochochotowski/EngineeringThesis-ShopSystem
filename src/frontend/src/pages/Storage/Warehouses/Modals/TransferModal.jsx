// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * TransferModal - Move product between warehouse locations
 * Shows source location as read-only (pre-selected from table)
 * Allows selecting destination location and quantity to transfer
 * Shows existing quantities at destination locations for context
 * Validates that source and destination are different
 * Simpler than StorageProducts TransferModal since source is pre-selected
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.selectedItem - Currently selected warehouse item (source location)
 * @param {object} props.formData - Form state (toLocationId, quantity)
 * @param {array} props.allLocations - List of all available warehouse locations
 * @param {array} props.transferProductLocations - All locations where this product exists (with quantities)
 * @param {function} props.onClose - Callback to close the modal
 * @param {function} props.onFormChange - Callback when form fields change
 * @param {function} props.onSubmit - Callback to submit the form
 * @param {function} props.onKeyPress - Callback for Enter key press to submit
 */
export default function TransferModal({
  show,
  selectedItem,
  formData,
  allLocations,
  transferProductLocations,
  onClose,
  onFormChange,
  onSubmit,
  onKeyPress,
}) {
  // Don't render if modal is not shown or item is missing
  if (!show || !selectedItem) return null;

  return (
    <Modal
      title={`${selectedItem.rawData.productSKU} - ${selectedItem.rawData.productName}`}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} onKeyPress={onKeyPress}>
        <div className="form-grid">
          {/* === SOURCE LOCATION (READ-ONLY) === */}
          <label>
            Move From
            <input
              type="text"
              value={`${selectedItem.rawData.locationCode} (Qty: ${selectedItem.quantity})`}
              disabled
              style={{ background: "var(--bg-disabled)", cursor: "not-allowed" }}
            />
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
              {/* Show all active locations except the current source location */}
              {allLocations
                .filter((l) => l.isActive && l.id !== selectedItem.locationId)
                .map((l) => {
                  // Show existing quantity if product is already at this destination
                  const existingLocation = transferProductLocations.find(pl => pl.locationId === l.id);
                  return (
                    <option key={l.id} value={l.id}>
                      {l.locationCode}{existingLocation ? ` (Qty: ${existingLocation.quantity})` : ""}
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
              max={selectedItem.quantity}
              required
            />
            {/* Show max quantity hint based on source location */}
            <small style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Max: {selectedItem.quantity}
            </small>
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
