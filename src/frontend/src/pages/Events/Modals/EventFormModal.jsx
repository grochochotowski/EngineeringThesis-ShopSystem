// === IMPORTS ===
import React, { useState, useEffect, useRef } from "react";
import Modal from "../../../components/Modal";
import MessageBox from "../../../components/MessageBox";
import { api } from "../../../api/apiClient";
import { countries } from "../../../data/countries";

// === COMPONENT ===
export default function EventFormModal({ isOpen, onClose, mode, event, onEventSaved }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateOfEvent, setDateOfEvent] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Address search state
  const [addressSearchInput, setAddressSearchInput] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [highlightedAddressIndex, setHighlightedAddressIndex] = useState(0);
  const addressDropdownRef = useRef(null);

  // New address form state
  const [newAddress, setNewAddress] = useState({
    country: 141, // Poland default
    city: "",
    street: "",
    building: "",
    premises: "",
    postalCode: "",
  });

  // Address form validation errors
  const [addressFormErrors, setAddressFormErrors] = useState({
    city: "",
    street: "",
    building: "",
    postalCode: "",
  });

  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && event) {
        setTitle(event.title);
        setDescription(event.description);
        setDateOfEvent(new Date(event.dateOfEvent).toISOString().slice(0, 16));
        setImage(event.image);

        // Set selected address for edit mode
        if (event.address) {
          setSelectedAddress(event.address);
        }
      } else {
        setTitle("");
        setDescription("");
        setDateOfEvent("");
        setImage(null);
        setSelectedAddress(null);
      }

      setAddressSearchInput("");
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      setShowAddressForm(false);
      setNewAddress({
        country: 141,
        city: "",
        street: "",
        building: "",
        premises: "",
        postalCode: "",
      });
      setAddressFormErrors({
        city: "",
        street: "",
        building: "",
        postalCode: "",
      });
      setError(null);
    }
  }, [isOpen, mode, event]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (addressDropdownRef.current && !addressDropdownRef.current.contains(e.target)) {
        setShowAddressDropdown(false);
      }
    };

    if (showAddressDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAddressDropdown]);

  const handleImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Address search functions
  const searchAddresses = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setAddressSuggestions([]);
      // Show dropdown with "Create New" option even when no search term
      setShowAddressDropdown(true);
      return;
    }

    try {
      const result = await api.get("/Addresses", {
        params: { pageNumber: 1, pageSize: 10, search: searchTerm },
      });
      setAddressSuggestions(result.items || []);
      setShowAddressDropdown(true);
    } catch (err) {
      console.error("Failed to search addresses", err);
      setAddressSuggestions([]);
      // Show dropdown with "Create New" option even on error
      setShowAddressDropdown(true);
    }
  };

  const handleAddressSearchChange = async (e) => {
    const value = e.target.value;
    setAddressSearchInput(value);
    setHighlightedAddressIndex(0);
    await searchAddresses(value);
  };

  const handleAddressSearchFocus = () => {
    // Show dropdown with "Create New" option when focused
    setShowAddressDropdown(true);
  };

  const handleSelectAddress = (address) => {
    setSelectedAddress(address);
    setShowAddressDropdown(false);
    setAddressSearchInput("");
    setAddressSuggestions([]);
  };

  const handleChangeAddress = () => {
    setSelectedAddress(null);
    setShowAddressForm(false);
    setAddressSearchInput("");
  };

  const handleCreateNewAddress = () => {
    setShowAddressForm(true);
    setShowAddressDropdown(false);
    setSelectedAddress(null);
    setAddressSearchInput("");
    setAddressSuggestions([]);
  };

  // Validation functions
  const validateAddressField = (name, value) => {
    switch (name) {
      case "city":
        if (!value.trim()) return "City is required";
        if (value.trim().length < 2) return "City must be at least 2 characters";
        if (!/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-.']+$/.test(value)) return "City contains invalid characters";
        return "";

      case "street":
        if (!value.trim()) return "Street is required";
        if (value.trim().length < 2) return "Street must be at least 2 characters";
        if (!/^[a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-.']+$/.test(value)) return "Street contains invalid characters";
        return "";

      case "building":
        if (!value.trim()) return "Building number is required";
        if (!/^[a-zA-Z0-9\s\-/]+$/.test(value)) return "Building number contains invalid characters";
        return "";

      case "postalCode":
        if (!value.trim()) return "Postal code is required";
        // Basic postal code validation (alphanumeric, spaces, hyphens)
        if (!/^[a-zA-Z0-9\s\-]+$/.test(value)) return "Postal code contains invalid characters";
        if (value.trim().length < 3) return "Postal code is too short";
        return "";

      default:
        return "";
    }
  };

  const handleAddressFormChange = (e) => {
    const { name, value } = e.target;
    setNewAddress(prev => ({ ...prev, [name]: value }));

    // Validate field and update errors
    if (name in addressFormErrors) {
      const error = validateAddressField(name, value);
      setAddressFormErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSaveNewAddress = async () => {
    // Validate all fields
    const errors = {
      city: validateAddressField("city", newAddress.city),
      street: validateAddressField("street", newAddress.street),
      building: validateAddressField("building", newAddress.building),
      postalCode: validateAddressField("postalCode", newAddress.postalCode),
    };

    // Update error state
    setAddressFormErrors(errors);

    // Check if there are any errors
    const hasErrors = Object.values(errors).some(error => error !== "");

    if (hasErrors) {
      setToast({
        message: "Please fix all validation errors before saving",
        type: "error",
      });
      return;
    }

    // Check required fields
    if (!newAddress.country || !newAddress.city || !newAddress.street || !newAddress.building || !newAddress.postalCode) {
      setToast({
        message: "Please fill in all required address fields",
        type: "error",
      });
      return;
    }

    try {
      const response = await api.post("/Addresses", newAddress);
      setSelectedAddress(response);
      setShowAddressForm(false);
      setToast({
        message: "Address created successfully",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to create address", err);
      setToast({
        message: err.response?.data?.message || "Failed to create address",
        type: "error",
      });
    }
  };

  const handleAddressKeyDown = (e) => {
    if (!showAddressDropdown) {
      return;
    }

    const totalOptions = addressSuggestions.length > 0 ? addressSuggestions.length + 1 : 1; // +1 for "Create New" option, or just 1 if no suggestions

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
        if (addressSuggestions.length > 0 && highlightedAddressIndex < addressSuggestions.length) {
          // Select an address from suggestions
          handleSelectAddress(addressSuggestions[highlightedAddressIndex]);
        } else {
          // "Create New" option selected (either at the end or the only option)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Prevent editing non-Created events
    if (mode === "edit" && event && event.status !== "Created") {
      setToast({
        message: `Cannot edit ${event.status.toLowerCase()} events. Only events with "Created" status can be modified.`,
        type: "error",
      });
      setLoading(false);
      return;
    }

    // Validate required fields
    if (!title || !description || !dateOfEvent || !selectedAddress) {
      setToast({
        message: "Please fill in all required fields",
        type: "error",
      });
      setLoading(false);
      return;
    }

    const eventData = {
      title,
      description,
      dateOfEvent,
      image: image ? image.split(',')[1] : null,
      addressId: selectedAddress.id,
      createdByUserId: currentUser.id,
    };

    try {
      let response;
      if (mode === "create") {
        response = await api.post("/Events", eventData);
      } else {
        response = await api.put(`/Events/${event.id}`, eventData);
      }
      onEventSaved(response.id);
      onClose();
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || `Failed to ${mode} event.`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Check if editing is disabled (only Created events can be edited)
  const isEditingDisabled = mode === "edit" && event && event.status !== "Created";

  // Footer with action buttons
  const modalFooter = !isEditingDisabled ? (
    <button type="submit" form="event-form" className="btn-confirm" disabled={loading}>
      {loading ? "Saving..." : "Save"}
    </button>
  ) : null;

  return (
    <Modal onClose={onClose} title={mode === "create" ? "Create Event" : "Edit Event"} wide footer={modalFooter}>
      <form onSubmit={handleSubmit} className="product-form event-form-modal" id="event-form">
        {/* Warning for non-Created events */}
        {mode === "edit" && event && event.status !== "Created" && (
          <div style={{
            background: "var(--error-bg, #fef2f2)",
            border: "1px solid var(--error, #ef4444)",
            borderRadius: "4px",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="var(--error, #ef4444)">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span style={{ color: "var(--error, #ef4444)", fontWeight: "500" }}>
              This event is {event.status.toLowerCase()} and cannot be edited. Only events with "Created" status can be modified.
            </span>
          </div>
        )}

        {/* Two-column layout */}
        <div className="event-form-columns">
          {/* LEFT COLUMN - General Data */}
          <div className="event-form-left">
            <label>
              Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event title"
                required
                disabled={isEditingDisabled}
              />
            </label>

            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter event description"
                rows={6}
                required
                disabled={isEditingDisabled}
              />
            </label>

            <label>
              Event Date & Time
              <input
                type="datetime-local"
                value={dateOfEvent}
                onChange={(e) => setDateOfEvent(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  fontSize: "0.9rem",
                }}
                required
                disabled={isEditingDisabled}
              />
            </label>

            {/* Address Search/Selection */}
            {!selectedAddress && !showAddressForm ? (
              <div className="address-search-container">
                <label>Search Address *</label>
                <input
                  type="text"
                  placeholder="Search existing address or create new..."
                  value={addressSearchInput}
                  onChange={handleAddressSearchChange}
                  onFocus={handleAddressSearchFocus}
                  onKeyDown={handleAddressKeyDown}
                  className="product-search-input"
                  disabled={isEditingDisabled}
                />

                {/* Address Suggestions Dropdown */}
                {showAddressDropdown && !isEditingDisabled && (
                  <div className="address-suggestions" ref={addressDropdownRef}>
                    {addressSuggestions.length > 0 ? (
                      <>
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
                              {addr.city}, {addr.postalCode} • {countries[addr.country] || addr.country}
                            </span>
                          </div>
                        ))}
                        <div
                          className={`address-suggestion-item create-new ${addressSuggestions.length === highlightedAddressIndex ? "highlighted" : ""}`}
                          onClick={handleCreateNewAddress}
                          style={{
                            borderTop: "1px solid var(--border-color, #e2e8f0)",
                            color: "var(--primary)",
                            fontWeight: "500",
                          }}
                        >
                          <div className="address-suggestion-main">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style={{ display: "inline-block", marginRight: "0.5rem", verticalAlign: "middle" }}>
                              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                            </svg>
                            <strong>Create New Address</strong>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div
                        className={`address-suggestion-item create-new ${highlightedAddressIndex === 0 ? "highlighted" : ""}`}
                        onClick={handleCreateNewAddress}
                        style={{
                          color: "var(--primary)",
                          fontWeight: "500",
                        }}
                      >
                        <div className="address-suggestion-main">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style={{ display: "inline-block", marginRight: "0.5rem", verticalAlign: "middle" }}>
                            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                          </svg>
                          <strong>Create New Address</strong>
                        </div>
                        <span className="address-suggestion-details">
                          No addresses found. Click to create a new one.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : showAddressForm ? (
              <div className="new-address-form">
                <label style={{ marginBottom: "1rem", display: "block" }}>
                  <strong>Create New Address</strong>
                </label>

                <div className="form-grid one-column" style={{ gap: "1rem" }}>
                  <label>
                    Country *
                    <select
                      name="country"
                      value={newAddress.country}
                      onChange={handleAddressFormChange}
                      required
                    >
                      {Object.entries(countries).map(([code, name]) => (
                        <option key={code} value={code}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    City *
                    <input
                      type="text"
                      name="city"
                      value={newAddress.city}
                      onChange={handleAddressFormChange}
                      placeholder="Enter city"
                      required
                      style={{
                        borderColor: addressFormErrors.city ? "var(--error, #ef4444)" : undefined
                      }}
                    />
                    {addressFormErrors.city && (
                      <small style={{ color: "var(--error, #ef4444)", display: "block", marginTop: "0.25rem" }}>
                        {addressFormErrors.city}
                      </small>
                    )}
                  </label>

                  <label>
                    Street *
                    <input
                      type="text"
                      name="street"
                      value={newAddress.street}
                      onChange={handleAddressFormChange}
                      placeholder="Enter street name"
                      required
                      style={{
                        borderColor: addressFormErrors.street ? "var(--error, #ef4444)" : undefined
                      }}
                    />
                    {addressFormErrors.street && (
                      <small style={{ color: "var(--error, #ef4444)", display: "block", marginTop: "0.25rem" }}>
                        {addressFormErrors.street}
                      </small>
                    )}
                  </label>

                  <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <label>
                      Building *
                      <input
                        type="text"
                        name="building"
                        value={newAddress.building}
                        onChange={handleAddressFormChange}
                        placeholder="Building #"
                        required
                        style={{
                          borderColor: addressFormErrors.building ? "var(--error, #ef4444)" : undefined
                        }}
                      />
                      {addressFormErrors.building && (
                        <small style={{ color: "var(--error, #ef4444)", display: "block", marginTop: "0.25rem" }}>
                          {addressFormErrors.building}
                        </small>
                      )}
                    </label>

                    <label>
                      Premises
                      <input
                        type="text"
                        name="premises"
                        value={newAddress.premises}
                        onChange={handleAddressFormChange}
                        placeholder="Apt/Suite (optional)"
                      />
                    </label>
                  </div>

                  <label>
                    Postal Code *
                    <input
                      type="text"
                      name="postalCode"
                      value={newAddress.postalCode}
                      onChange={handleAddressFormChange}
                      placeholder="Enter postal code"
                      required
                      style={{
                        borderColor: addressFormErrors.postalCode ? "var(--error, #ef4444)" : undefined
                      }}
                    />
                    {addressFormErrors.postalCode && (
                      <small style={{ color: "var(--error, #ef4444)", display: "block", marginTop: "0.25rem" }}>
                        {addressFormErrors.postalCode}
                      </small>
                    )}
                  </label>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={handleSaveNewAddress}
                    className="btn-confirm"
                    style={{ flex: 1 }}
                    disabled={
                      !newAddress.city ||
                      !newAddress.street ||
                      !newAddress.building ||
                      !newAddress.postalCode ||
                      Object.values(addressFormErrors).some(error => error !== "")
                    }
                  >
                    Save Address
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressForm(false);
                      setAddressSearchInput("");
                      setAddressFormErrors({
                        city: "",
                        street: "",
                        building: "",
                        postalCode: "",
                      });
                    }}
                    className="btn-cancel"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="selected-address-display">
                <label>Selected Address</label>
                <div className="address-display-box">
                  <strong>{selectedAddress.street} {selectedAddress.building}</strong>
                  {selectedAddress.premises && <span>, {selectedAddress.premises}</span>}
                  <br />
                  {selectedAddress.postalCode} {selectedAddress.city}
                  <br />
                  {countries[selectedAddress.country] || selectedAddress.country}
                </div>
                {!isEditingDisabled && (
                  <button
                    type="button"
                    onClick={handleChangeAddress}
                    className="btn-secondary-outline"
                    style={{
                      width: "100%",
                      marginTop: "0.5rem",
                    }}
                  >
                    Change Address
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Image Upload */}
          <div className="event-form-right">
            <label>
              Image (Required for publishing)
              <small style={{ display: "block", marginTop: "0.25rem", color: "var(--text-muted, #94a3b8)" }}>
                Image is optional when saving as draft, but required to publish the event
              </small>
            </label>
            <div
              className={`file-drop-zone ${dragActive ? "drag-active" : ""}`}
              onDrop={isEditingDisabled ? undefined : handleImageDrop}
              onDragOver={isEditingDisabled ? undefined : handleDragOver}
              onDragEnter={isEditingDisabled ? undefined : handleDragEnter}
              onDragLeave={isEditingDisabled ? undefined : handleDragLeave}
              onMouseEnter={() => !isEditingDisabled && setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              style={{
                border: dragActive
                  ? "2px dashed var(--primary)"
                  : isHovering
                    ? "2px dashed #94a3b8"
                    : "2px dashed #cbd5e1",
                borderRadius: "8px",
                padding: image ? "0" : "2rem",
                textAlign: "center",
                backgroundColor: dragActive
                  ? "rgba(59, 130, 246, 0.05)"
                  : isHovering
                    ? "#f8fafc"
                    : "transparent",
                cursor: isEditingDisabled ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                transform: dragActive ? "scale(1.02)" : "scale(1)",
                opacity: isEditingDisabled ? 0.6 : 1,
                minHeight: "400px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
              onClick={() => !isEditingDisabled && document.getElementById("imageUpload").click()}
            >
              {image ? (
                <img
                  src={image}
                  alt="Event preview"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    maxHeight: "500px",
                    objectFit: "contain",
                    borderRadius: "8px",
                  }}
                />
              ) : (
                <div>
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ margin: "0 auto 1rem", display: "block", color: "var(--secondary)" }}
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                    Drag and drop an image here, or click to browse
                  </p>
                  <small style={{ color: "var(--secondary)" }}>
                    Supported formats: JPG, PNG, GIF (max 5MB)
                  </small>
                </div>
              )}
              <input
                type="file"
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
                id="imageUpload"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="form-error" style={{ color: "red", marginTop: "0.5rem" }}>
            {error}
          </div>
        )}

        {toast && (
          <MessageBox
            message={toast.message}
            type={toast.type}
            duration={3000}
            onClose={() => setToast(null)}
          />
        )}
      </form>
    </Modal>
  );
}
