import React, { useEffect, useState } from "react";
import { api } from "../../api/apiClient";
import MessageBox from "../MessageBox";

const initialTaxRate = {
  code: "",
  rate: "",
  isActive: true,
};

export default function TaxRateForm({ mode = "create", taxRate, onSuccess }) {
  const [form, setForm] = useState(initialTaxRate);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (mode === "edit" && taxRate) {
      // For edit mode, we need to convert the rate back from display format
      // The taxRate comes with rate like "23%", we need to extract just the number
      const rateValue = taxRate.rate ? parseFloat(taxRate.rate.replace("%", "")) : "";

      setForm({
        code: taxRate.code || "",
        rate: rateValue,
        isActive: taxRate._isActive !== undefined ? taxRate._isActive : true,
      });
    } else {
      setForm(initialTaxRate);
    }
  }, [taxRate, mode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert percentage to decimal (23 -> 0.23)
      const payload = {
        code: form.code,
        rate: parseFloat(form.rate) / 100,
        isActive: form.isActive,
      };

      if (mode === "create") {
        const response = await api.post("/TaxRate", payload);
        onSuccess?.(response.id);
      } else {
        // For edit mode, send code and original rate (rate cannot be changed via UI)
        // Rate must be sent because backend DTO requires it
        const editPayload = {
          code: form.code,
          rate: parseFloat(form.rate) / 100,
          isActive: form.isActive,
        };
        await api.put(`/TaxRate/${taxRate.id}`, editPayload);
        onSuccess?.(taxRate.id);
      }
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to save tax rate.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <div className="form-grid one-column">
        <label>
          Code
          <input
            type="text"
            name="code"
            placeholder="Tax Rate Code (e.g., VAT23)"
            value={form.code}
            onChange={handleChange}
            required
          />
        </label>

        {mode === "create" && (
          <>
            <label>
              Rate (%)
              <input
                type="number"
                name="rate"
                placeholder="Rate as percentage (e.g., 23 for 23%)"
                value={form.rate}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                required
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
              />
              Active
            </label>
          </>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-confirm" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
      </div>

      {toast && (
        <MessageBox
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
    </form>
  );
}
