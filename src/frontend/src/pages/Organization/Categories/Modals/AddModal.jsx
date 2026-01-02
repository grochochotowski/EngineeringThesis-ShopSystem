import React from "react";
import Modal from "../../../../components/Modal";
import CategoryForm from "../../../../components/Forms/CategoryForm";

/**
 * AddModal - Modal for creating new categories
 * Displays a form within a modal dialog to create a new category
 * @param {boolean} show - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSuccess - Callback when category is successfully created (receives categoryId)
 */
export default function AddModal({ show, onClose, onSuccess }) {
  if (!show) return null;

  return (
    <Modal title="Create Category" onClose={onClose}>
      <CategoryForm
        mode="create"
        category={null}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
