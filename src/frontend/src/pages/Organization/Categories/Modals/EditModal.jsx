import React from "react";
import Modal from "../../../../components/Modal";
import CategoryForm from "../../../../components/Forms/CategoryForm";

/**
 * EditModal - Modal for editing existing categories
 * Displays a form within a modal dialog to update category details
 * @param {boolean} show - Controls modal visibility
 * @param {object} category - Category data to edit
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSuccess - Callback when category is successfully updated (receives categoryId)
 */
export default function EditModal({ show, category, onClose, onSuccess }) {
  if (!show) return null;

  return (
    <Modal title="Edit Category" onClose={onClose}>
      <CategoryForm
        mode="edit"
        category={category}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
