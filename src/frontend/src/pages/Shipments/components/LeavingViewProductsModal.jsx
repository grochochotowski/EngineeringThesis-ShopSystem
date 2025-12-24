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
      return productPrep?.locations || [];
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
    <Modal isOpen={isOpen} onClose={onClose} title="View Shipment Products" size="medium">
      <div className="view-products-modal-content">
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="no-products">No products in this shipment</div>
        ) : (
          <div className="products-list">
            <table className="products-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <React.Fragment key={product.productId}>
                    <tr>
                      <td>{product.productSKU}</td>
                      <td>{product.productName}</td>
                      <td>{product.quantity}</td>
                      <td>
                        <button
                          onClick={() => handleToggleLocations(product.productId)}
                          className="btn-view-locations"
                        >
                          {expandedProductIds[product.productId] ? "Hide Locations" : "View Locations"}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Locations Row */}
                    {expandedProductIds[product.productId] && (
                      <tr className="locations-row">
                        <td colSpan="4">
                          <div className="locations-details">
                            <h5>Source Locations:</h5>
                            {expandedProductIds[product.productId].length === 0 ? (
                              <p>No location information available</p>
                            ) : (
                              <table className="locations-table">
                                <thead>
                                  <tr>
                                    <th>Location Code</th>
                                    <th>Quantity Taken</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {expandedProductIds[product.productId].map((loc, index) => (
                                    <tr key={index}>
                                      <td>{loc.locationCode}</td>
                                      <td>{loc.quantity}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Actions */}
        <div className="modal-actions">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .view-products-modal-content {
          padding: 20px;
        }

        .loading,
        .no-products {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .products-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }

        .products-table th,
        .products-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        .products-table th {
          background-color: #f5f5f5;
          font-weight: 600;
        }

        .products-table tbody tr:hover {
          background-color: #f9f9f9;
        }

        .btn-view-locations {
          padding: 6px 12px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-view-locations:hover {
          background-color: #0056b3;
        }

        .locations-row {
          background-color: #f8f9fa;
        }

        .locations-details {
          padding: 15px;
        }

        .locations-details h5 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .locations-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        .locations-table th,
        .locations-table td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #ddd;
          font-size: 13px;
        }

        .locations-table th {
          background-color: #e9ecef;
          font-weight: 600;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }

        .btn-primary {
          padding: 10px 20px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-primary:hover {
          background-color: #0056b3;
        }
      `}</style>
    </Modal>
  );
}
