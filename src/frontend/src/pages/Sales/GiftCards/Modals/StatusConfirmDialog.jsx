import React from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog";

/**
 * StatusConfirmDialog - Confirmation dialog for deactivating gift cards
 * Displays a confirmation dialog before deactivating a gift card
 * Note: Gift cards can only be deactivated, not reactivated (one-way operation)
 * @param {object} giftCard - Gift card to deactivate (null if not showing)
 * @param {function} onConfirm - Callback when user confirms the deactivation
 * @param {function} onCancel - Callback when user cancels the action
 */
export default function StatusConfirmDialog({ giftCard, onConfirm, onCancel }) {
  if (!giftCard) return null;

  const isActive = giftCard._isActive;

  // Only show dialog for deactivation (gift cards cannot be reactivated)
  if (!isActive) return null;

  return (
    <ConfirmDialog
      title="Deactivate Gift Card"
      message={`Are you sure you want to deactivate gift card "${giftCard.code}"? This action cannot be undone.`}
      confirmText="Deactivate"
      confirmButtonClass="dialog-btn-confirm-negative"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
