import React from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog";

/**
 * StatusConfirmDialog - Confirmation dialog for activating/deactivating tax rates
 * Displays a confirmation dialog before changing tax rate status
 * @param {object} taxRate - Tax rate to activate/deactivate (null if not showing)
 * @param {function} onConfirm - Callback when user confirms the action
 * @param {function} onCancel - Callback when user cancels the action
 */
export default function StatusConfirmDialog({ taxRate, onConfirm, onCancel }) {
  if (!taxRate) return null;

  const isActive = taxRate._isActive;

  return (
    <ConfirmDialog
      title={isActive ? "Deactivate Tax Rate" : "Activate Tax Rate"}
      message={`Are you sure you want to ${isActive ? "deactivate" : "activate"} "${taxRate.code}"?`}
      confirmText={isActive ? "Deactivate" : "Activate"}
      confirmButtonClass={isActive ? "dialog-btn-confirm-negative" : "dialog-btn-confirm-positive"}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
