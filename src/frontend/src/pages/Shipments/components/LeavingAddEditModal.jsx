import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { api } from "../../../api/apiClient";
import { countries, getCountryValue } from "../../../data/countries";

export default function LeavingAddEditModal({
  isOpen,
  onClose,
  onSave,
  setToast,
  mode, // "add" or "edit"
  shipment = null,
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
    // Step 1: Create or get receiver address
    const receiverAddressPayload = {
      country: parseInt(form.receiverCountry),
      city: form.receiverCity,
      street: form.receiverStreet,
      building: form.receiverBuilding,
      premises: form.receiverPremises || null,
      postalCode: form.receiverPostalCode,
    };

    const receiverAddressResponse = await api.post("/Addresses", receiverAddressPayload);
    const receiverAddressId = receiverAddressResponse.id;

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
        // Create new address
        const receiverAddressPayload = {
          country: parseInt(form.receiverCountry),
          city: form.receiverCity,
          street: form.receiverStreet,
          building: form.receiverBuilding,
          premises: form.receiverPremises || null,
          postalCode: form.receiverPostalCode,
        };

        const receiverAddressResponse = await api.post("/Addresses", receiverAddressPayload);
        receiverAddressId = receiverAddressResponse.id;
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
              </div>
            </div>

            {/* Section C: Sender Information (Display Only) */}
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
