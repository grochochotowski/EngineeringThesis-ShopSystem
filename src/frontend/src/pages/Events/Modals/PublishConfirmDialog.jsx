import React from "react";
import ConfirmDialog from "../../../components/ConfirmDialog";

export default function PublishConfirmDialog({ event, onConfirm, onCancel }) {
  if (!event) return null;

  const eventData = event._raw || event;

  return (
    <ConfirmDialog
      title="Publish Event"
      message={`Are you sure you want to publish "${eventData.title}"? The event requires an image to be published.`}
      confirmText="Publish"
      confirmButtonClass="dialog-btn-confirm-positive"
      onConfirm={onConfirm}
      onCancel={onCancel}
      isConfirmDisabled={!eventData.image}
    />
  );
}
