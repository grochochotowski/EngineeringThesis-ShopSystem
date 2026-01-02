import React from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog";

/**
 * StatusConfirmDialog - Confirmation dialog for activating/deactivating categories
 * Displays a confirmation dialog before changing category status
 * @param {object} category - Category to activate/deactivate (null if not showing)
 * @param {function} onConfirm - Callback when user confirms the action
 * @param {function} onCancel - Callback when user cancels the action
 */
export default function StatusConfirmDialog({ category, onConfirm, onCancel }) {
  if (!category) return null;

  const isActive = category._isActive;

  return (
    <ConfirmDialog
      title={isActive ? "Deactivate Category" : "Activate Category"}
      message={`Are you sure you want to ${isActive ? "deactivate" : "activate"} "${category.name}"?`}
      confirmText={isActive ? "Deactivate" : "Activate"}
      confirmButtonClass={isActive ? "dialog-btn-confirm-negative" : "dialog-btn-confirm-positive"}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
