// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * ViewProductsModal - View products in incoming shipment
 *
 * Displays comprehensive product information in two modes:
 *
 * 1. Collection Summary Mode (after collection completed):
 *    - Shows declared quantity vs collected quantity
 *    - Color-coded rows: Green (exact), Yellow (over), Red (under)
 *    - Expandable location details showing where products were placed
 *
 * 2. Shipment View Mode (before collection):
 *    - Shows quantity in shipment
 *    - Shows current warehouse stock
 *    - Expandable location details showing current warehouse locations
 *
 * Features:
 * - Expandable/collapsible location details per product
 * - Auto-detects mode based on data structure (isCollectionData flag)
 * - Color-coded variance indicators for collection summary
 * - Detailed location breakdown (zone-column-shelf format)
 *
 * @param {object} props - Component props
 * @param {boolean} props.show - Whether to show the modal
 * @param {function} props.onClose - Callback to close the modal
 * @param {array} props.viewProductsData - Array of products to display
 * @param {object} props.expandedProductLocations - Object mapping productId to location data or null
 * @param {function} props.setExpandedProductLocations - Setter for expanded locations state
 * @param {function} props.handleToggleProductLocations - Handler for toggling location expansion (fetches data)
 */
export default function ViewProductsModal({
  show,
  onClose,
  viewProductsData,
  expandedProductLocations,
  setExpandedProductLocations,
  handleToggleProductLocations,
}) {
  if (!show) return null;

  return (
    <Modal
      title={viewProductsData[0]?.isCollectionData ? "Collection Summary" : "Products in Shipment"}
      onClose={onClose}
      wide
    >
      <div className="view-products-modal">
        {viewProductsData && viewProductsData.length > 0 ? (
          <>
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product Name (SKU)</th>
                  {viewProductsData[0]?.isCollectionData ? (
                    <>
                      <th>Declared Qty</th>
                      <th>Collected Qty</th>
                      <th>Locations</th>
                    </>
                  ) : (
                    <>
                      <th>Quantity in Shipment</th>
                      <th>Number in Storage</th>
                      <th>Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {viewProductsData.map((product, index) => {
                  // Determine row color based on variance
                  let rowStyle = {};
                  if (product.isCollectionData) {
                    if (product.varianceType === "exact") {
                      rowStyle = { backgroundColor: "#d4edda" }; // Green
                    } else if (product.varianceType === "over") {
                      rowStyle = { backgroundColor: "#fff3cd" }; // Yellow
                    } else if (product.varianceType === "under") {
                      rowStyle = { backgroundColor: "#f8d7da" }; // Red
                    }
                  }

                  return (
                    <React.Fragment key={index}>
                      <tr style={rowStyle}>
                        <td>{product.productName} ({product.productSKU})</td>
                        {product.isCollectionData ? (
                          <>
                            <td>{product.declaredQuantity}</td>
                            <td>{product.collectedQuantity}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedProductLocations(prev => ({
                                    ...prev,
                                    [product.productId]: prev[product.productId] ? null : product.locations
                                  }));
                                }}
                                className="btn-action btn-view"
                                style={{ padding: "4px 8px", fontSize: "12px" }}
                              >
                                {expandedProductLocations[product.productId] ? "Hide Locations" : "View Locations"}
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{product.quantity}</td>
                            <td>{product.warehouseStock}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => {
                                  handleToggleProductLocations(product.productId);
                                }}
                                className="btn-action btn-view"
                                style={{ padding: "4px 8px", fontSize: "12px" }}
                              >
                                {expandedProductLocations[product.productId] ? "Hide Locations" : "View Locations"}
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                      {expandedProductLocations[product.productId] && (
                        <tr>
                          <td colSpan="4" style={{ backgroundColor: "#f9f9f9", padding: "10px" }}>
                            <div className="locations-list">
                              {product.isCollectionData ? (
                                // Show collection locations directly
                                product.locations && product.locations.length > 0 ? (
                                  <table style={{ marginTop: "10px", width: "100%", fontSize: "13px" }}>
                                    <thead>
                                      <tr>
                                        <th>Location Code</th>
                                        <th>Quantity</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {product.locations.map((loc, idx) => (
                                        <tr key={idx}>
                                          <td>{loc.locationCode}</td>
                                          <td>{loc.quantity}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p style={{ marginTop: "10px", fontStyle: "italic", color: "#666" }}>
                                    No locations found for this product.
                                  </p>
                                )
                              ) : (
                                // Show fetched warehouse locations
                                expandedProductLocations[product.productId].length > 0 ? (
                                  <table style={{ marginTop: "10px", width: "100%", fontSize: "13px" }}>
                                    <thead>
                                      <tr>
                                        <th>Zone</th>
                                        <th>Column</th>
                                        <th>Shelf</th>
                                        <th>Quantity</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {expandedProductLocations[product.productId].map((loc, idx) => (
                                        <tr key={idx}>
                                          <td>{loc.zone}</td>
                                          <td>{loc.col}</td>
                                          <td>{loc.shelf}</td>
                                          <td>{loc.quantity}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p style={{ marginTop: "10px", fontStyle: "italic", color: "#666" }}>
                                    No locations found for this product.
                                  </p>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginBottom: "2rem" }}></div>
          </>
        ) : (
          <p className="no-products-message">No products in this shipment.</p>
        )}
        <div className="form-actions">
          <button
            type="button"
            onClick={onClose}
            className="btn-confirm"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
