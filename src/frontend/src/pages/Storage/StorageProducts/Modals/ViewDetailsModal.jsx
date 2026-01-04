// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * ViewDetailsModal - Displays comprehensive product warehouse information
 * Shows product details and all warehouse locations where the product is stored
 * Includes product metadata (SKU, EAN, price, category) and location-quantity breakdown
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.product - Selected product row with rawData containing full product info
 * @param {function} props.onClose - Callback to close the modal
 */
export default function ViewDetailsModal({ show, product, onClose }) {
  // Don't render if modal is not shown or product is missing
  if (!show || !product) return null;

  // Extract product data from rawData property
  const productData = product.rawData;

  return (
    <Modal
      title="Product Location Details"
      onClose={onClose}
      wide
    >
      <div className="product-details-modal">
        {/* === PRODUCT INFORMATION SECTION === */}
        <h3>Product Information</h3>
        <ul>
          {/* Product Name */}
          <li>
            <strong>Name:</strong> {productData.productName}
          </li>

          {/* Product SKU */}
          <li>
            <strong>SKU:</strong> {productData.productSKU}
          </li>

          {/* Product EAN (optional) */}
          <li>
            <strong>EAN:</strong> {productData.productEAN || "—"}
          </li>

          {/* Product Price */}
          <li>
            <strong>Price:</strong> ${productData.productPrice.toFixed(2)}
          </li>

          {/* Category */}
          <li>
            <strong>Category:</strong> {productData.categoryName}
          </li>

          {/* Total Quantity across all locations */}
          <li>
            <strong>Total Quantity:</strong> {productData.totalQuantity}
          </li>

          {/* Number of locations */}
          <li>
            <strong>Locations:</strong> Located in {productData.locations?.length || 0} warehouse location{productData.locations?.length !== 1 ? "s" : ""}
          </li>

          {/* Product Description (optional) */}
          <li>
            <strong>Description:</strong> {productData.productDescription || "—"}
          </li>
        </ul>

        {/* === WAREHOUSE LOCATIONS SECTION === */}
        <h3>Warehouse Locations</h3>
        {productData.locations && productData.locations.length > 0 ? (
          <table className="locations-table">
            <thead>
              <tr>
                <th>Location Code</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {/* Map through each location where product is stored */}
              {productData.locations.map((loc, idx) => (
                <tr key={idx}>
                  <td>{loc.locationCode}</td>
                  <td>{loc.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No locations found for this product.</p>
        )}
      </div>
    </Modal>
  );
}
