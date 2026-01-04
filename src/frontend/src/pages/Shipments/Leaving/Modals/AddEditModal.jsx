import React, { useState, useEffect, useRef } from "react";
import Modal from "../../../../components/Modal";
import { api } from "../../../../api/apiClient";
import { countries, getCountryValue, getCountryName } from "../../../../data/countries";

export default function AddEditModal({
  onClose,
  onSave,
  setToast,
  mode, // "add" or "edit"
  shipmentDetails = null,
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: "",
    // Receiver info (user enters)
    receiverName: "",
    receiverTaxId: "",
    receiverDetails: "",
    receiverStreet: "",
    receiverBuilding: "",
    receiverPremises: "",
    receiverPostalCode: "",
    receiverCity: "",
    receiverCountry: 141, // Default Poland
    receiverAddressId: null,
    // Sender info (auto-filled with store info)
    senderName: "Main Store",
    senderTaxId: "1234567890",
    senderDetails: "Main Street 123, 00-950 Warszawa, Poland",
  });

  // Address search state (for Add mode)
  const [addressSearchInput, setAddressSearchInput] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [highlightedAddressIndex, setHighlightedAddressIndex] = useState(0);
  const addressDropdownRef = useRef(null);

  // Initialize form for edit mode
  useEffect(() => {
    if (mode === "edit" && shipmentDetails) {
      const receiverAddress = shipmentDetails.receiverAddress || shipmentDetails.ReceiverAddress || {};
      const countryName = receiverAddress.country || receiverAddress.Country;
      const countryId = getCountryValue(countryName);

      setForm({
        description: shipmentDetails.description || "",
        receiverName: shipmentDetails.receiverName || "",
        receiverTaxId: shipmentDetails.receiverTaxId || "",
        receiverDetails: shipmentDetails.receiverDetails || "",
        receiverStreet: receiverAddress.street || receiverAddress.Street || "",
        receiverBuilding: receiverAddress.building || receiverAddress.Building || "",
        receiverPremises: receiverAddress.premises || receiverAddress.Premises || "",
        receiverPostalCode: receiverAddress.postalCode || receiverAddress.PostalCode || "",
        receiverCity: receiverAddress.city || receiverAddress.City || "",
        receiverCountry: countryId !== null ? countryId : 141,
        receiverAddressId: shipmentDetails.receiverAddressId,
        senderName: shipmentDetails.senderName || "Main Store",
        senderTaxId: shipmentDetails.senderTaxId || "1234567890",
        senderDetails: shipmentDetails.senderDetails || "Main Street 123, 00-950 Warszawa, Poland",
      });
    }
  }, [mode, shipmentDetails]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Search addresses (for Add mode autocomplete)
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
          search: searchTerm, // Search by any field
        },
      });
      setAddressSuggestions(response.data || []);
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
    setForm(prev => ({
      ...prev,
      receiverAddressId: address.id,
      receiverStreet: address.street,
      receiverBuilding: address.building,
      receiverPremises: address.premises || "",
      receiverPostalCode: address.postalCode,
      receiverCity: address.city,
      receiverCountry: getCountryValue(address.country) || 141,
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
    setForm(prev => ({
      ...prev,
      receiverStreet: "",
      receiverBuilding: "",
      receiverPremises: "",
      receiverPostalCode: "",
      receiverCity: "",
      receiverCountry: 141,
      receiverAddressId: null,
    }));
  };

  // Handle "Change Address" button click (clears selection)
  const handleChangeAddress = () => {
    setSelectedAddress(null);
    setShowAddressForm(false);
    setAddressSearchInput("");
    setForm(prev => ({
      ...prev,
      receiverAddressId: null,
      receiverStreet: "",
      receiverBuilding: "",
      receiverPremises: "",
      receiverPostalCode: "",
      receiverCity: "",
      receiverCountry: 141,
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

  // Validate form
  const validateForm = () => {
    if (!form.receiverName || !form.receiverTaxId) {
      setToast({ type: "error", message: "Receiver name and Tax ID are required" });
      return false;
    }

    if (!form.receiverStreet || !form.receiverBuilding || !form.receiverPostalCode || !form.receiverCity || !form.receiverCountry) {
      setToast({ type: "error", message: "Complete receiver address is required" });
      return false;
    }

    return true;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      if (mode === "add") {
        // Create new shipment
        await createShipment();
      } else {
        // Update existing shipment
        await updateShipment();
      }

      setToast({ type: "success", message: `Shipment ${mode === "add" ? "created" : "updated"} successfully` });
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      setToast({
        type: "error",
        message: err.response?.data?.message || `Failed to ${mode === "add" ? "create" : "update"} shipment`,
      });
    } finally {
      setSaving(false);
    }
  };

  // Create shipment
  const createShipment = async () => {
    // Step 1: Get or create receiver address
    const receiverAddressPayload = {
      country: parseInt(form.receiverCountry),
      city: form.receiverCity,
      street: form.receiverStreet,
      building: form.receiverBuilding,
      premises: form.receiverPremises || null,
      postalCode: form.receiverPostalCode,
    };

    // Check if address already exists
    const receiverAddressExistsResponse = await api.get("/Addresses/exists", {
      params: receiverAddressPayload,
    });

    let receiverAddressId;
    if (receiverAddressExistsResponse.exists && receiverAddressExistsResponse.id) {
      receiverAddressId = receiverAddressExistsResponse.id;
    } else {
      const receiverAddressResponse = await api.post("/Addresses", receiverAddressPayload);
      receiverAddressId = receiverAddressResponse.id;
    }

    // Step 2: Get or create sender (store) address
    let senderAddressId = null;
    const mainStoreAddress = {
      street: "Main Street",
      building: "123",
      postalCode: "00-950",
      city: "Warszawa",
      country: 141, // Poland
      premises: null,
    };

    try {
      const addressExistsResponse = await api.get("/Addresses/exists", {
        params: mainStoreAddress,
      });

      if (addressExistsResponse.exists && addressExistsResponse.id) {
        senderAddressId = addressExistsResponse.id;
      } else {
        const senderAddressResponse = await api.post("/Addresses", mainStoreAddress);
        senderAddressId = senderAddressResponse.id;
      }

      if (!senderAddressId) {
        throw new Error("Sender address ID is null after creation/retrieval");
      }
    } catch (err) {
      console.error("Failed to get/create sender address:", err);
      throw new Error(`Failed to set sender address: ${err.message}`);
    }

    // Step 3: Create shipment
    const shipmentPayload = {
      type: 2, // Outgoing/Leaving
      status: 1, // Always InPreparation
      sendDate: null,
      deliveryDate: null,
      description: form.description || null,
      weight: null, // Set during preparation
      length: null, // Set during preparation
      width: null, // Set during preparation
      height: null, // Set during preparation
      receiverName: form.receiverName,
      receiverTaxId: form.receiverTaxId,
      receiverDetails: form.receiverDetails || null,
      receiverAddressId: receiverAddressId,
      senderName: form.senderName,
      senderTaxId: form.senderTaxId,
      senderDetails: form.senderDetails,
      senderAddressId: senderAddressId,
    };

    await api.post("/Shipments", shipmentPayload);
  };

  // Update shipment
  const updateShipment = async () => {
    // Check if address changed
    let receiverAddressId = form.receiverAddressId;

    if (shipmentDetails) {
      const currentAddress = shipmentDetails.receiverAddress || shipmentDetails.ReceiverAddress || {};
      const addressChanged =
        form.receiverStreet !== (currentAddress.street || currentAddress.Street) ||
        form.receiverBuilding !== (currentAddress.building || currentAddress.Building) ||
        form.receiverPremises !== (currentAddress.premises || currentAddress.Premises || "") ||
        form.receiverPostalCode !== (currentAddress.postalCode || currentAddress.PostalCode) ||
        form.receiverCity !== (currentAddress.city || currentAddress.City) ||
        parseInt(form.receiverCountry) !== getCountryValue(currentAddress.country || currentAddress.Country);

      if (addressChanged) {
        // Get or create new address
        const receiverAddressPayload = {
          country: parseInt(form.receiverCountry),
          city: form.receiverCity,
          street: form.receiverStreet,
          building: form.receiverBuilding,
          premises: form.receiverPremises || null,
          postalCode: form.receiverPostalCode,
        };

        // Check if address already exists
        const receiverAddressExistsResponse = await api.get("/Addresses/exists", {
          params: receiverAddressPayload,
        });

        if (receiverAddressExistsResponse.exists && receiverAddressExistsResponse.id) {
          receiverAddressId = receiverAddressExistsResponse.id;
        } else {
          const receiverAddressResponse = await api.post("/Addresses", receiverAddressPayload);
          receiverAddressId = receiverAddressResponse.id;
        }
      }
    }

    // Get sender address ID (should already exist from creation)
    let senderAddressId = shipmentDetails?.senderAddressId;

    if (!senderAddressId) {
      // Fallback: try to get/create sender address
      const mainStoreAddress = {
        street: "Main Street",
        building: "123",
        postalCode: "00-950",
        city: "Warszawa",
        country: 141, // Poland
        premises: null,
      };

      try {
        const addressExistsResponse = await api.get("/Addresses/exists", {
          params: mainStoreAddress,
        });

        if (addressExistsResponse.exists && addressExistsResponse.id) {
          senderAddressId = addressExistsResponse.id;
        } else {
          const senderAddressResponse = await api.post("/Addresses", mainStoreAddress);
          senderAddressId = senderAddressResponse.id;
        }
      } catch (err) {
        console.error("Failed to get/create sender address:", err);
        throw new Error(`Failed to set sender address: ${err.message}`);
      }
    }

    // Update shipment (requires type field per UpdateShipmentDto)
    const shipmentPayload = {
      type: 2, // Outgoing/Leaving
      status: 1, // Always InPreparation for editable shipments
      sendDate: null,
      deliveryDate: null,
      description: form.description || null,
      weight: null, // Keep null for leaving shipments (set during preparation)
      length: null,
      width: null,
      height: null,
      receiverName: form.receiverName,
      receiverTaxId: form.receiverTaxId,
      receiverDetails: form.receiverDetails || null,
      receiverAddressId: receiverAddressId,
      // Sender info (store info)
      senderName: form.senderName,
      senderTaxId: form.senderTaxId,
      senderDetails: form.senderDetails,
      senderAddressId: senderAddressId,
    };

    await api.put(`/Shipments/${shipmentDetails.id}`, shipmentPayload);
  };

  return (
    <Modal
      title={mode === "add" ? "Register Leaving Shipment" : "Edit Leaving Shipment"}
      onClose={onClose}
      wide
    >
      <div className={mode === "add" ? "add-shipment-modal" : "edit-shipment-modal"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="form-content">
            {/* Section A: Basic Information */}
            <div className="form-section">
              <h4 className="section-title">Basic Information</h4>
              <div className="form-field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  placeholder="Enter shipment description..."
                  value={form.description}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Section B: Receiver Information */}
            <div className="form-section">
              <h4 className="section-title">Receiver Information</h4>

              {mode === "add" ? (
                // ADD MODE: Editable fields
                <div className="form-grid-2col">
                  <div className="form-field">
                    <label htmlFor="receiverName">Name *</label>
                    <input
                      type="text"
                      id="receiverName"
                      name="receiverName"
                      placeholder="Company or person name"
                      value={form.receiverName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="receiverTaxId">Tax ID *</label>
                    <input
                      type="text"
                      id="receiverTaxId"
                      name="receiverTaxId"
                      placeholder="Tax identification number"
                      value={form.receiverTaxId}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="receiverDetails">Receiver Details</label>
                    <textarea
                      id="receiverDetails"
                      name="receiverDetails"
                      rows="2"
                      placeholder="Additional notes about receiver (optional)"
                      value={form.receiverDetails}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              ) : (
                // EDIT MODE: Plain text Address FIRST, then Editable Name/TaxId, Editable Details
                <div className="form-grid-2col">
                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Address</label>
                    <p style={{ margin: "0.5rem 0", color: "#374151" }}>
                      {form.receiverStreet} {form.receiverBuilding}
                      {form.receiverPremises ? `, ${form.receiverPremises}` : ""}, {form.receiverPostalCode} {form.receiverCity}, {getCountryName(form.receiverCountry) || countries[form.receiverCountry] || "N/A"}
                    </p>
                  </div>

                  <div className="form-field">
                    <label htmlFor="receiverName">Receiver Name *</label>
                    <input
                      type="text"
                      id="receiverName"
                      name="receiverName"
                      placeholder="Company or person name"
                      value={form.receiverName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="receiverTaxId">Receiver Tax ID *</label>
                    <input
                      type="text"
                      id="receiverTaxId"
                      name="receiverTaxId"
                      placeholder="Tax identification number"
                      value={form.receiverTaxId}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="receiverDetails">Receiver Details</label>
                    <textarea
                      id="receiverDetails"
                      name="receiverDetails"
                      rows="2"
                      placeholder="Additional notes about receiver (optional)"
                      value={form.receiverDetails}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section C: Receiver Address */}
            {mode === "add" && (
            <div className="form-section">
              <h4 className="section-title">Receiver Address</h4>

              {/* ADD MODE: Address autocomplete search */}
              <>
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
                    />

                    {/* Address Suggestions Dropdown */}
                    {showAddressDropdown && (
                      <div className="address-suggestions" ref={addressDropdownRef}>
                        {addressSuggestions.map((addr, index) => (
                          <div
                            key={addr.id}
                            className={`address-suggestion-item ${index === highlightedAddressIndex ? "highlighted" : ""}`}
                            onClick={() => handleSelectAddress(addr)}
                          >
                            <div className="address-suggestion-main">
                              <strong>{addr.street} {addr.building}</strong>
                              {addr.premises && <span>, {addr.premises}</span>}
                            </div>
                            <span className="address-suggestion-details">
                              {addr.city}, {addr.postalCode} • {addr.country}
                            </span>
                          </div>
                        ))}

                        {/* "Create New" option */}
                        <div
                          className={`address-suggestion-item create-new ${highlightedAddressIndex === addressSuggestions.length ? "highlighted" : ""}`}
                          onClick={handleCreateNewAddress}
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
                      {selectedAddress.country}
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
                        <label htmlFor="receiverCountry">Country *</label>
                        <select
                          id="receiverCountry"
                          name="receiverCountry"
                          value={form.receiverCountry}
                          onChange={handleInputChange}
                          required
                        >
                          {Object.entries(countries).map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field">
                        <label htmlFor="receiverCity">City *</label>
                        <input
                          type="text"
                          id="receiverCity"
                          name="receiverCity"
                          placeholder="City name"
                          value={form.receiverCity}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="receiverPostalCode">Postal Code *</label>
                        <input
                          type="text"
                          id="receiverPostalCode"
                          name="receiverPostalCode"
                          placeholder="12-345"
                          value={form.receiverPostalCode}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="receiverStreet">Street *</label>
                        <input
                          type="text"
                          id="receiverStreet"
                          name="receiverStreet"
                          placeholder="Street name"
                          value={form.receiverStreet}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="receiverBuilding">Building *</label>
                        <input
                          type="text"
                          id="receiverBuilding"
                          name="receiverBuilding"
                          placeholder="Building number"
                          value={form.receiverBuilding}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="receiverPremises">Premises</label>
                        <input
                          type="text"
                          id="receiverPremises"
                          name="receiverPremises"
                          placeholder="Apartment/Suite (optional)"
                          value={form.receiverPremises}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <button type="button" onClick={handleChangeAddress} className="btn-cancel-address-form">
                      Cancel & Search Again
                    </button>
                  </div>
                )}
              </>
            </div>
            )}

            {/* Section D: Sender Information (Display Only) */}
            <div className="form-section">
              <h4 className="section-title">Sender Information (Store)</h4>
              <div className="receiver-info-display">
                <div className="info-row">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{form.senderName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tax ID:</span>
                  <span className="info-value">{form.senderTaxId}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Address:</span>
                  <span className="info-value">{form.senderDetails}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section D: Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-confirm"
              disabled={saving}
            >
              {saving ? "Saving..." : mode === "add" ? "Save Shipment" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
