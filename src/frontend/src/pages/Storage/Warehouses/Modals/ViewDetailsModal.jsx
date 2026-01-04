// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * ViewDetailsModal - Displays product information and all warehouse locations
 * Shows product details and complete list of locations where product is stored
 * Highlights the currently selected location in the table
 * Fetches all location data from API when opened
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.selectedItem - Currently selected warehouse item (product-location combination)
 * @param {array} props.productAllLocations - All locations where this product exists
 * @param {function} props.onClose - Callback to close the modal
 */
export default function ViewDetailsModal({
  show,
  selectedItem,
  productAllLocations,
  onClose,
}) {
  // Don't render if modal is not shown or item is missing
  if (!show || !selectedItem) return null;

  return (
    <Modal
      title="Warehouse Item Details"
      onClose={onClose}
      wide
    >
      <div className="product-details-modal">
        {/* === PRODUCT INFORMATION === */}
        <h3>Product Information</h3>
        <ul>
          {/* Product Name */}
          <li>
            <strong>Name:</strong> {selectedItem.rawData.productName}
          </li>

          {/* Product SKU */}
          <li>
            <strong>SKU:</strong> {selectedItem.rawData.productSKU}
          </li>

          {/* Product Price */}
          <li>
            <strong>Price:</strong> ${selectedItem.rawData.productPrice.toFixed(2)}
          </li>

          {/* Category */}
          <li>
            <strong>Category:</strong> {selectedItem.rawData.categoryName}
          </li>

          {/* Product Description (optional) */}
          <li>
            <strong>Description:</strong> {selectedItem.rawData.productDescription || "—"}
          </li>
        </ul>

        {/* === ALL WAREHOUSE LOCATIONS === */}
        <h3>All Warehouse Locations</h3>
        {productAllLocations.length > 0 ? (
          <table className="data-table" style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th style={{ width: "60%" }}>Location Code</th>
                <th style={{ width: "40%", textAlign: "right" }}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {/* Map through all locations where product exists */}
              {productAllLocations.map((loc) => (
                <tr
                  key={loc.locationId}
                  className={loc.locationId === selectedItem.locationId ? "selected" : ""}
                >
                  <td>
                    {loc.locationCode}
                    {/* Highlight currently selected location */}
                    {loc.locationId === selectedItem.locationId && (
                      <span style={{ color: "var(--primary)", marginLeft: "0.5rem", fontWeight: "bold" }}>
                        (selected)
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>{loc.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
            No location data available
          </p>
        )}
      </div>
    </Modal>
  );
}
