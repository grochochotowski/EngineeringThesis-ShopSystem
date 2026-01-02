import React from "react";
import Modal from "../../../../components/Modal";
import ProductForm from "../../../../components/Forms/ProductForm";

/**
 * AddEditModal - Modal for creating or editing products
 * Displays a product form within a modal dialog
 * @param {boolean} show - Controls modal visibility
 * @param {object} product - Product data to edit (null for create mode)
 * @param {Map} categories - Map of category IDs to names
 * @param {Map} taxRates - Map of tax rate IDs to rates
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSuccess - Callback when product is successfully saved (receives productId)
 */
export default function AddEditModal({ show, product, categories, taxRates, onClose, onSuccess }) {
  if (!show) return null;

  const isEdit = !!product;

  return (
    <Modal
      title={isEdit ? "Edit Product" : "Add Product"}
      onClose={onClose}
      wide
    >
      <p>
        {isEdit
          ? `Editing product: ${product.name}`
          : "Creating new product"}
      </p>
      <ProductForm
        product={product}
        categories={categories}
        taxRates={taxRates}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
