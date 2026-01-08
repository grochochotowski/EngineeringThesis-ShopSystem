// === IMPORTS ===
import React from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog";

// === COMPONENT ===
/**
 * RemoveModal - Deactivate warehouse location (confirm dialog)
 * Shows confirmation dialog before deactivating a location
 * Warns that location cannot be deleted if it has products
 * Uses ConfirmDialog component for consistent UX
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.location - Selected location object to deactivate
 * @param {function} props.onConfirm - Callback to confirm deactivation
 * @param {function} props.onCancel - Callback to cancel operation
 */
export default function RemoveModal({
  show,
  location,
  onConfirm,
  onCancel,
}) {
  // Don't render if modal is not shown or location is missing
  if (!show || !location) return null;

  return (
    <ConfirmDialog
      message={
        <>
          <p>Are you sure you want to deactivate this location?</p>
          <p style={{ marginTop: "1rem" }}>
            <strong>Location:</strong> {location.code}
          </p>
          <p style={{ marginTop: "0.5rem", color: "var(--danger)" }}>
            Note: Locations with products cannot be deactivated. Please remove all products first.
          </p>
        </>
      }
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
