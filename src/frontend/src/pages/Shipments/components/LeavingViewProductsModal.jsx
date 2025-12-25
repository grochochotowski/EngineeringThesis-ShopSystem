import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { api } from "../../../api/apiClient";

export default function LeavingViewProductsModal({
  isOpen,
  onClose,
  shipmentId,
  setToast,
}) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [expandedProductIds, setExpandedProductIds] = useState({});

  // Fetch shipment products
  useEffect(() => {
    if (isOpen && shipmentId) {
      fetchShipmentProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, shipmentId]);

  // Fetch shipment products
  const fetchShipmentProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/Shipments/${shipmentId}/products`);
      setProducts(response || []);
    } catch (err) {
      console.error("Failed to fetch shipment products", err);
      setToast({ type: "error", message: "Failed to load shipment products" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch product preparation locations
  const fetchProductLocations = async (productId) => {
    try {
      const response = await api.get(`/Shipments/${shipmentId}/preparation`);
      // Find this product's location data
      const productPrep = response.find(p => p.productId === productId);
      return productPrep?.sourceLocations || [];
    } catch (err) {
      console.error("Failed to fetch product locations", err);
      setToast({ type: "error", message: "Failed to load product locations" });
      return [];
    }
  };

  // Toggle location view for a product
  const handleToggleLocations = async (productId) => {
    if (expandedProductIds[productId]) {
      // Collapse
      setExpandedProductIds(prev => ({ ...prev, [productId]: null }));
    } else {
      // Expand - fetch locations
      const locations = await fetchProductLocations(productId);
      setExpandedProductIds(prev => ({ ...prev, [productId]: locations }));
    }
  };

  return (
    <Modal
      title="Products in Shipment"
      onClose={onClose}
      wide
    >
      <div className="view-products-modal">
        {loading ? (
          <p className="no-products-message">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="no-products-message">No products in this shipment.</p>
        ) : (
          <>
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product Name (SKU)</th>
                  <th>Quantity in Shipment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <React.Fragment key={product.productId}>
                    <tr>
                      <td>{product.productName} ({product.productSKU || product.productSku})</td>
                      <td>{product.quantity}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleLocations(product.productId)}
                          className="btn-action btn-view"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                        >
                          {expandedProductIds[product.productId] ? "Hide Locations" : "View Locations"}
                        </button>
                      </td>
                    </tr>
                    {expandedProductIds[product.productId] && (
                      <tr>
                        <td colSpan="3" style={{ backgroundColor: "#f9f9f9", padding: "10px" }}>
                          <div className="locations-list">
                            {expandedProductIds[product.productId].length > 0 ? (
                              <table style={{ marginTop: "10px", width: "100%", fontSize: "13px" }}>
                                <thead>
                                  <tr>
                                    <th>Location</th>
                                    <th>Amount Taken</th>
                                    <th>Amount Left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {expandedProductIds[product.productId].map((loc, idx) => (
                                    <tr key={idx}>
                                      <td>{loc.locationCode}</td>
                                      <td>{loc.quantity}</td>
                                      <td>{loc.quantityLeft}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p style={{ marginTop: "10px", fontStyle: "italic", color: "#666" }}>
                                No locations found for this product.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            <div style={{ marginBottom: "2rem" }}></div>
          </>
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
