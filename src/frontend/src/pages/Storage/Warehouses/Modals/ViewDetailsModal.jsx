// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * ViewDetailsModal - Displays products at a selected warehouse location
 * Shows location details and table of all products stored at that location
 * Used in Warehouse Structure page to view location contents
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.location - Selected location object
 * @param {array} props.products - Array of products at this location
 * @param {function} props.onClose - Callback to close the modal
 */
export default function ViewDetailsModal({
  show,
  location,
  products,
  onClose,
}) {
  // Don't render if modal is not shown or location is missing
  if (!show || !location) return null;

  return (
    <Modal
      title={`Products at Location ${location.code}`}
      onClose={onClose}
      wide
    >
      <div className="location-details-modal">
        {/* === LOCATION INFORMATION === */}
        <h3>Location Information</h3>
        <ul>
          {/* Location Code */}
          <li>
            <strong>Code:</strong> {location.code}
          </li>

          {/* Zone */}
          <li>
            <strong>Zone:</strong> {location.zone}
          </li>

          {/* Column */}
          <li>
            <strong>Column:</strong> {location.column}
          </li>

          {/* Shelf */}
          <li>
            <strong>Shelf:</strong> {location.shelf}
          </li>

          {/* Status */}
          <li>
            <strong>Status:</strong> {location.isActive}
          </li>
        </ul>

        {/* === PRODUCTS AT LOCATION === */}
        <h3>Products ({products?.length || 0})</h3>
        {products && products.length > 0 ? (
          <table className="data-table" style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th style={{ width: "40%" }}>Product Name</th>
                <th style={{ width: "20%" }}>SKU</th>
                <th style={{ width: "25%" }}>EAN</th>
                <th style={{ width: "15%", textAlign: "right" }}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {/* Map through all products at this location */}
              {products.map((product, index) => (
                <tr key={index}>
                  <td>{product.productName || "—"}</td>
                  <td>{product.productSKU || "—"}</td>
                  <td>{product.productEAN || "—"}</td>
                  <td style={{ textAlign: "right" }}>{product.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
            No products at this location
          </p>
        )}
      </div>
    </Modal>
  );
}
