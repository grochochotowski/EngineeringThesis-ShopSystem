import React, { useState } from "react";
import Modal from "../../../../components/Modal";

/**
 * ChangePasswordModal - Modal for changing user passwords
 * Displays a form to enter and confirm a new password
 * @param {boolean} show - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSubmit - Callback when form is submitted (receives password form data)
 */
export default function ChangePasswordModal({ show, onClose, onSubmit }) {
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmNewPassword: "",
  });

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(passwordForm);
  };

  return (
    <Modal title="Change Password" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          New Password
          <input
            type="password"
            name="newPassword"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
            }
            required
          />
        </label>
        <label>
          Confirm New Password
          <input
            type="password"
            name="confirmNewPassword"
            value={passwordForm.confirmNewPassword}
            onChange={(e) =>
              setPasswordForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))
            }
            required
          />
        </label>
        <div className="form-actions" style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-confirm">
            Change Password
          </button>
        </div>
      </form>
    </Modal>
  );
}
