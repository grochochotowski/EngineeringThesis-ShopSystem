import React from "react";
import Modal from "../../../../components/Modal";
import TaxRateForm from "../../../../components/Forms/TaxRateForm";

/**
 * EditModal - Modal for editing existing tax rates
 * Displays a form within a modal dialog to update tax rate details
 * @param {boolean} show - Controls modal visibility
 * @param {object} taxRate - Tax rate data to edit
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSuccess - Callback when tax rate is successfully updated (receives taxRateId)
 */
export default function EditModal({ show, taxRate, onClose, onSuccess }) {
  if (!show) return null;

  return (
    <Modal title="Edit Tax Rate" onClose={onClose}>
      <TaxRateForm
        mode="edit"
        taxRate={taxRate}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
