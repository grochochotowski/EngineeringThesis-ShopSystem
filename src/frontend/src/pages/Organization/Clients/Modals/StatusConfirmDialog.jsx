import React from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog";

/**
 * StatusConfirmDialog - Confirmation dialog for activating/deactivating clients
 * Displays a confirmation dialog before changing client status
 * @param {object} client - Client to activate/deactivate (null if not showing)
 * @param {function} onConfirm - Callback when user confirms the action
 * @param {function} onCancel - Callback when user cancels the action
 */
export default function StatusConfirmDialog({ client, onConfirm, onCancel }) {
  if (!client) return null;

  const isActive = client._isActive;

  return (
    <ConfirmDialog
      title={isActive ? "Deactivate Client" : "Activate Client"}
      message={
        isActive
          ? `Are you sure you want to deactivate "${client.name}"?`
          : `Are you sure you want to activate "${client.name}"?`
      }
      confirmText={isActive ? "Deactivate" : "Activate"}
      confirmButtonClass={isActive ? "dialog-btn-confirm-negative" : "dialog-btn-confirm-positive"}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
