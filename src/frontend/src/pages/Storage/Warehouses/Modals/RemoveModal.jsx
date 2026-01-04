// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * RemoveModal - Remove product quantity from specific warehouse location
 * Displays read-only product and location information (pre-selected from table)
 * Allows specifying quantity to remove with validation
 * Completely removes product from location if quantity reaches zero
 * Simpler than StorageProducts RemoveModal since location is pre-selected
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.selectedItem - Currently selected warehouse item (product-location combination)
 * @param {object} props.formData - Form state (quantity)
 * @param {function} props.onClose - Callback to close the modal
 * @param {function} props.onFormChange - Callback when form fields change
 * @param {function} props.onSubmit - Callback to submit the form
 * @param {function} props.onKeyPress - Callback for Enter key press to submit
 */
export default function RemoveModal({
  show,
  selectedItem,
  formData,
  onClose,
  onFormChange,
  onSubmit,
  onKeyPress,
}) {
  // Don't render if modal is not shown or item is missing
  if (!show || !selectedItem) return null;

  return (
    <Modal title="Remove Product from Warehouse" onClose={onClose}>
      <form onSubmit={onSubmit} onKeyPress={onKeyPress}>
        <div className="form-grid">
          {/* === PRODUCT (READ-ONLY) === */}
          <label>
            Product
            <input
              type="text"
              value={`${selectedItem.rawData.productSKU} - ${selectedItem.rawData.productName}`}
              disabled
              style={{ background: "var(--bg-disabled)", cursor: "not-allowed" }}
            />
          </label>

          {/* === LOCATION (READ-ONLY) === */}
          <label>
            Location
            <input
              type="text"
              value={selectedItem.rawData.locationCode}
              disabled
              style={{ background: "var(--bg-disabled)", cursor: "not-allowed" }}
            />
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
              max={selectedItem.quantity}
              required
            />
            {/* Show max quantity hint */}
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
          <button type="submit" className="btn-action btn-danger">
            Remove
          </button>
        </div>
      </form>
    </Modal>
  );
}
