import React, { useEffect, useState } from "react";
import { api } from "../../api/apiClient";
import MessageBox from "../MessageBox";
import { clientTypesData } from "../../data/clientTypes";

const initialClient = {
  name: "",
  email: "",
  phoneNumber: "",
  type: 1, // Default to "Company"
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
  const [clientForm, setClientForm] = useState(initialClient);
  const [addressForm, setAddressForm] = useState(initialAddress);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

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
      setClientForm({
        name: client.name || "",
        email: client.email || "",
        phoneNumber: client.phoneNumber || "",
        type: client.type || 1, // Default to "Company" if not set
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

    const clientPayload = {
      name: clientForm.name,
      email: clientForm.email,
      phoneNumber: clientForm.phoneNumber,
      type: parseInt(clientForm.type, 10),
      address: addressPayload,
    };

    console.log("Submitting client payload:", clientPayload);

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

      setToast({
        message: errorMessage,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <div className="form-grid two-column">
        <input
          type="text"
          name="name"
          placeholder="Client Name"
          value={clientForm.name}
          onChange={handleClientChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={clientForm.email}
          onChange={handleClientChange}
          required
        />
        <input
          type="tel"
          name="phoneNumber"
          placeholder="Phone Number"
          value={clientForm.phoneNumber}
          onChange={handleClientChange}
          required
        />
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

      <h4 className="form-section-title">Address</h4>
      <div className="form-grid two-column">
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
        <input
          type="text"
          name="city"
          placeholder="City"
          value={addressForm.city}
          onChange={handleAddressChange}
          required
        />
        <input
          type="text"
          name="street"
          placeholder="Street"
          value={addressForm.street}
          onChange={handleAddressChange}
          required
        />
        <input
          type="text"
          name="building"
          placeholder="Building"
          value={addressForm.building}
          onChange={handleAddressChange}
          required
        />
        <input
          type="text"
          name="premises"
          placeholder="Premises"
          value={addressForm.premises}
          onChange={handleAddressChange}
        />
        <input
          type="text"
          name="postalCode"
          placeholder="Postal Code"
          value={addressForm.postalCode}
          onChange={handleAddressChange}
          required
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-confirm" disabled={loading}>
          {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
        </button>
      </div>

      {toast && (
        <MessageBox
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
          className="centered"
        />
      )}
    </form>
  );
}
