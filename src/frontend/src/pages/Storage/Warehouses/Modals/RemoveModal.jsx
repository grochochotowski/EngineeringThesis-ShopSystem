// === IMPORTS ===
import React from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog";

// === COMPONENT ===
/**
 * RemoveModal - Activate/Deactivate warehouse location (confirm dialog)
 * Shows confirmation dialog before changing location status
 * Warns about deactivation restrictions
 * Uses ConfirmDialog component for consistent UX
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.location - Selected location object with _isActive status
 * @param {function} props.onConfirm - Callback to confirm status change
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

  const isActive = location._isActive ?? location.isActive ?? true;
  const action = isActive ? "deactivate" : "activate";
  const actionCapitalized = action.charAt(0).toUpperCase() + action.slice(1);

  return (
    <ConfirmDialog
      message={
        <>
          <p>Are you sure you want to {action} this location?</p>
          <p style={{ marginTop: "1rem" }}>
            <strong>Location:</strong> {location.code}
          </p>
          {isActive && (
            <p style={{ marginTop: "0.5rem", color: "var(--danger)" }}>
              Note: Locations with products cannot be deactivated. Please remove all products first.
            </p>
          )}
        </>
      }
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
