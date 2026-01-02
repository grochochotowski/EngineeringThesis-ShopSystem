import React from "react";
import Modal from "../../../../components/Modal";
import TaxRateForm from "../../../../components/Forms/TaxRateForm";

/**
 * AddModal - Modal for creating new tax rates
 * Displays a form within a modal dialog to create a new tax rate
 * @param {boolean} show - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSuccess - Callback when tax rate is successfully created (receives taxRateId)
 */
export default function AddModal({ show, onClose, onSuccess }) {
  if (!show) return null;

  return (
    <Modal title="Create Tax Rate" onClose={onClose}>
      <TaxRateForm
        mode="create"
        taxRate={null}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
