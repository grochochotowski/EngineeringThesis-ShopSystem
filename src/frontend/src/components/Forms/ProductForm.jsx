import React, { useState, useEffect } from "react";
import { api } from "../../api/apiClient";
import MessageBox from "../MessageBox";

export default function ProductForm({ product, categories, onSuccess }) {
    const [form, setForm] = useState({
        sku: "",
        name: "",
        description: "",
        price: "",
        categoryId: "",
        categoryName: "",
        taxRateId: "",
        defective: false,
        defectDescription: "",
    });

    const [taxRates, setTaxRates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // --- Load tax rates once ---
    useEffect(() => {
        (async () => {
            try {
                const taxes = await api.get("/TaxRate");
                setTaxRates(taxes || []);
            } catch (err) {
                console.error(err);
            }
        })();
    }, []);

    // --- Prefill form if editing ---
    useEffect(() => {
        if (product) {
            setForm({
                sku: product.sku || "",
                name: product.name || "",
                description: product.description || product.Description || "",
                price: product.price || "",
                categoryId: product.categoryId || product.CategoryId || "",
                categoryName: product.categoryName || product.CategoryName || "",
                taxRateId: product.taxRateId || product.TaxRateId || "",
                defective: product.defective === "Yes" || product.defective === true,
                defectDescription: product.defectDescription || product.DefectDescription || "",
            });
        }
    }, [product]);

    // --- Handle change ---
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    // --- Submit form ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                sku: form.sku,
                name: form.name,
                description: form.description,
                price: parseFloat(form.price),
                categoryId: form.categoryId,
                taxRateId: form.taxRateId,
                defective: form.defective,
                defectDescription: form.defectDescription || null,
            };

            let productId;
            if (product) {
                await api.put(`/Products/${product.id}`, payload);
                productId = product.id;
            } else {
                const response = await api.post("/Products", payload);
                productId = response.id;
            }

            onSuccess(productId);
        } catch (err) {
            console.error(err);

            let message = "Failed to save product.";

            const raw = err?.response?.data ?? err.message ?? "";

            try {
                const jsonMatch = raw.match(/\{.*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    message = parsed.message || message;
                } else if (typeof raw === "string") {
                    message = raw.replace(/^API error.*?:\s*/, "").trim();
                }
            } catch {
                message = raw.replace(/^API error.*?:\s*/, "").trim();
            }

            setToast({
                message: `${message}`,
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    // --- Render ---
    return (
        <form className="product-form" onSubmit={handleSubmit}>
            <div className="form-grid">
                <input
                    type="text"
                    name="sku"
                    placeholder="SKU"
                    value={form.sku}
                    onChange={handleChange}
                    required
                />
                <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={form.name}
                    onChange={handleChange}
                    required
                />
                <input
                    type="number"
                    step="0.01"
                    name="price"
                    placeholder="Price"
                    value={form.price}
                    onChange={handleChange}
                    required
                />
            </div>

            {/* --- Category select --- */}
            <select
                name="categoryId"
                value={form.categoryId}
                onChange={handleChange}
                required
            >
                <option value="" disabled>
                    Select Category
                </option>
                {Array.from(categories.entries()).map(([id, name]) => (
                    <option key={id} value={id}>
                        {name}
                    </option>
                ))}
            </select>

            {/* --- Tax Rate select --- */}
            <select
                name="taxRateId"
                value={form.taxRateId}
                onChange={handleChange}
                required
            >
                <option value="" disabled>Select Tax Rate</option>
                {taxRates.map((rate) => (
                    <option key={rate.id} value={rate.id}>
                        {rate.code} ({(rate.rate * 100).toFixed(0)}%)
                    </option>
                ))}
            </select>

            {/* --- Description --- */}
            <textarea
                name="description"
                placeholder="Description"
                value={form.description}
                onChange={handleChange}
                rows={3}
            />

            {/* --- Defect + Active --- */}
            <div className="form-row">
                <label>
                    <input
                        type="checkbox"
                        name="defective"
                        checked={form.defective}
                        onChange={handleChange}
                    />{" "}
                    Defective
                </label>
                <input
                    type="text"
                    name="defectDescription"
                    placeholder="Defect description"
                    value={form.defectDescription || ""}
                    onChange={handleChange}
                    disabled={!form.defective}
                    style={{
                        opacity: form.defective ? 1 : 0.5,
                        cursor: form.defective ? "text" : "not-allowed",
                    }}
                />
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
                className="centered"
            />
        )}
        </form>
    );
}
