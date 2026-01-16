// === IMPORTS ===
import React, { useState, useRef } from "react";
import Modal from "../../../../components/Modal";
import { countries, getCountryName } from "../../../../data/countries";
import { api } from "../../../../api/apiClient";

// === COMPONENT ===
/**
 * AddModal - Register new incoming shipment
 *
 * Allows users to create new incoming shipment records with:
 * - Basic shipment information (status, dates, dimensions)
 * - Sender information (name, tax ID) with address autocomplete
 * - Receiver information (read-only store details)
 * - Product selection with searchable dropdown and quantities
 *
 * Features:
 * - Address autocomplete with search and create new functionality
 * - Searchable product dropdown with keyboard navigation
 * - Infinite scroll for product suggestions
 * - Current stock display for selected products
 * - Real-time quantity updates
 *
 * @param {object} props - Component props
 * @param {boolean} props.show - Whether to show the modal
 * @param {function} props.onClose - Callback to close the modal
 * @param {object} props.addForm - Form state object containing all shipment fields
 * @param {function} props.handleAddFormChange - Handler for form field changes
 * @param {function} props.handleSaveShipment - Handler for saving the shipment
 * @param {boolean} props.savingShipment - Whether shipment is currently being saved
 * @param {string} props.productSearch - Current product search query
 * @param {function} props.setProductSearch - Setter for product search query
 * @param {function} props.handleProductSearchKeyDown - Handler for product search keyboard events
 * @param {boolean} props.showProductDropdown - Whether to show product suggestions dropdown
 * @param {function} props.setShowProductDropdown - Setter for dropdown visibility
 * @param {array} props.productSuggestions - Array of product suggestions from search
 * @param {object} props.productDropdownRef - Ref for product dropdown element
 * @param {function} props.handleProductDropdownScroll - Handler for dropdown scroll (infinite scroll)
 * @param {number} props.highlightedIndex - Index of currently highlighted suggestion
 * @param {function} props.setHighlightedIndex - Setter for highlighted index
 * @param {function} props.handleAddProduct - Handler for adding product to shipment
 * @param {boolean} props.loadingProducts - Whether products are currently being loaded
 * @param {array} props.selectedProducts - Array of products added to shipment
 * @param {function} props.handleProductQuantityChange - Handler for product quantity changes
 * @param {function} props.handleRemoveProduct - Handler for removing product from shipment
 * @param {function} props.setAddForm - Setter for addForm state
 */
