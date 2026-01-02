import React from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog";

/**
 * StatusConfirmDialog - Confirmation dialog for activating/deactivating users
 * Displays a confirmation dialog before changing user status
 * @param {object} user - User to activate/deactivate (null if not showing)
 * @param {function} onConfirm - Callback when user confirms the action
 * @param {function} onCancel - Callback when user cancels the action
 */
export default function StatusConfirmDialog({ user, onConfirm, onCancel }) {
  if (!user) return null;

  const isActive = user._isActive;

  return (
    <ConfirmDialog
      title={isActive ? "Deactivate User" : "Activate User"}
      message={
        isActive
          ? `Are you sure you want to deactivate "${user.firstName} ${user.lastName}"?`
          : `Are you sure you want to activate "${user.firstName} ${user.lastName}"?`
      }
      confirmText={isActive ? "Deactivate" : "Activate"}
      confirmButtonClass={isActive ? "dialog-btn-confirm-negative" : "dialog-btn-confirm-positive"}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
