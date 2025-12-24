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
    status: 1, // InPreparation
    sendDate: "",
    deliveryDate: "",
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
        status: shipmentDetails.status,
        sendDate: shipmentDetails.sendDate ? shipmentDetails.sendDate.split('T')[0] : "",
        deliveryDate: shipmentDetails.deliveryDate ? shipmentDetails.deliveryDate.split('T')[0] : "",
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
      status: parseInt(form.status),
      sendDate: form.sendDate || null,
      deliveryDate: form.deliveryDate || null,
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

    // Update shipment
    const shipmentPayload = {
      status: parseInt(form.status),
      sendDate: form.sendDate || null,
      deliveryDate: form.deliveryDate || null,
      description: form.description || null,
      receiverName: form.receiverName,
      receiverTaxId: form.receiverTaxId,
      receiverDetails: form.receiverDetails || null,
      receiverAddressId: receiverAddressId,
      // Sender info remains unchanged (store info)
      senderName: form.senderName,
      senderTaxId: form.senderTaxId,
      senderDetails: form.senderDetails,
    };

    await api.put(`/Shipments/${shipmentDetails.id}`, shipmentPayload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === "add" ? "Add Leaving Shipment" : "Edit Leaving Shipment"}>
      <div className="modal-form">
        {/* Shipment Details Section */}
        <div className="form-section">
          <h4>Shipment Details</h4>

          <div className="form-group">
            <label>Status:</label>
            <select name="status" value={form.status} onChange={handleInputChange} disabled={mode === "edit"}>
              <option value={1}>In Preparation</option>
            </select>
          </div>

          <div className="form-group">
            <label>Send Date:</label>
            <input
              type="date"
              name="sendDate"
              value={form.sendDate}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>Estimated Delivery Date:</label>
            <input
              type="date"
              name="deliveryDate"
              value={form.deliveryDate}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>Description:</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Optional description"
            />
          </div>
        </div>

        {/* Receiver Information Section */}
        <div className="form-section">
          <h4>Receiver Information</h4>

          <div className="form-group">
            <label>Name: *</label>
            <input
              type="text"
              name="receiverName"
              value={form.receiverName}
              onChange={handleInputChange}
              placeholder="Receiver name"
              required
            />
          </div>

          <div className="form-group">
            <label>Tax ID: *</label>
            <input
              type="text"
              name="receiverTaxId"
              value={form.receiverTaxId}
              onChange={handleInputChange}
              placeholder="Tax ID / VAT number"
              required
            />
          </div>

          <div className="form-group">
            <label>Additional Details:</label>
            <textarea
              name="receiverDetails"
              value={form.receiverDetails}
              onChange={handleInputChange}
              rows={2}
              placeholder="Optional additional details"
            />
          </div>

          <div className="form-group">
            <label>Street: *</label>
            <input
              type="text"
              name="receiverStreet"
              value={form.receiverStreet}
              onChange={handleInputChange}
              placeholder="Street name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Building: *</label>
              <input
                type="text"
                name="receiverBuilding"
                value={form.receiverBuilding}
                onChange={handleInputChange}
                placeholder="Building number"
                required
              />
            </div>

            <div className="form-group">
              <label>Premises:</label>
              <input
                type="text"
                name="receiverPremises"
                value={form.receiverPremises}
                onChange={handleInputChange}
                placeholder="Apartment/Unit (optional)"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Postal Code: *</label>
              <input
                type="text"
                name="receiverPostalCode"
                value={form.receiverPostalCode}
                onChange={handleInputChange}
                placeholder="Postal code"
                required
              />
            </div>

            <div className="form-group">
              <label>City: *</label>
              <input
                type="text"
                name="receiverCity"
                value={form.receiverCity}
                onChange={handleInputChange}
                placeholder="City"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Country: *</label>
            <select name="receiverCountry" value={form.receiverCountry} onChange={handleInputChange} required>
              {countries.map(country => (
                <option key={country.value} value={country.value}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sender Information Section (Read-only) */}
        <div className="form-section">
          <h4>Sender Information (Store)</h4>

          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              name="senderName"
              value={form.senderName}
              disabled
              readOnly
            />
          </div>

          <div className="form-group">
            <label>Tax ID:</label>
            <input
              type="text"
              name="senderTaxId"
              value={form.senderTaxId}
              disabled
              readOnly
            />
          </div>

          <div className="form-group">
            <label>Address:</label>
            <input
              type="text"
              name="senderDetails"
              value={form.senderDetails}
              disabled
              readOnly
            />
          </div>
        </div>

        {/* Note about products and dimensions */}
        <div className="form-note">
          <p><strong>Note:</strong> Products and package dimensions will be set when preparing the shipment.</p>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
