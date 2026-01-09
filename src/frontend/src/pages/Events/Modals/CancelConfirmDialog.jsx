import React from "react";
import ConfirmDialog from "../../../components/ConfirmDialog";

export default function CancelConfirmDialog({ event, onConfirm, onCancel }) {
  if (!event) return null;

  const eventData = event._raw || event;

  return (
    <ConfirmDialog
      title="Cancel Event"
      message={`Are you sure you want to cancel "${eventData.title}"?`}
      confirmText="Cancel Event"
      confirmButtonClass="dialog-btn-confirm-negative"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
