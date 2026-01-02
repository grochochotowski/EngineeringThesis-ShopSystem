import React, { useState } from "react";
import Modal from "../../../../components/Modal";

/**
 * ChangeLoginModal - Modal for changing user login credentials
 * Displays a form to enter a new login username
 * @param {boolean} show - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSubmit - Callback when form is submitted (receives login form data)
 */
export default function ChangeLoginModal({ show, onClose, onSubmit }) {
  const [loginForm, setLoginForm] = useState({ newLogin: "" });

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(loginForm);
  };

  return (
    <Modal title="Change Login" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          New Login
          <input
            type="text"
            name="newLogin"
            value={loginForm.newLogin}
            onChange={(e) => setLoginForm({ newLogin: e.target.value })}
            required
          />
        </label>
        <div className="form-actions" style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-confirm">
            Change Login
          </button>
        </div>
      </form>
    </Modal>
  );
}
