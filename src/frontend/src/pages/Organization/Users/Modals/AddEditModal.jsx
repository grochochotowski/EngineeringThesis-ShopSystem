import React from "react";
import Modal from "../../../../components/Modal";
import UserForm from "../../../../components/Forms/UserForm";

/**
 * AddEditModal - Modal for creating or editing users
 * Displays a user form within a wide modal dialog
 * @param {boolean} show - Controls modal visibility
 * @param {string} mode - Form mode ("create" or "edit")
 * @param {object} user - User data to edit (null for create mode)
 * @param {object} address - Address data associated with the user
 * @param {array} roles - Available user roles
 * @param {string} roleLimit - Maximum role level allowed for the current user
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSuccess - Callback when user is successfully saved (receives userId)
 */
export default function AddEditModal({ show, mode, user, address, roles, roleLimit, onClose, onSuccess }) {
  if (!show) return null;

  return (
    <Modal
      title={mode === "create" ? "Register User" : "Edit User"}
      onClose={onClose}
      wide
    >
      <UserForm
        mode={mode}
        user={user}
        address={address}
        roles={roles}
        roleLimit={roleLimit}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
