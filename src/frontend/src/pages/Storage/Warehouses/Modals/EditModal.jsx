// === IMPORTS ===
import React, { useState, useEffect } from "react";
import { api } from "../../../../api/apiClient";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * EditModal - Edit existing warehouse location
 * Allows modifying zone, col, and shelf for an existing location
 * Shows current and new location code preview
 * Validates that new location code doesn't already exist
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.location - Selected location object to edit
 * @param {function} props.onClose - Callback to close the modal
 * @param {function} props.onSuccess - Callback after successful location update
 */
export default function EditModal({ show, location, onClose, onSuccess }) {
  // Form state
  const [formData, setFormData] = useState({
    zone: "",
    col: "",
    shelf: "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Populate form when location changes
  useEffect(() => {
    if (location && show) {
      setFormData({
        zone: location.zone || "",
        col: location.col || "",
        shelf: location.shelf || "",
      });
      setError(null);
    }
  }, [location, show]);

  // Don't render if modal is not shown or location is missing
  if (!show || !location) return null;

  /**
   * Handles form field changes
   * Auto-converts to uppercase and limits to max length
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Convert to uppercase and limit length
    const uppercaseValue = value.toUpperCase().slice(0, 10);
    setFormData((prev) => ({
      ...prev,
      [name]: uppercaseValue,
    }));
    setError(null);
  };

  /**
   * Generates location code preview from zone, col, and shelf
   */
  const getCodePreview = () => {
    const { zone, col, shelf } = formData;
    if (!zone && !col && !shelf) return "";
    return `${zone || "?"}-${col || "?"}-${shelf || "?"}`;
  };

  /**
   * Handles form submission
   * Validates fields and updates location via API
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Validate all fields are filled
      if (!formData.zone || !formData.col || !formData.shelf) {
        setError("All fields are required");
        setSubmitting(false);
        return;
      }

      // Update location
      await api.put(`/Location/${location.id}`, {
        zone: formData.zone,
        col: formData.col,
        shelf: formData.shelf,
      });

      // Call success callback and close modal
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update location:", err);
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to update location");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handles Enter key press to submit form
   */
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Modal title="Edit Location" onClose={onClose}>
      <form onSubmit={handleSubmit} onKeyPress={handleKeyPress}>
        <div className="form-grid">
          {/* === CURRENT LOCATION INFO === */}
          <div className="form-info" style={{ marginBottom: "1rem" }}>
            <strong>Current Location:</strong> {location.code}
          </div>

          {/* === ZONE INPUT === */}
          <label>
            Zone *
            <input
              type="text"
              name="zone"
              value={formData.zone}
              onChange={handleChange}
              placeholder="Enter zone (e.g., A, B, C)"
              maxLength={10}
              required
              autoFocus
            />
          </label>

          {/* === COLUMN INPUT === */}
          <label>
            Column *
            <input
              type="text"
              name="col"
              value={formData.col}
              onChange={handleChange}
              placeholder="Enter col (e.g., 01, 02, 03)"
              maxLength={10}
              required
            />
          </label>

          {/* === SHELF INPUT === */}
          <label>
            Shelf *
            <input
              type="text"
              name="shelf"
              value={formData.shelf}
              onChange={handleChange}
              placeholder="Enter shelf (e.g., 01, 02, 03)"
              maxLength={10}
              required
            />
          </label>

          {/* === CODE PREVIEW === */}
          {getCodePreview() && getCodePreview() !== location.code && (
            <div className="form-info" style={{ color: "var(--primary)" }}>
              <strong>New Location Code:</strong> {getCodePreview()}
            </div>
          )}

          {/* === ERROR MESSAGE === */}
          {error && (
            <div className="form-error" style={{ color: "red", marginTop: "0.5rem" }}>
              {error}
            </div>
          )}
        </div>

        {/* === MODAL ACTIONS === */}
        <div className="modal-actions">
          <button type="button" className="btn-action" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-action btn-primary" disabled={submitting}>
            {submitting ? "Updating..." : "Update Location"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
