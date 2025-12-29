import React from "react";
import Modal from "../Modal";
import ClientForm from "./ClientForm";

/**
 * Reusable modal wrapper for ClientForm component.
 *
 * This component provides a consistent modal interface for creating/editing clients
 * across different pages (Organization > Clients, POS, etc.).
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onClientCreated - Callback after successful client creation (receives clientId)
 * @param {string} mode - "create" or "edit"
 * @param {object} client - Client data for edit mode (optional)
 * @param {object} address - Address data for edit mode (optional)
 */
export default function ClientFormModal({
  isOpen,
  onClose,
  onClientCreated,
  mode = "create",
  client = null,
  address = null
}) {
  if (!isOpen) return null;

  const handleSuccess = (clientId) => {
    // Call the onClientCreated callback with the new/updated client ID
    if (onClientCreated) {
      onClientCreated(clientId);
    }
    // Close the modal
    onClose();
  };

  return (
    <Modal
      title={mode === "create" ? "Create Client" : "Edit Client"}
      onClose={onClose}
      wide
    >
      <ClientForm
        mode={mode}
        client={client}
        address={address}
        onSuccess={handleSuccess}
      />
    </Modal>
  );
}
