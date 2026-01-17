import React, { useState } from "react";
import Modal from "../../../../components/Modal";
import { api } from "../../../../api/apiClient";

/**
 * AddModal - Modal for creating new gift cards
 * Displays a form within a modal dialog to create a new gift card
 * Gift cards are assigned a unique code automatically and set to expire 1 year from creation
 * @param {boolean} show - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSuccess - Callback when gift card is successfully created
 */
export default function AddModal({ show, onClose, onSuccess }) {
  // === STATE ===
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!show) return null;

  /**
   * Handles form submission
   * Creates a new gift card with the specified value
   * The backend automatically generates a unique code and sets expiration date
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate value
    const valueNum = parseFloat(value);
    if (!value || isNaN(valueNum) || valueNum <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setLoading(true);
    try {
      await api.post("/GiftCard", {
        value: valueNum
      });

      // Reset form and notify parent
      setValue("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create gift card");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles modal close
   * Resets form state before closing
   */
  const handleClose = () => {
    setValue("");
    setError("");
    onClose();
  };

  return (
    <Modal title="Create Gift Card" onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="value">Gift Card Value *</label>
          <input
            id="value"
            type="number"
            step="0.01"
            min="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter amount (e.g., 50.00)"
            disabled={loading}
            required
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button
            type="button"
            onClick={handleClose}
            className="btn-cancel"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-confirm"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