export default function AddModal({
  show,
  onClose,
  addForm,
  handleAddFormChange,
  handleSaveShipment,
  savingShipment,
  productSearch,
  setProductSearch,
  handleProductSearchKeyDown,
  showProductDropdown,
  setShowProductDropdown,
  productSuggestions,
  productDropdownRef,
  handleProductDropdownScroll,
  highlightedIndex,
  setHighlightedIndex,
  handleAddProduct,
  loadingProducts,
  selectedProducts,
  handleProductQuantityChange,
  handleRemoveProduct,
  setAddForm,
}) {
  // Address search state
  const [addressSearchInput, setAddressSearchInput] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [highlightedAddressIndex, setHighlightedAddressIndex] = useState(0);
  const addressDropdownRef = useRef(null);

  if (!show) return null;

  // Search addresses
  const searchAddresses = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      return;
    }

    try {
      const response = await api.get("/Addresses", {
        params: {
          pageNumber: 1,
          pageSize: 10,
          search: searchTerm,
        },
      });
      setAddressSuggestions(response.items || []);
      setShowAddressDropdown(true);
    } catch (err) {
      console.error("Failed to search addresses", err);
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
    }
  };

  // Handle address search input change
  const handleAddressSearchChange = async (e) => {
    const value = e.target.value;
    setAddressSearchInput(value);
    await searchAddresses(value);
    setHighlightedAddressIndex(0);
  };

  // Handle address selection from dropdown
  const handleSelectAddress = (address) => {
    setSelectedAddress(address);
    setAddForm(prev => ({
      ...prev,
      senderStreet: address.street,
      senderBuilding: address.building,
      senderPremises: address.premises || "",
      senderPostalCode: address.postalCode,
      senderCity: address.city,
      senderCountry: address.country,
    }));
    setShowAddressDropdown(false);
    setAddressSearchInput("");
    setAddressSuggestions([]);
  };

  // Handle "Create New Address" button click
  const handleCreateNewAddress = () => {
    setShowAddressForm(true);
    setShowAddressDropdown(false);
    setSelectedAddress(null);
    setAddressSearchInput("");
    setAddressSuggestions([]);
    // Reset address fields to allow user input
    setAddForm(prev => ({
      ...prev,
      senderStreet: "",
      senderBuilding: "",
      senderPremises: "",
      senderPostalCode: "",
      senderCity: "",
      senderCountry: 141,
    }));
  };

  // Handle "Change Address" button click (clears selection)
  const handleChangeAddress = () => {
    setSelectedAddress(null);
    setShowAddressForm(false);
    setAddressSearchInput("");
    setAddForm(prev => ({
      ...prev,
      senderStreet: "",
      senderBuilding: "",
      senderPremises: "",
      senderPostalCode: "",
      senderCity: "",
      senderCountry: 141,
    }));
  };

  // Handle keyboard navigation in address dropdown
  const handleAddressKeyDown = (e) => {
    if (!showAddressDropdown) {
      return;
    }

    const totalOptions = addressSuggestions.length + 1; // +1 for "Create New" option

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedAddressIndex(prev => Math.min(prev + 1, totalOptions - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedAddressIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedAddressIndex < addressSuggestions.length) {
          handleSelectAddress(addressSuggestions[highlightedAddressIndex]);
        } else {
          // "Create New" option selected
          handleCreateNewAddress();
        }
        break;
      case "Escape":
        setShowAddressDropdown(false);
        break;
      default:
        break;
    }
  };

  return (
    <Modal
      title="Register Incoming Shipment"
      onClose={onClose}
      wide
    >
      <div className="add-shipment-modal">
        <form onSubmit={(e) => { e.preventDefault(); handleSaveShipment(); }}>
          <div className="form-content">
            {/* Section A: Basic Information */}
            <div className="form-section">
              <h4 className="section-title">Basic Information</h4>
              <div className="form-grid-2col">
                <div className="form-field">
                  <label htmlFor="status">Status *</label>
                  <select
                    id="status"
                    name="status"
                    value={addForm.status}
                    onChange={handleAddFormChange}
                    required
                  >
                    <option value={0}>Unspecified</option>
                    <option value={1}>In Preparation</option>
                    <option value={2}>Ready to Collect</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="sendDate">Send Date</label>
                  <input
                    type="date"
                    id="sendDate"
                    name="sendDate"
                    value={addForm.sendDate}
                    onChange={handleAddFormChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="deliveryDate">Delivery Date</label>
                  <input
                    type="date"
                    id="deliveryDate"
                    name="deliveryDate"
                    value={addForm.deliveryDate}
                    onChange={handleAddFormChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="weight">Weight (kg)</label>
                  <input
                    type="number"
                    id="weight"
                    name="weight"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={addForm.weight}
                    onChange={handleAddFormChange}
                  />
                </div>
              </div>

              <div className="form-grid-3col">
                <div className="form-field">
                  <label htmlFor="length">Length (cm)</label>
                  <input
                    type="number"
                    id="length"
                    name="length"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={addForm.length}
                    onChange={handleAddFormChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="width">Width (cm)</label>
                  <input
                    type="number"
                    id="width"
                    name="width"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={addForm.width}
                    onChange={handleAddFormChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="height">Height (cm)</label>
                  <input
                    type="number"
                    id="height"
                    name="height"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={addForm.height}
                    onChange={handleAddFormChange}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  placeholder="Enter shipment description..."
                  value={addForm.description}
                  onChange={handleAddFormChange}
                />
              </div>
            </div>

            {/* Section B: Sender Details */}
            <div className="form-section">
              <h4 className="section-title">Sender Details</h4>
              <div className="form-grid-2col">
                <div className="form-field">
                  <label htmlFor="senderName">Name *</label>
                  <input
                    type="text"
                    id="senderName"
                    name="senderName"
                    placeholder="Company or person name"
                    value={addForm.senderName}
                    onChange={handleAddFormChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="senderTaxId">Tax ID *</label>
                  <input
                    type="text"
                    id="senderTaxId"
                    name="senderTaxId"
                    placeholder="Tax identification number"
                    value={addForm.senderTaxId}
                    onChange={handleAddFormChange}
                    required
                  />
                </div>

                <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="senderDetails">Sender Details</label>
                  <textarea
                    id="senderDetails"
                    name="senderDetails"
                    rows="2"
                    placeholder="Additional notes about sender (optional)"
                    value={addForm.senderDetails}
                    onChange={handleAddFormChange}
                  />
                </div>
              </div>
            </div>

            {/* Section C: Sender Address */}
            <div className="form-section">
              <h4 className="section-title">Sender Address</h4>

              {!selectedAddress && !showAddressForm && (
                <div className="address-search-container">
                  <label>Search Address *</label>
                  <input
                    type="text"
                    placeholder="Search existing address or create new..."
                    value={addressSearchInput}
                    onChange={handleAddressSearchChange}
                    onKeyDown={handleAddressKeyDown}
                    className="product-search-input"
                    autoComplete="off"
                  />

                  {/* Address Suggestions Dropdown */}
                  {showAddressDropdown && (
                    <div className="address-suggestions" ref={addressDropdownRef}>
                      {addressSuggestions.map((addr, index) => (
                        <div
                          key={addr.id}
                          className={`address-suggestion-item ${index === highlightedAddressIndex ? "highlighted" : ""}`}
                          onClick={() => handleSelectAddress(addr)}
                          onMouseEnter={() => setHighlightedAddressIndex(index)}
                        >
                          <div className="address-suggestion-main">
                            <strong>{addr.street} {addr.building}</strong>
                            {addr.premises && <span>, {addr.premises}</span>}
                          </div>
                          <span className="address-suggestion-details">
                            {addr.city}, {addr.postalCode} • {getCountryName(addr.country) || countries[addr.country] || addr.country}
                          </span>
                        </div>
                      ))}

                      {/* "Create New" option */}
                      <div
                        className={`address-suggestion-item create-new ${highlightedAddressIndex === addressSuggestions.length ? "highlighted" : ""}`}
                        onClick={handleCreateNewAddress}
                        onMouseEnter={() => setHighlightedAddressIndex(addressSuggestions.length)}
                      >
                        + Create New Address
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Address Display (Read-Only) */}
              {selectedAddress && !showAddressForm && (
                <div className="selected-address-display">
                  <label>Selected Address</label>
                  <div className="address-display-box">
                    <strong>{selectedAddress.street} {selectedAddress.building}</strong>
                    {selectedAddress.premises && <span>, {selectedAddress.premises}</span>}
                    <br />
                    {selectedAddress.postalCode} {selectedAddress.city}
                    <br />
                    {getCountryName(selectedAddress.country) || countries[selectedAddress.country] || selectedAddress.country}
                  </div>
                  <button type="button" onClick={handleChangeAddress} className="btn-change-address">
                    Change Address
                  </button>
                </div>
              )}

              {/* Address Input Form (Only for "Create New") */}
              {showAddressForm && (
                <div className="address-form-fields">
                  <div className="form-grid-2col">
                    <div className="form-field">
                      <label htmlFor="senderCountry">Country *</label>
                      <select
                        id="senderCountry"
                        name="senderCountry"
                        value={addForm.senderCountry}
                        onChange={handleAddFormChange}
                        required
                      >
                        {Object.entries(countries).map(([id, name]) => (
                          <option key={id} value={id}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="senderCity">City *</label>
                      <input
                        type="text"
                        id="senderCity"
                        name="senderCity"
                        placeholder="City name"
                        value={addForm.senderCity}
                        onChange={handleAddFormChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="senderPostalCode">Postal Code *</label>
                      <input
                        type="text"
                        id="senderPostalCode"
                        name="senderPostalCode"
                        placeholder="12-345"
                        value={addForm.senderPostalCode}
                        onChange={handleAddFormChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="senderStreet">Street *</label>
                      <input
                        type="text"
                        id="senderStreet"
                        name="senderStreet"
                        placeholder="Street name"
                        value={addForm.senderStreet}
                        onChange={handleAddFormChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="senderBuilding">Building *</label>
                      <input
                        type="text"
                        id="senderBuilding"
                        name="senderBuilding"
                        placeholder="Building number"
                        value={addForm.senderBuilding}
                        onChange={handleAddFormChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="senderPremises">Premises</label>
                      <input
                        type="text"
                        id="senderPremises"
                        name="senderPremises"
                        placeholder="Apartment/Suite (optional)"
                        value={addForm.senderPremises}
                        onChange={handleAddFormChange}
                      />
                    </div>
                  </div>

                  <button type="button" onClick={handleChangeAddress} className="btn-cancel-address-form">
                    Cancel & Search Again
                  </button>
                </div>
              )}
            </div>

            {/* Section D: Receiver Information (Display Only) */}
            <div className="form-section">
              <h4 className="section-title">Receiver Information (Store)</h4>
              <div className="receiver-info-display">
                <div className="info-row">
                  <span className="info-label">Name:</span>
                  <span className="info-value">Main Store</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tax ID:</span>
                  <span className="info-value">1234567890</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Address:</span>
                  <span className="info-value">Main Street 123, 00-950 Warszawa, Poland</span>
                </div>
              </div>
              <div className="form-field" style={{ marginTop: "15px" }}>
                <label htmlFor="receiverDetails">Receiver Details</label>
                <textarea
                  id="receiverDetails"
                  name="receiverDetails"
                  rows="2"
                  placeholder="Additional notes about receiver (optional)"
                  value={addForm.receiverDetails}
                  onChange={handleAddFormChange}
                />
              </div>
            </div>

            {/* Section E: Product Selection */}
            <div className="form-section">
              <h4 className="section-title">Products *</h4>
              <div className="product-search-panel">
                <input
                  type="text"
                  placeholder="Search products by name or SKU... (Type full SKU and press Enter for exact match)"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onKeyDown={handleProductSearchKeyDown}
                  onFocus={() => productSuggestions.length > 0 && setShowProductDropdown(true)}
                  className="product-search-input"
                  autoComplete="off"
                />
                {showProductDropdown && productSuggestions.length > 0 && (
                  <div
                    className="product-suggestions"
                    ref={productDropdownRef}
                    onScroll={handleProductDropdownScroll}
                  >
                    {productSuggestions.map((product, index) => (
                      <div
                        key={product.productId || product.id}
                        className={`product-suggestion-item ${index === highlightedIndex ? "highlighted" : ""}`}
                        onClick={() => handleAddProduct(product)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        <div className="product-suggestion-main">
                          <strong>{product.name}</strong>
                          <span className="product-sku">
                            SKU: {product.sku}
                            {product.ean && ` | EAN: ${product.ean}`}
                          </span>
                        </div>
                        <span className="product-stock">Stock: {product.totalQuantity || 0}</span>
                      </div>
                    ))}
                    {loadingProducts && (
                      <div className="product-suggestion-item loading-item">
                        Loading more products...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedProducts.length > 0 ? (
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>EAN</th>
                      <th>Amount in Shipment</th>
                      <th>Amount in Store</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map(product => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{product.ean || "—"}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => handleProductQuantityChange(product.id, e.target.value)}
                            className="quantity-input"
                          />
                        </td>
                        <td>{product.currentStock}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(product.id)}
                            className="btn-remove-product"
                            title="Remove product"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-products-message">No products added. Search and select products above.</p>
              )}
            </div>
          </div>

          {/* Section F: Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
              disabled={savingShipment}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-confirm"
              disabled={savingShipment}
            >
              {savingShipment ? "Saving..." : "Save Shipment"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
