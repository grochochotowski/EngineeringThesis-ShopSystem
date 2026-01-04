// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * QuickLocationModal - Quickly create a new warehouse location
 * Allows creating a location without navigating to the Warehouses page
 * Validates location uniqueness via API before creation
 * Auto-fills the new location in the Add Product form after creation
 * Uses Zone-Column-Shelf format (4 characters each, auto-uppercase)
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.formData - Form state (zone, col, shelf)
 * @param {function} props.onClose - Callback to close the modal
 * @param {function} props.onFormChange - Callback when form fields change
 * @param {function} props.onSubmit - Callback to submit the form
 */
export default function QuickLocationModal({
  show,
  formData,
  onClose,
  onFormChange,
  onSubmit,
}) {
  // Don't render if modal is not shown
  if (!show) return null;

  return (
    <Modal title="Create New Location" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          {/* === ZONE INPUT === */}
          <label>
            Zone (4 characters)
            <input
              type="text"
              name="zone"
              value={formData.zone}
              onChange={onFormChange}
              maxLength="4"
              placeholder="e.g., A001"
              required
            />
          </label>

          {/* === COLUMN INPUT === */}
          <label>
            Column (4 characters)
            <input
              type="text"
              name="col"
              value={formData.col}
              onChange={onFormChange}
              maxLength="4"
              placeholder="e.g., B002"
              required
            />
          </label>

          {/* === SHELF INPUT === */}
          <label>
            Shelf (4 characters)
            <input
              type="text"
              name="shelf"
              value={formData.shelf}
              onChange={onFormChange}
              maxLength="4"
              placeholder="e.g., C003"
              required
            />
          </label>
        </div>

        {/* === MODAL ACTIONS === */}
        <div className="modal-actions">
          <button
            type="button"
            className="btn-action"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="btn-action btn-primary">
            Create Location
          </button>
        </div>
      </form>
    </Modal>
  );
}
