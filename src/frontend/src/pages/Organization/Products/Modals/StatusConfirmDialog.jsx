import React from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog";

/**
 * StatusConfirmDialog - Confirmation dialog for activating/deactivating products
 * Displays a confirmation dialog before changing product status
 * @param {object} product - Product to activate/deactivate (null if not showing)
 * @param {function} onConfirm - Callback when user confirms the action
 * @param {function} onCancel - Callback when user cancels the action
 */
export default function StatusConfirmDialog({ product, onConfirm, onCancel }) {
  if (!product) return null;

  const isActive = product.isActive;

  return (
    <ConfirmDialog
      title={isActive ? "Deactivate Product" : "Activate Product"}
      message={isActive
        ? `Are you sure you want to deactivate "${product.name}"?`
        : `Are you sure you want to activate "${product.name}"?`}
      confirmText={isActive ? "Deactivate" : "Activate"}
      confirmButtonClass={isActive ? "dialog-btn-confirm-negative" : "dialog-btn-confirm-positive"}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
