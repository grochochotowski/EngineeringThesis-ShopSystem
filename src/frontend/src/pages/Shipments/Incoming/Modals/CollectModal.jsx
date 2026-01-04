// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * CollectModal - Collection workflow for incoming shipments
 *
 * Manages the physical collection process of incoming shipments with:
 * - Barcode scanning for product identification
 * - Multi-location assignment per product
 * - Real-time quantity validation against shipment quantities
 * - Color-coded status indicators (red/yellow/green)
 *
 * Validation Logic:
 * - Red (Error): No quantity collected OR missing location assignment OR collected < shipment qty
 * - Yellow (Warning): Collected > shipment qty (acceptable overage)
 * - Green (Success): All locations set AND collected = shipment qty
 *
 * Extra Product Handling:
 * - Products not in original shipment can be collected
 * - Yellow badge for first location assigned
 * - Red badge for second+ locations (unusual but allowed)
 *
 * Features:
 * - Enter key to scan/add products quickly
 * - Dynamic location row addition
 * - Shipment vs warehouse quantity comparison
 * - Prevent completion until all products have locations assigned
 *
 * @param {object} props - Component props
 * @param {boolean} props.show - Whether to show the modal
 * @param {function} props.onClose - Callback to close the modal
 * @param {object} props.selectedShipmentDetails - Details of shipment being collected
 * @param {string} props.scanInput - Current barcode scan input value
 * @param {function} props.setScanInput - Setter for scan input
 * @param {function} props.handleScanApply - Handler for applying scanned product (+1 quantity)
 * @param {array} props.collectedProducts - Array of products in collection process
 * @param {object} props.collectedQuantities - Object mapping productId to location rows [{quantity, locationId}]
 * @param {function} props.handleLocationQuantityChange - Handler for location quantity changes
 * @param {function} props.handleAddLocationRow - Handler for adding new location row
 * @param {function} props.handleLocationChange - Handler for location selection changes
 * @param {array} props.locations - Array of available warehouse locations
 * @param {function} props.handleRemoveLocationRow - Handler for removing location row
 * @param {function} props.handleFinishCollection - Handler for finishing collection (triggers validation)
 * @param {boolean} props.isCollectionValid - Whether collection is valid (all products have locations)
 */
export default function CollectModal({
  show,
  onClose,
  selectedShipmentDetails,
  scanInput,
  setScanInput,
  handleScanApply,
  collectedProducts,
  collectedQuantities,
  handleLocationQuantityChange,
  handleAddLocationRow,
  handleLocationChange,
  locations,
  handleRemoveLocationRow,
  handleFinishCollection,
  isCollectionValid,
}) {
  if (!show) return null;

  return (
    <Modal
      key={`collect-modal-${selectedShipmentDetails?.id || 'new'}`}
      title="Collect Shipment Products"
      onClose={onClose}
      wide
    >
      <div className="collection-modal">
        <div className="scan-panel">
          <input
            type="text"
            placeholder="Scan or enter product SKU/name"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleScanApply()}
          />
          <button onClick={handleScanApply} className="btn-action btn-primary">
            Add +1
          </button>
        </div>

        <div className="collection-products-wrapper">
          {collectedProducts.map(product => {
            const rows = collectedQuantities[product.productId] || [];
            const totalCollected = rows.reduce((sum, row) => sum + (parseInt(row.quantity) || 0), 0);
            const shipmentQty = parseInt(product.shipmentQuantity) || 0;
            const isComplete = totalCollected === shipmentQty;
            const isExtraProduct = product.isExtraProduct === true;

            // Determine section class based on priority order
            let productSectionClass = 'section-error';

            if (isExtraProduct) {
              // Extra products (not in shipment) - auto assign colors based on location count
              if (rows.length === 0 || totalCollected === 0) {
                productSectionClass = 'section-error';
              } else if (rows.some(row => (parseInt(row.quantity) || 0) > 0 && !row.locationId)) {
                productSectionClass = 'section-error';
              } else if (rows.length === 1) {
                productSectionClass = 'section-warning'; // Yellow for first location
              } else if (rows.length >= 2) {
                productSectionClass = 'section-error'; // Red for second location
              }
            } else {
              // Original shipment products - normal logic
              if (totalCollected === 0) {
                productSectionClass = 'section-error';
              }
              // Priority 2: Any locations not set (has quantity > 0 but no location)
              else if (rows.some(row => (parseInt(row.quantity) || 0) > 0 && !row.locationId)) {
                productSectionClass = 'section-error';
              }
              // Priority 3: Collected < Shipment Qty
              else if (totalCollected < shipmentQty) {
                productSectionClass = 'section-error';
              }
              // Priority 4: All locations set AND Collected = Shipment Qty
              else if (totalCollected === shipmentQty && shipmentQty > 0) {
                productSectionClass = 'section-success';
              }
              // Priority 5: All locations set AND Collected > Shipment Qty
              else if (totalCollected > shipmentQty) {
                productSectionClass = 'section-warning';
              }
            }

            return (
              <div key={product.productId} className={`collection-product-section ${productSectionClass}`}>
                <div className="product-header">
                  <div className="product-info">
                    <strong>{product.productName}</strong>
                    <span className="product-sku-badge">{product.productSKU}</span>
                    {isExtraProduct && <span className="extra-product-badge">Not in Shipment</span>}
                  </div>
                  <div className="product-quantities">
                    <div className="quantity-badge shipment-qty">
                      <span className="qty-label">Shipment Qty</span>
                      <span className="qty-value">{product.shipmentQuantity}</span>
                    </div>
                    <div className="quantity-badge in-store-qty">
                      <span className="qty-label">In Store</span>
                      <span className="qty-value">{product.warehouseQuantity}</span>
                    </div>
                    <div className={`quantity-badge collected-qty ${isComplete ? "complete" : ""}`}>
                      <span className="qty-label">Collected</span>
                      <span className="qty-value">{totalCollected}{!isExtraProduct ? ` / ${product.shipmentQuantity}` : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="location-rows">
                  {rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="location-row">
                      <div className="location-row-content">
                        <div className="quantity-input-wrapper">
                          <label>Quantity</label>
                          <input
                            type="number"
                            min="0"
                            value={row.quantity || 0}
                            onChange={(e) => handleLocationQuantityChange(product.productId, rowIndex, e.target.value)}
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
                        <div className="location-select-wrapper">
                          <label>Location</label>
                          <select
                            value={row.locationId || ""}
                            onChange={(e) => handleLocationChange(product.productId, rowIndex, e.target.value)}
                            className="location-select"
                          >
                            <option value="">Select location</option>
                            {locations.map(loc => (
                              <option key={loc.id} value={loc.id}>
                                {loc.zone}-{loc.col}-{loc.shelf}
                              </option>
                            ))}
                          </select>
                        </div>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLocationRow(product.productId, rowIndex)}
                            className="btn-remove-location"
                            title="Remove this location"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleAddLocationRow(product.productId)}
                  className="btn-add-location"
                >
                  Add
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleFinishCollection}
          className="btn-action btn-primary"
          disabled={!isCollectionValid}
        >
          Finish Collection
        </button>
      </div>
    </Modal>
  );
}
