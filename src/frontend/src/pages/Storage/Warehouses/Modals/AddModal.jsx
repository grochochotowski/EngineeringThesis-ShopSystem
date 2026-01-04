// === IMPORTS ===
import React from "react";
import Modal from "../../../../components/Modal";

// === COMPONENT ===
/**
 * AddModal - Add product to warehouse location
 * Allows selecting a product via searchable dropdown and choosing a location
 * Shows existing quantities at each location for selected product
 * Supports quick location creation via separate modal
 * Pre-fills product if one is selected in the main list
 *
 * @param {object} props
 * @param {boolean} props.show - Controls modal visibility
 * @param {object} props.formData - Form state (productId, locationId, quantity)
 * @param {string} props.productSearchTerm - Current search term for product dropdown
 * @param {array} props.filteredProducts - Filtered list of products based on search
 * @param {boolean} props.showProductDropdown - Controls product dropdown visibility
 * @param {array} props.allLocations - List of all available warehouse locations
 * @param {array} props.selectedProductLocations - Locations where selected product exists (with quantities)
 * @param {function} props.onClose - Callback to close the modal
 * @param {function} props.onFormChange - Callback when form fields change
 * @param {function} props.onProductSearchChange - Callback when product search input changes
 * @param {function} props.onProductSelect - Callback when product is selected from dropdown
 * @param {function} props.onProductInputFocus - Callback when product input is focused
 * @param {function} props.onProductInputBlur - Callback when product input loses focus
 * @param {function} props.onProductDropdownKeyDown - Callback for keyboard events on dropdown
 * @param {function} props.onSubmit - Callback to submit the form
 * @param {function} props.onKeyPress - Callback for Enter key press to submit
 * @param {function} props.onOpenQuickLocation - Callback to open quick location creation modal
 */
export default function AddModal({
  show,
  formData,
  productSearchTerm,
  filteredProducts,
  showProductDropdown,
  allLocations,
  selectedProductLocations,
  onClose,
  onFormChange,
  onProductSearchChange,
  onProductSelect,
  onProductInputFocus,
  onProductInputBlur,
  onProductDropdownKeyDown,
  onSubmit,
  onKeyPress,
  onOpenQuickLocation,
}) {
  // Don't render if modal is not shown
  if (!show) return null;

  return (
    <Modal title="Add Product to Warehouse" onClose={onClose}>
      <form onSubmit={onSubmit} onKeyPress={onKeyPress}>
        <div className="form-grid">
          {/* === PRODUCT SELECTION === */}
          <label>
            Product
            <div className="product-dropdown-wrapper">
              {/* Searchable product input */}
              <input
                type="text"
                placeholder="Search by SKU or name..."
                value={productSearchTerm}
                onChange={(e) => onProductSearchChange(e.target.value)}
                onFocus={onProductInputFocus}
                onBlur={onProductInputBlur}
                onKeyDown={onProductDropdownKeyDown}
                required={!formData.productId}
                autoComplete="off"
              />
              {/* Dropdown arrow indicator */}
              <span className={`dropdown-arrow ${showProductDropdown ? "open" : ""}`}>▼</span>

              {/* Product dropdown list */}
              {showProductDropdown && filteredProducts.length > 0 && (
                <div className="product-dropdown">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.productId}
                      className="product-dropdown-item"
                      onClick={() => onProductSelect(p.productId)}
                    >
                      <div>
                        <strong>{p.name}</strong>
                        <div style={{ fontSize: "0.85em", color: "#666" }}>
                          SKU: {p.sku}{p.ean ? ` | EAN: ${p.ean}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </label>

          {/* === LOCATION SELECTION === */}
          <label>
            Location
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {/* Location dropdown */}
              <select
                name="locationId"
                value={formData.locationId}
                onChange={onFormChange}
                required
                style={{ flex: 1 }}
                className="location-select"
              >
                <option value="">Select a location</option>
                {allLocations
                  .filter((l) => l.isActive)
                  .map((l) => {
                    // Show existing quantity if product is already at this location
                    const existingLocation = selectedProductLocations.find(pl => pl.locationId === l.id);
                    return (
                      <option key={l.id} value={l.id}>
                        {l.locationCode}{existingLocation ? ` (Qty: ${existingLocation.quantity})` : ""}
                      </option>
                    );
                  })}
              </select>

              {/* Quick create location button */}
              <button
                type="button"
                onClick={onOpenQuickLocation}
                className="btn-action"
                style={{ padding: "0.5rem", minWidth: "40px" }}
              >
                +
              </button>
            </div>
          </label>

          {/* === QUANTITY INPUT === */}
          <label>
            Quantity
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={onFormChange}
              min="1"
              required
            />
          </label>
        </div>

        {/* === MODAL ACTIONS === */}
        <div className="modal-actions">
          <button type="button" className="btn-action" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-action btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
