import React, { useState, useEffect, useRef } from "react";
import Modal from "../../../../components/Modal";
import { api } from "../../../../api/apiClient";

export default function PrepareModal({
  onClose,
  onComplete,
  setToast,
  shipment,
}) {
  const [saving, setSaving] = useState(false);

  // Dimensions state
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

  // Prepared products with location tracking
  const [preparedProducts, setPreparedProducts] = useState([]);
  // Structure: [{ productId, sku, name, shipmentQuantity, inStore, locationRows: [{ locationId, quantity }] }]

  // Fetch shipment details and existing preparation data
  useEffect(() => {
    if (shipment && shipment.id) {
      loadShipmentData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment]);

  // Load shipment data - check for existing preparation first
  const loadShipmentData = async () => {
    try {
      // Always load dimensions
      const details = await api.get(`/Shipments/${shipment.id}`);
      if (details) {
        setDimensions({
          height: details.height || "",
          width: details.width || "",
          length: details.length || "",
          weight: details.weight || "",
        });
      }

      // Check if preparation data exists
      let hasExistingPreparation = false;
      try {
        const preparationData = await api.get(`/Shipments/${shipment.id}/preparation`);
        if (preparationData && preparationData.length > 0) {
          // Map existing preparation data to preparedProducts format
          const productsWithPreparation = await Promise.all(
            preparationData.map(async (prep) => {
              const stockData = await fetchProductStock(prep.productId);
              return {
                productId: prep.productId,
                sku: prep.productSku,
                ean: prep.productEAN || prep.productEan || null,
                name: prep.productName,
                shipmentQuantity: prep.totalDeclaredQuantity,
                inStore: stockData.totalQuantity,
                warehouseLocations: stockData.locations,
                locationRows: prep.sourceLocations.map(loc => ({
                  locationId: loc.locationId.toString(),
                  quantity: loc.quantity.toString(),
                })),
              };
            })
          );
          setPreparedProducts(productsWithPreparation);
          hasExistingPreparation = true;
          console.log("Loaded existing preparation data:", productsWithPreparation);
        }
      } catch (err) {
        console.log("No existing preparation data found, will load from shipment products");
      }

      // If no existing preparation, load from shipment products
      if (!hasExistingPreparation) {
        const shipmentProducts = await api.get(`/Shipments/${shipment.id}/products`);
        if (shipmentProducts && shipmentProducts.length > 0) {
          const productsWithStock = await Promise.all(
            shipmentProducts.map(async (sp) => {
              const stockData = await fetchProductStock(sp.productId);
              return {
                productId: sp.productId,
                sku: sp.productSKU,
                ean: sp.productEAN || sp.productEan || null,
                name: sp.productName,
                shipmentQuantity: sp.quantity,
                inStore: stockData.totalQuantity,
                warehouseLocations: stockData.locations,
                locationRows: [{ locationId: "", quantity: "" }], // Start with one empty row
              };
            })
          );
          setPreparedProducts(productsWithStock);
          console.log("Loaded fresh shipment products:", productsWithStock);
        }
      }
    } catch (err) {
      console.error("Failed to load shipment data", err);
      setToast({ type: "error", message: "Failed to load shipment details" });
    }
  };

  // Fetch product stock and locations
  const fetchProductStock = async (productId) => {
    try {
      const response = await api.get(`/products-in-warehouse/product/${productId}`);
      return {
        totalQuantity: response.reduce((sum, loc) => sum + loc.quantity, 0),
        locations: response, // Array of { locationId, locationCode, zone, col, shelf, quantity }
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

  // Handle scan input change - search products
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
      setToast({ type: "warning", message: "Product already in preparation list" });
      setScanInput("");
      setShowDropdown(false);
      return;
    }

    // Fetch full stock data with locations
    const stockData = await fetchProductStock(product.productId);
    console.log("📍 Stock data for product:", stockData);
    console.log("📍 Warehouse locations:", stockData.locations);

    // VALIDATION: Check if product has any stock in warehouse
    if (stockData.totalQuantity === 0 || !stockData.locations || stockData.locations.length === 0) {
      const productName = product.productName || product.name || product.Name || "Unknown";
      setToast({
        type: "error",
        message: `Cannot add "${productName}": No stock available in warehouse`
      });
      setScanInput("");
      setShowDropdown(false);
      return;
    }

    // Add product to prepared list (with fallback for different property names)
    const newProduct = {
      productId: product.productId,
      sku: product.productSKU || product.sku || product.SKU || product.productSku || "N/A",
      ean: product.ean || product.EAN || null,
      name: product.productName || product.name || product.Name || "Unknown",
      shipmentQuantity: 0, // User added product (not in original shipment)
      inStore: stockData.totalQuantity,
      warehouseLocations: stockData.locations,
      locationRows: [{ locationId: "", quantity: "" }], // Start with one empty row
    };

    console.log("📍 New product created:", newProduct);

    setPreparedProducts(prev => [...prev, newProduct]);
    setScanInput("");
    setShowDropdown(false);
  };

  // Handle keyboard navigation in dropdown
  const handleKeyDown = async (e) => {
    if (!showDropdown || productSuggestions.length === 0) {
      if (e.key === "Enter" && scanInput) {
        e.preventDefault();

        // Check if input is EAN-13 (exactly 13 digits)
        const isEAN13 = /^\d{13}$/.test(scanInput.trim());

        if (isEAN13) {
          // Search for exact EAN match
          try {
            const response = await api.get("/products-in-warehouse/search-product", {
              params: {
                pageNumber: 1,
                pageSize: 1,
                searchTerm: scanInput.trim(),
              },
            });

            const products = response.items || [];
            if (products.length > 0) {
              const product = products[0];
              const productEAN = product.ean || product.EAN || "";

              // Verify exact EAN match
              if (productEAN === scanInput.trim()) {
                await handleSelectProduct(product);
                return;
              }
            }

            setToast({ type: "error", message: `No product found with EAN: ${scanInput}` });
          } catch (err) {
            console.error("Failed to search by EAN", err);
            setToast({ type: "error", message: "Failed to search product" });
          }
          return;
        }

        // Try to find exact SKU match and auto-add
        const exactMatch = productSuggestions.find(p => {
          const sku = p.productSKU || p.sku || p.SKU || p.productSku || "";
          return sku.toLowerCase() === scanInput.toLowerCase();
        });
        if (exactMatch) {
          handleSelectProduct(exactMatch);
        } else {
          setToast({ type: "info", message: `No exact match found for: ${scanInput}` });
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

  // Add location row for a product
  const handleAddLocationRow = (productId) => {
    setPreparedProducts(prev => prev.map(p => {
      if (p.productId === productId) {
        return {
          ...p,
          locationRows: [...p.locationRows, { locationId: "", quantity: "" }],
        };
      }
      return p;
    }));
  };

  // Remove location row for a product
  const handleRemoveLocationRow = (productId, index) => {
    setPreparedProducts(prev => prev.map(p => {
      if (p.productId === productId) {
        const newRows = p.locationRows.filter((_, i) => i !== index);
        return {
          ...p,
          locationRows: newRows.length > 0 ? newRows : [{ locationId: "", quantity: "" }],
        };
      }
      return p;
    }));
  };

  // Handle location or quantity change
  const handleLocationRowChange = (productId, index, field, value) => {
    console.log(`🔄 Location row change: productId=${productId}, index=${index}, field=${field}, value=${value}, valueType=${typeof value}`);

    setPreparedProducts(prev => prev.map(p => {
      if (p.productId === productId) {
        const newRows = [...p.locationRows];
        newRows[index] = { ...newRows[index], [field]: value };
        console.log(`🔄 Updated row:`, newRows[index]);
        return { ...p, locationRows: newRows };
      }
      return p;
    }));
  };

  // Remove product from prepared list
  const handleRemoveProduct = (productId) => {
    setPreparedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  // Calculate total quantity from location rows
  const calculateTotalFromRows = (product) => {
    return product.locationRows.reduce((sum, row) => {
      const qty = parseInt(row.quantity) || 0;
      return sum + qty;
    }, 0);
  };

  // Get available quantity at a specific location for a product
  // excludeRowIndex: optional parameter to exclude a specific row from the calculation (when validating that row itself)
  const getAvailableAtLocation = (product, locationId, excludeRowIndex = null) => {
    console.log("🔍 getAvailableAtLocation called:");
    console.log("  Product:", product.name, product.sku);
    console.log("  Location ID:", locationId, "Type:", typeof locationId);
    console.log("  Exclude row index:", excludeRowIndex);

    if (!locationId) {
      console.log("  ❌ No locationId, returning 0");
      return 0;
    }

    const warehouseLoc = product.warehouseLocations.find(l => l.locationId === parseInt(locationId));
    console.log("  Warehouse Location found:", warehouseLoc);

    if (!warehouseLoc) {
      console.log("  ❌ No warehouse location found, returning 0");
      return 0;
    }

    console.log("  Total in warehouse at this location:", warehouseLoc.quantity);

    // Calculate how much is already allocated from this location in OTHER rows
    // Exclude the current row being validated (excludeRowIndex) to avoid counting it against itself
    console.log("  All location rows for this product:", product.locationRows);

    const matchingRows = product.locationRows.filter((row, index) => {
      const isExcluded = excludeRowIndex !== null && index === excludeRowIndex;
      const match = String(row.locationId) === String(locationId) && !isExcluded;
      console.log(`    Row[${index}] locationId: ${row.locationId} (${typeof row.locationId}), comparing to ${locationId} (${typeof locationId}), excluded: ${isExcluded}, match: ${match}, quantity: ${row.quantity}`);
      return match;
    });

    const allocatedFromThisLocation = matchingRows.reduce((sum, row) => sum + (parseInt(row.quantity) || 0), 0);

    console.log("  Matching rows (excluding current):", matchingRows);
    console.log("  Allocated from this location (in other rows):", allocatedFromThisLocation);

    const available = warehouseLoc.quantity - allocatedFromThisLocation;
    console.log("  ✅ Available:", available, "(", warehouseLoc.quantity, "-", allocatedFromThisLocation, ")");

    return available;
  };

  // Validate preparation before saving/finishing
  const validatePreparation = () => {
    // Check dimensions
    if (!dimensions.height || !dimensions.width || !dimensions.length || !dimensions.weight) {
      setToast({ type: "error", message: "All package dimensions are required (Height, Width, Length, Weight)" });
      return false;
    }

    if (preparedProducts.length === 0) {
      setToast({ type: "error", message: "At least one product must be added to the preparation" });
      return false;
    }

    // Validate each product
    for (const product of preparedProducts) {
      const totalPrepared = calculateTotalFromRows(product);

      // Check if any quantity was entered
      if (totalPrepared <= 0) {
        setToast({ type: "error", message: `Product "${product.sku}": Total quantity must be greater than 0` });
        return false;
      }

      // Check if total doesn't exceed in-store stock
      if (totalPrepared > product.inStore) {
        setToast({ type: "error", message: `Product "${product.sku}": Prepared quantity (${totalPrepared}) exceeds available stock (${product.inStore})` });
        return false;
      }

      // Check that all rows with quantity > 0 have a location selected
      console.log("📦 Validating product:", product.name, product.sku);
      console.log("   Location rows:", product.locationRows);

      for (let rowIndex = 0; rowIndex < product.locationRows.length; rowIndex++) {
        const row = product.locationRows[rowIndex];
        const qty = parseInt(row.quantity) || 0;
        console.log(`   Checking row[${rowIndex}]: locationId=${row.locationId}, quantity=${row.quantity}, parsed=${qty}`);

        if (qty > 0 && !row.locationId) {
          console.log("   ❌ ERROR: Quantity entered but no location selected");
          setToast({ type: "error", message: `Product "${product.sku}": Please select a location for all quantities` });
          return false;
        }

        // Check that quantity doesn't exceed available at location
        // Pass rowIndex to exclude this row from "already allocated" calculation
        if (qty > 0 && row.locationId) {
          console.log(`   Checking if qty ${qty} exceeds available at location ${row.locationId} (excluding row ${rowIndex})`);
          const available = getAvailableAtLocation(product, row.locationId, rowIndex);
          console.log(`   qty (${qty}) > available (${available})? ${qty > available}`);

          if (qty > available) {
            const loc = product.warehouseLocations.find(l => l.locationId === parseInt(row.locationId));
            const locCode = loc ? `${loc.zone}-${loc.col}-${loc.shelf}` : row.locationId;
            console.log(`   ❌ ERROR: Quantity ${qty} exceeds available ${available} at location ${locCode}`);
            console.log(`   Location details:`, loc);
            setToast({ type: "error", message: `Product "${product.sku}": Quantity at location ${locCode} exceeds available stock (${available} available)` });
            return false;
          } else {
            console.log(`   ✅ OK: Quantity ${qty} is within available ${available}`);
          }
        }
      }
    }

    return true;
  };

  // Handle Save (keep status as "In Preparation")
  const handleSave = async () => {
    // For "Save Progress", we don't require dimensions - only validate products
    if (preparedProducts.length === 0) {
      setToast({ type: "error", message: "At least one product must be added to the preparation" });
      return false;
    }

    // Validate each product (same as validatePreparation but without dimension check)
    for (const product of preparedProducts) {
      const totalPrepared = calculateTotalFromRows(product);

      if (totalPrepared <= 0) {
        setToast({ type: "error", message: `Product "${product.sku}": Total quantity must be greater than 0` });
        return false;
      }

      if (totalPrepared > product.inStore) {
        setToast({ type: "error", message: `Product "${product.sku}": Prepared quantity (${totalPrepared}) exceeds available stock (${product.inStore})` });
        return false;
      }

      for (let rowIndex = 0; rowIndex < product.locationRows.length; rowIndex++) {
        const row = product.locationRows[rowIndex];
        const qty = parseInt(row.quantity) || 0;

        if (qty > 0 && !row.locationId) {
          setToast({ type: "error", message: `Product "${product.sku}": Please select a location for all quantities` });
          return false;
        }

        if (qty > 0 && row.locationId) {
          // Pass rowIndex to exclude this row from "already allocated" calculation
          const available = getAvailableAtLocation(product, row.locationId, rowIndex);

          if (qty > available) {
            const loc = product.warehouseLocations.find(l => l.locationId === parseInt(row.locationId));
            const locCode = loc ? `${loc.zone}-${loc.col}-${loc.shelf}` : row.locationId;
            setToast({ type: "error", message: `Product "${product.sku}": Quantity at location ${locCode} exceeds available stock (${available} available)` });
            return false;
          }
        }
      }
    }

    try {
      setSaving(true);

      // Build payload for save progress
      // isFinishing: false -> allows partial quantities, no strict validation, status stays InPreparation
      const payload = {
        isFinishing: false,
        preparedProducts: preparedProducts.map(p => ({
          productId: p.productId,
          sourceLocations: p.locationRows
            .filter(row => parseInt(row.quantity) > 0 && row.locationId)
            .map(row => ({
              locationId: parseInt(row.locationId),
              quantity: parseInt(row.quantity),
            })),
        })),
        // Include dimensions if user has entered them (optional for "Save Progress")
        ...(dimensions.weight !== "" && { weight: parseFloat(dimensions.weight) }),
        ...(dimensions.length !== "" && { length: parseFloat(dimensions.length) }),
        ...(dimensions.width !== "" && { width: parseFloat(dimensions.width) }),
        ...(dimensions.height !== "" && { height: parseFloat(dimensions.height) }),
      };

      await api.post(`/Shipments/${shipment.id}/complete-preparation`, payload);

      setToast({ type: "success", message: "Preparation progress saved successfully" });
      onComplete();
      onClose();
    } catch (err) {
      console.error(err);
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to save preparation",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Finish Preparation (save and change status to "Awaiting Pickup")
  const handleFinishPreparation = async () => {
    if (!validatePreparation()) return;

    try {
      setSaving(true);

      // Build payload for complete preparation
      // isFinishing: true -> strict validation, requires all dimensions, changes status to AwaitingPickup
      const payload = {
        isFinishing: true,
        preparedProducts: preparedProducts.map(p => ({
          productId: p.productId,
          sourceLocations: p.locationRows
            .filter(row => parseInt(row.quantity) > 0 && row.locationId)
            .map(row => ({
              locationId: parseInt(row.locationId),
              quantity: parseInt(row.quantity),
            })),
        })),
        weight: parseFloat(dimensions.weight),
        length: parseFloat(dimensions.length),
        width: parseFloat(dimensions.width),
        height: parseFloat(dimensions.height),
      };

      // Call complete preparation endpoint
      await api.post(`/Shipments/${shipment.id}/complete-preparation`, payload);

      setToast({ type: "success", message: "Shipment preparation completed successfully! Status changed to Awaiting Pickup." });
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
    <Modal
      title="Prepare Shipment for Delivery"
      onClose={onClose}
      wide
    >
      <div className="collection-modal">
        {/* Section 1: Dimensions */}
        <div className="scan-panel">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", width: "100%" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", fontWeight: 500 }}>
                Height (cm) *
              </label>
              <input
                type="number"
                name="height"
                value={dimensions.height}
                onChange={handleDimensionChange}
                placeholder="0.0"
                min="0"
                step="0.1"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", fontWeight: 500 }}>
                Width (cm) *
              </label>
              <input
                type="number"
                name="width"
                value={dimensions.width}
                onChange={handleDimensionChange}
                placeholder="0.0"
                min="0"
                step="0.1"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", fontWeight: 500 }}>
                Length (cm) *
              </label>
              <input
                type="number"
                name="length"
                value={dimensions.length}
                onChange={handleDimensionChange}
                placeholder="0.0"
                min="0"
                step="0.1"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", fontWeight: 500 }}>
                Weight (kg) *
              </label>
              <input
                type="number"
                name="weight"
                value={dimensions.weight}
                onChange={handleDimensionChange}
                placeholder="0.0"
                min="0"
                step="0.1"
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Product Scanning */}
        <div className="scan-panel" style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Scan EAN/SKU or search by name (Enter to add exact match)"
            value={scanInput}
            onChange={handleScanInputChange}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
          />

          {/* Dropdown for product suggestions */}
          {showDropdown && productSuggestions.length > 0 && (
            <div className="product-suggestions" ref={dropdownRef}>
              {productSuggestions.map((product, index) => (
                <div
                  key={product.productId}
                  className={`product-suggestion-item ${index === highlightedIndex ? "highlighted" : ""}`}
                  onClick={() => handleSelectProduct(product)}
                >
                  <div className="product-suggestion-main">
                    <strong>{product.name || "Unknown"}</strong>
                    <span className="product-sku">
                      SKU: {product.sku || "N/A"}
                      {product.ean && ` | EAN: ${product.ean}`}
                    </span>
                  </div>
                  <span className="product-stock">Stock: {product.totalQuantity || product.quantity || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Product List */}
        <div className="collection-products-wrapper">
          {preparedProducts.length === 0 ? (
            <p style={{ textAlign: "center", color: "#666", fontStyle: "italic", padding: "2rem" }}>
              No products added yet. Scan or search for products above to begin preparation.
            </p>
          ) : (
            preparedProducts.map(product => {
              const totalPrepared = calculateTotalFromRows(product);

              return (
                <div key={product.productId} className="collection-product-section" style={{ backgroundColor: "#f8f9fa" }}>
                  <div className="product-header">
                    <div className="product-info">
                      <strong>{product.name}</strong>
                      <span className="product-sku-badge">
                        SKU: {product.sku}
                        {product.ean && ` | EAN: ${product.ean}`}
                      </span>
                    </div>
                    <div className="product-quantities">
                      {product.shipmentQuantity > 0 && (
                        <div className="quantity-badge shipment-qty">
                          <span className="qty-label">Shipment Qty</span>
                          <span className="qty-value">{product.shipmentQuantity}</span>
                        </div>
                      )}
                      <div className="quantity-badge in-store-qty">
                        <span className="qty-label">In Store</span>
                        <span className="qty-value">{product.inStore}</span>
                      </div>
                      <div className="quantity-badge collected-qty">
                        <span className="qty-label">To Pack</span>
                        <span className="qty-value">{totalPrepared}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(product.productId)}
                      className="btn-remove-location"
                      title="Remove product from preparation"
                      style={{ marginLeft: "8px" }}
                    >
                      ×
                    </button>
                  </div>

                  <div className="location-rows">
                    {/* Header labels shown once above all location rows */}
                    <div className="location-rows-header">
                      <div className="location-header-quantity">Quantity</div>
                      <div className="location-header-at"></div>
                      <div className="location-header-location">Location</div>
                      <div className="location-header-remove"></div>
                    </div>

                    {product.locationRows.map((row, rowIndex) => {
                      // Pass rowIndex to exclude this row from "already allocated" calculation
                      const available = row.locationId ? getAvailableAtLocation(product, row.locationId, rowIndex) : 0;

                      // Get already selected location IDs in other rows to filter them out
                      const selectedLocationIds = product.locationRows
                        .filter((_, idx) => idx !== rowIndex) // Exclude current row
                        .map(r => r.locationId)
                        .filter(Boolean); // Remove empty values

                      return (
                        <div key={rowIndex} className="location-row-compact">
                          <div className="location-row-content-compact">
                            <div className="quantity-input-wrapper-compact">
                              <input
                                type="number"
                                min="0"
                                value={row.quantity}
                                onChange={(e) => handleLocationRowChange(product.productId, rowIndex, "quantity", e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddLocationRow(product.productId);
                                  }
                                }}
                                className="location-quantity-input"
                                placeholder="0"
                              />
                            </div>
                            <span className="location-at">@</span>
                            <div className="location-select-wrapper-compact">
                              <select
                                value={row.locationId || ""}
                                onChange={(e) => {
                                  console.log("🏪 Location select changed:", e.target.value);
                                  console.log("🏪 Selected option:", e.target.options[e.target.selectedIndex]);
                                  handleLocationRowChange(product.productId, rowIndex, "locationId", e.target.value);
                                }}
                                className="location-select"
                              >
                                <option value="">Select location</option>
                                {product.warehouseLocations
                                  .filter(loc => !selectedLocationIds.includes(String(loc.locationId)))
                                  .map((loc, locIdx) => {
                                    if (locIdx === 0) {
                                      console.log("🏪 Sample location object:", loc);
                                      console.log("🏪 loc.locationId:", loc.locationId, "type:", typeof loc.locationId);
                                    }
                                    return (
                                      <option key={loc.locationId || locIdx} value={loc.locationId}>
                                        {loc.zone}-{loc.col}-{loc.shelf} - {loc.quantity} items
                                      </option>
                                    );
                                  })}
                              </select>
                            </div>
                            {product.locationRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLocationRow(product.productId, rowIndex)}
                                className="btn-remove-location"
                                title="Remove this location row"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddLocationRow(product.productId)}
                    className="btn-add-location"
                  >
                    Add Location
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Section 4: Action Buttons */}
        <div style={{ display: "flex", gap: "10px", paddingTop: "10px", borderTop: "1px solid #e2e8f0" }}>
          <button
            onClick={handleSave}
            className="btn-action"
            disabled={saving || preparedProducts.length === 0}
            style={{ flex: 1, background: "#6b7280", color: "white" }}
          >
            {saving ? "Saving..." : "Save Progress"}
          </button>
          <button
            onClick={handleFinishPreparation}
            className="btn-action btn-primary"
            disabled={saving || preparedProducts.length === 0}
            style={{ flex: 1 }}
          >
            {saving ? "Finishing..." : "Finish Preparation"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
