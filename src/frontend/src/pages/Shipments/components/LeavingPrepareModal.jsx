import React, { useState, useEffect, useRef } from "react";
import Modal from "../../../components/Modal";
import { api } from "../../../api/apiClient";

export default function LeavingPrepareModal({
  isOpen,
  onClose,
  onComplete,
  setToast,
  shipment,
  locations,
}) {
  const [saving, setSaving] = useState(false);
  const [dimensions, setDimensions] = useState({
    height: "",
    width: "",
    length: "",
    weight: "",
  });

  // Product scanning
  const [scanInput, setScanInput] = useState("");
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef(null);

  // Selected products with location tracking
  const [preparedProducts, setPreparedProducts] = useState([]);
  // Structure: [{ productId, sku, name, totalNeeded, inStore, locations: [{ locationId, quantity }] }]

  // Fetch shipment products (if any already added)
  useEffect(() => {
    if (shipment && shipment.id) {
      fetchShipmentProducts();
      fetchShipmentDimensions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment]);

  // Fetch shipment products
  const fetchShipmentProducts = async () => {
    try {
      const response = await api.get(`/Shipments/${shipment.id}/products`);
      if (response && response.length > 0) {
        // Load products with their stock information
        const productsWithStock = await Promise.all(
          response.map(async (sp) => {
            const stockData = await fetchProductStock(sp.productId);
            return {
              productId: sp.productId,
              sku: sp.productSKU,
              name: sp.productName,
              totalNeeded: sp.quantity,
              inStore: stockData.totalQuantity,
              locations: [], // Will be populated from preparation data if exists
            };
          })
        );
        setPreparedProducts(productsWithStock);
      }
    } catch (err) {
      console.error("Failed to fetch shipment products", err);
    }
  };

  // Fetch shipment dimensions if already set
  const fetchShipmentDimensions = async () => {
    try {
      const details = await api.get(`/Shipments/${shipment.id}`);
      if (details) {
        setDimensions({
          height: details.height || "",
          width: details.width || "",
          length: details.length || "",
          weight: details.weight || "",
        });
      }
    } catch (err) {
      console.error("Failed to fetch shipment dimensions", err);
    }
  };

  // Fetch product stock
  const fetchProductStock = async (productId) => {
    try {
      const response = await api.get(`/products-in-warehouse/${productId}`);
      return {
        totalQuantity: response.totalQuantity || 0,
        locations: response.locations || [],
      };
    } catch (err) {
      console.error("Failed to fetch product stock", err);
      return { totalQuantity: 0, locations: [] };
    }
  };

  // Handle dimension input change
  const handleDimensionChange = (e) => {
    const { name, value } = e.target;
    setDimensions(prev => ({ ...prev, [name]: value }));
  };

  // Handle scan input change
  const handleScanInputChange = async (e) => {
    const value = e.target.value;
    setScanInput(value);

    if (value.length >= 2) {
      await searchProducts(value);
      setShowDropdown(true);
      setHighlightedIndex(0);
    } else {
      setShowDropdown(false);
      setProductSuggestions([]);
    }
  };

  // Search products
  const searchProducts = async (searchTerm) => {
    try {
      const response = await api.get("/products-in-warehouse/search-product", {
        params: {
          pageNumber: 1,
          pageSize: 10,
          searchTerm,
        },
      });
      setProductSuggestions(response.items || []);
    } catch (err) {
      console.error("Failed to search products", err);
    }
  };

  // Handle product selection from dropdown
  const handleSelectProduct = async (product) => {
    // Check if product already added
    if (preparedProducts.find(p => p.productId === product.productId)) {
      setToast({ type: "warning", message: "Product already added" });
      setScanInput("");
      setShowDropdown(false);
      return;
    }

    // Fetch full stock data
    const stockData = await fetchProductStock(product.productId);

    // Add product to prepared list
    const newProduct = {
      productId: product.productId,
      sku: product.productSKU,
      name: product.productName,
      totalNeeded: 0, // User will set via location quantities
      inStore: stockData.totalQuantity,
      locations: [{ locationId: "", quantity: "" }], // Start with one empty location input
    };

    setPreparedProducts(prev => [...prev, newProduct]);
    setScanInput("");
    setShowDropdown(false);
  };

  // Handle keyboard navigation in dropdown
  const handleKeyDown = (e) => {
    if (!showDropdown || productSuggestions.length === 0) {
      if (e.key === "Enter" && scanInput) {
        // Try to find exact SKU match
        const exactMatch = productSuggestions.find(p =>
          p.productSKU.toLowerCase() === scanInput.toLowerCase()
        );
        if (exactMatch) {
          handleSelectProduct(exactMatch);
        }
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, productSuggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (productSuggestions[highlightedIndex]) {
          handleSelectProduct(productSuggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
      default:
        break;
    }
  };

  // Add location input for a product
  const handleAddLocationInput = (productId) => {
    setPreparedProducts(prev => prev.map(p => {
      if (p.productId === productId) {
        return {
          ...p,
          locations: [...p.locations, { locationId: "", quantity: "" }],
        };
      }
      return p;
    }));
  };

  // Remove location input for a product
  const handleRemoveLocationInput = (productId, index) => {
    setPreparedProducts(prev => prev.map(p => {
      if (p.productId === productId) {
        const newLocations = p.locations.filter((_, i) => i !== index);
        return {
          ...p,
          locations: newLocations.length > 0 ? newLocations : [{ locationId: "", quantity: "" }],
        };
      }
      return p;
    }));
  };

  // Handle location change for a product
  const handleLocationChange = (productId, index, field, value) => {
    setPreparedProducts(prev => prev.map(p => {
      if (p.productId === productId) {
        const newLocations = [...p.locations];
        newLocations[index] = { ...newLocations[index], [field]: value };
        return { ...p, locations: newLocations };
      }
      return p;
    }));
  };

  // Remove product from prepared list
  const handleRemoveProduct = (productId) => {
    setPreparedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  // Calculate total quantity from locations for a product
  const calculateTotalFromLocations = (product) => {
    return product.locations.reduce((sum, loc) => {
      const qty = parseInt(loc.quantity) || 0;
      return sum + qty;
    }, 0);
  };

  // Get available quantity at a location (total - what's being prepared)
  const getAvailableAtLocation = (productId, locationId) => {
    if (!locationId) return 0;

    const product = preparedProducts.find(p => p.productId === productId);
    if (!product) return 0;

    // Find location stock
    const location = locations.find(l => l.id === parseInt(locationId));
    if (!location) return 0;

    // Calculate how much is already allocated to this product from this location
    const allocatedFromThisLocation = product.locations
      .filter(l => l.locationId === locationId)
      .reduce((sum, l) => sum + (parseInt(l.quantity) || 0), 0);

    // Get product quantity at this location
    // TODO: This would need a proper endpoint to get product quantity per location
    // For now, using a simplified approach
    return product.inStore; // Simplified - should be location-specific
  };

  // Validate preparation
  const validatePreparation = () => {
    // Check dimensions
    if (!dimensions.height || !dimensions.width || !dimensions.length || !dimensions.weight) {
      setToast({ type: "error", message: "All package dimensions are required" });
      return false;
    }

    if (preparedProducts.length === 0) {
      setToast({ type: "error", message: "At least one product must be added" });
      return false;
    }

    // Validate each product
    for (const product of preparedProducts) {
      const total = calculateTotalFromLocations(product);

      if (total <= 0) {
        setToast({ type: "error", message: `Product ${product.sku}: quantity must be greater than 0` });
        return false;
      }

      if (total > product.inStore) {
        setToast({ type: "error", message: `Product ${product.sku}: quantity (${total}) exceeds in-store stock (${product.inStore})` });
        return false;
      }

      // Check if all locations are filled
      for (const loc of product.locations) {
        if (!loc.locationId || !loc.quantity) {
          setToast({ type: "error", message: `Product ${product.sku}: all location fields must be filled` });
          return false;
        }
      }
    }

    return true;
  };

  // Handle Save (keep in preparation)
  const handleSave = async () => {
    if (!validatePreparation()) return;

    try {
      setSaving(true);

      // Update shipment dimensions
      await api.put(`/Shipments/${shipment.id}`, {
        height: parseFloat(dimensions.height),
        width: parseFloat(dimensions.width),
        length: parseFloat(dimensions.length),
        weight: parseFloat(dimensions.weight),
      });

      // Save product preparation data (without completing)
      // Note: This may require a custom endpoint or storing in local state
      setToast({ type: "success", message: "Preparation saved successfully" });
      onComplete();
      onClose();
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Failed to save preparation" });
    } finally {
      setSaving(false);
    }
  };

  // Handle Finish Preparation
  const handleFinishPreparation = async () => {
    if (!validatePreparation()) return;

    try {
      setSaving(true);

      // Prepare payload for complete preparation endpoint
      const payload = {
        height: parseFloat(dimensions.height),
        width: parseFloat(dimensions.width),
        length: parseFloat(dimensions.length),
        weight: parseFloat(dimensions.weight),
        products: preparedProducts.map(p => ({
          productId: p.productId,
          locationQuantities: p.locations.map(loc => ({
            locationId: parseInt(loc.locationId),
            quantity: parseInt(loc.quantity),
          })),
        })),
      };

      // Call the complete preparation endpoint
      await api.post(`/Shipments/${shipment.id}/complete-preparation`, payload);

      setToast({ type: "success", message: "Shipment preparation completed successfully" });
      onComplete();
      onClose();
    } catch (err) {
      console.error(err);
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to complete preparation",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Prepare Shipment" size="large">
      <div className="prepare-modal-content">
        {/* Package Dimensions Section */}
        <div className="dimensions-section">
          <h4>Package Dimensions</h4>
          <div className="dimensions-inputs">
            <div className="form-group">
              <label>Height (cm): *</label>
              <input
                type="number"
                name="height"
                value={dimensions.height}
                onChange={handleDimensionChange}
                placeholder="Height"
                min="0"
                step="0.1"
              />
            </div>
            <div className="form-group">
              <label>Width (cm): *</label>
              <input
                type="number"
                name="width"
                value={dimensions.width}
                onChange={handleDimensionChange}
                placeholder="Width"
                min="0"
                step="0.1"
              />
            </div>
            <div className="form-group">
              <label>Length (cm): *</label>
              <input
                type="number"
                name="length"
                value={dimensions.length}
                onChange={handleDimensionChange}
                placeholder="Length"
                min="0"
                step="0.1"
              />
            </div>
            <div className="form-group">
              <label>Weight (kg): *</label>
              <input
                type="number"
                name="weight"
                value={dimensions.weight}
                onChange={handleDimensionChange}
                placeholder="Weight"
                min="0"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Product Scanning Section */}
        <div className="scanning-section">
          <h4>Add Products</h4>
          <div className="scan-input-wrapper" ref={dropdownRef}>
            <input
              type="text"
              value={scanInput}
              onChange={handleScanInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter product name or SKU code..."
              className="scan-input"
            />

            {/* Dropdown for suggestions */}
            {showDropdown && productSuggestions.length > 0 && (
              <div className="product-dropdown">
                {productSuggestions.map((product, index) => (
                  <div
                    key={product.productId}
                    className={`dropdown-item ${index === highlightedIndex ? "highlighted" : ""}`}
                    onClick={() => handleSelectProduct(product)}
                  >
                    <span className="product-sku">{product.productSKU}</span>
                    <span className="product-name">{product.productName}</span>
                    <span className="product-stock">Stock: {product.totalQuantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prepared Products List */}
        <div className="prepared-products-section">
          <h4>Products to Pack</h4>
          {preparedProducts.length === 0 ? (
            <p className="no-products">No products added yet. Search and select products above.</p>
          ) : (
            <div className="products-list">
              {preparedProducts.map(product => {
                const totalQty = calculateTotalFromLocations(product);
                const isValid = totalQty > 0 && totalQty <= product.inStore;

                return (
                  <div key={product.productId} className="product-card">
                    <div className="product-header">
                      <div className="product-info">
                        <span className="product-name">{product.name}</span>
                        <span className="product-sku">{product.sku}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveProduct(product.productId)}
                        className="btn-remove"
                      >
                        ×
                      </button>
                    </div>

                    <div className="product-quantities">
                      <span>Shipment Qty: <strong>{totalQty}</strong></span>
                      <span className={totalQty > product.inStore ? "error" : ""}>
                        In Store: <strong>{product.inStore}</strong>
                      </span>
                    </div>

                    {/* Location Inputs */}
                    <div className="location-inputs">
                      {product.locations.map((loc, index) => (
                        <div key={index} className="location-row">
                          <div className="form-group">
                            <label>Quantity:</label>
                            <input
                              type="number"
                              value={loc.quantity}
                              onChange={(e) => handleLocationChange(product.productId, index, "quantity", e.target.value)}
                              placeholder="Qty"
                              min="1"
                            />
                          </div>
                          <div className="form-group">
                            <label>From Location:</label>
                            <select
                              value={loc.locationId}
                              onChange={(e) => handleLocationChange(product.productId, index, "locationId", e.target.value)}
                            >
                              <option value="">Select location</option>
                              {locations.map(location => (
                                <option key={location.id} value={location.id}>
                                  {location.locationCode} [{location.availableQuantity || "N/A"}]
                                </option>
                              ))}
                            </select>
                          </div>
                          {product.locations.length > 1 && (
                            <button
                              onClick={() => handleRemoveLocationInput(product.productId, index)}
                              className="btn-remove-location"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        onClick={() => handleAddLocationInput(product.productId)}
                        className="btn-add-location"
                      >
                        + Add Another Location
                      </button>
                    </div>

                    {!isValid && totalQty > 0 && (
                      <div className="validation-error">
                        Quantity exceeds available stock!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-secondary" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={handleFinishPreparation} className="btn-primary" disabled={saving}>
            {saving ? "Finishing..." : "Finish Preparation"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
