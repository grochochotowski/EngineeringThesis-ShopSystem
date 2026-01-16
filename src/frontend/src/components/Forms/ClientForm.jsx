import React, { useEffect, useState } from "react";
import { api } from "../../api/apiClient";
import { useToast } from "../ToastContext";
import { clientTypesData } from "../../data/clientTypes";

const initialClient = {
  name: "",
  email: "",
  phoneNumber: "",
  type: 2, // Default to "Person"
  taxId: "",
};

const initialAddress = {
  country: "",
  city: "",
  street: "",
  building: "",
  premises: "",
  postalCode: "",
};

export default function ClientForm({ mode = "create", client, address, onSuccess }) {
  const { showToast } = useToast();
  const [clientForm, setClientForm] = useState(initialClient);
  const [addressForm, setAddressForm] = useState(initialAddress);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await api.get("/Addresses/countries");
        setCountries(response || []);
      } catch (err) {
        console.error("Failed to load countries.", err);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    if (mode === "edit" && client) {
      // Convert type from string enum name to ID if needed
      let typeId = 1; // Default to "Company"
      if (typeof client.type === 'number') {
        typeId = client.type;
      } else if (typeof client.type === 'string') {
        // Find the ID by matching the enum name
        const typeData = clientTypesData.find(ct => ct.value === client.type);
        typeId = typeData ? typeData.id : 1;
      }

      setClientForm({
        name: client.name || "",
        email: client.email || "",
        phoneNumber: client.phoneNumber || "",
        type: typeId,
        taxId: client.taxId || "",
      });
    } else {
      setClientForm(initialClient);
    }
  }, [client, mode]);

  useEffect(() => {
    setAddressForm({ ...initialAddress, ...address });
  }, [address]);

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setClientForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const addressPayload = {
      country: addressForm.country,
      city: addressForm.city,
      street: addressForm.street,
      building: addressForm.building,
      premises: addressForm.premises,
      postalCode: addressForm.postalCode,
    };

    const typeAsInt = parseInt(clientForm.type, 10);
    const clientPayload = {
      name: clientForm.name,
      email: clientForm.email,
      phoneNumber: clientForm.phoneNumber,
      type: typeAsInt,
      taxId: typeAsInt === 1 ? clientForm.taxId : null, // Only for Company
      address: addressPayload,
    };

    try {
      setLoading(true);
      if (mode === "create") {
        const created = await api.post("/Clients", clientPayload);
        onSuccess?.(created?.id);
      } else if (client?.id) {
        await api.put(`/Clients/${client.id}`, clientPayload);
        onSuccess?.(client.id);
      }
    } catch (err) {
      console.error("Client form error:", err);
      console.error("Error response:", err.response?.data);

      let errorMessage = "Failed to save client.";

      // Check for validation errors
      if (err.response?.data?.errors) {
        const errors = Object.entries(err.response.data.errors)
          .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
          .join("; ");
        errorMessage = errors;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.title) {
        errorMessage = err.response.data.title;
      }

      showToast(errorMessage, "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const isCompany = parseInt(clientForm.type, 10) === 1;

  return (
    <form onSubmit={handleSubmit} className="product-form client-form-two-column">
      {/* Two-Column Layout: Client Info | Address */}
      <div className="client-form-columns">
        {/* LEFT COLUMN: Client Information */}
        <div className="client-form-left">
          <h4 className="form-section-title">Client Information</h4>
          <div className="form-section">
            {/* Name */}
            <div className="form-field">
              <label>Name *</label>
              <input
                type="text"
                name="name"
                placeholder="Enter client name"
                value={clientForm.name}
                onChange={handleClientChange}
                required
              />
            </div>

            {/* Type */}
            <div className="form-field">
              <label>Type *</label>
              <select
                name="type"
                value={clientForm.type}
                onChange={handleClientChange}
                required
              >
                {clientTypesData
                  .filter((ct) => ct.id !== 0) // Exclude "Unspecified"
                  .map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.value}
                    </option>
                  ))}
              </select>
            </div>

            {/* Tax ID - only for Company */}
            {isCompany && (
              <div className="form-field">
                <label>Tax ID (NIP) *</label>
                <input
                  type="text"
                  name="taxId"
                  placeholder="Enter tax identification number"
                  value={clientForm.taxId}
                  onChange={handleClientChange}
                  required
                />
              </div>
            )}

            {/* Email */}
            <div className="form-field">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                placeholder="Enter email address"
                value={clientForm.email}
                onChange={handleClientChange}
                required
              />
            </div>

            {/* Phone Number */}
            <div className="form-field">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phoneNumber"
                placeholder="Enter phone number"
                value={clientForm.phoneNumber}
                onChange={handleClientChange}
                required
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Address */}
        <div className="client-form-right">
          <h4 className="form-section-title">Address</h4>
          <div className="form-section">
            {/* Country */}
            <div className="form-field">
              <label>Country *</label>
              <select
                name="country"
                value={addressForm.country}
                onChange={handleAddressChange}
                required
              >
                <option value="" disabled>Select a country</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className="form-field">
              <label>City *</label>
              <input
                type="text"
                name="city"
                placeholder="Enter city"
                value={addressForm.city}
                onChange={handleAddressChange}
                required
              />
            </div>

            {/* Postal Code */}
            <div className="form-field">
              <label>Postal Code *</label>
              <input
                type="text"
                name="postalCode"
                placeholder="Enter postal code"
                value={addressForm.postalCode}
                onChange={handleAddressChange}
                required
              />
            </div>

            {/* Street */}
            <div className="form-field">
              <label>Street *</label>
              <input
                type="text"
                name="street"
                placeholder="Enter street name"
                value={addressForm.street}
                onChange={handleAddressChange}
                required
              />
            </div>

            {/* Building and Premises - Side by Side */}
            <div className="form-row-2">
              {/* Building */}
              <div className="form-field">
                <label>Building *</label>
                <input
                  type="text"
                  name="building"
                  placeholder="Building number"
                  value={addressForm.building}
                  onChange={handleAddressChange}
                  required
                />
              </div>

              {/* Premises */}
              <div className="form-field">
                <label>Premises</label>
                <input
                  type="text"
                  name="premises"
                  placeholder="Apartment/Unit (optional)"
                  value={addressForm.premises}
                  onChange={handleAddressChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions - Button on Right */}
      <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button type="submit" className="btn-confirm" disabled={loading}>
          {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
        </button>
      </div>
    </form>
  );
}
