import React, { useState, useEffect } from "react";
import { api } from "../../api/apiClient";
import { useToast } from "../ToastContext";
import { getUniqueCountries, getPrimaryCodeForCountry } from "../../data/eanCountryCodes";
import { generateEAN13, validateEAN13, autoGenerateEAN13 } from "../../utils/eanGenerator";

export default function ProductForm({ product, categories, onSuccess }) {
  const { showToast } = useToast();
    const [form, setForm] = useState({
        sku: "",
        ean: "",
        name: "",
        description: "",
        price: "",
        categoryId: "",
        categoryName: "",
        taxRateId: "",
        defective: false,
        defectDescription: "",
    });

    // EAN Builder state
    const [eanBuilder, setEanBuilder] = useState({
        country: "Poland",
        countryCode: "590",
        manufacturerCode: "12345",
        productCode: "0001",
        mode: "builder", // "builder" | "manual" | "random"
    });

    const [taxRates, setTaxRates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [eanValidation, setEanValidation] = useState({
        isChecking: false,
        isValid: null,
        message: ""
    });

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
                ean: product.ean || "",
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

    // --- Check EAN uniqueness ---
    useEffect(() => {
        if (!form.ean || form.ean.length !== 13) {
            setEanValidation({ isChecking: false, isValid: null, message: "" });
            return;
        }

        // Don't check if editing and EAN hasn't changed
        if (product && product.ean === form.ean) {
            setEanValidation({ isChecking: false, isValid: true, message: "Current EAN" });
            return;
        }

        // Validate format first
        if (!validateEAN13(form.ean)) {
            setEanValidation({ isChecking: false, isValid: false, message: "Invalid EAN-13 checksum" });
            return;
        }

        // Debounce the API call
        const timer = setTimeout(async () => {
            setEanValidation({ isChecking: true, isValid: null, message: "Checking..." });

            try {
                const response = await api.get("/Products", {
                    params: { q: form.ean, pageSize: 1 }
                });

                const products = response.items || [];
                const isDuplicate = products.some(p => p.ean === form.ean);

                if (isDuplicate) {
                    setEanValidation({
                        isChecking: false,
                        isValid: false,
                        message: "EAN already in use"
                    });
                } else {
                    setEanValidation({
                        isChecking: false,
                        isValid: true,
                        message: "EAN available"
                    });
                }
            } catch (err) {
                console.error("EAN validation error:", err);
                setEanValidation({
                    isChecking: false,
                    isValid: null,
                    message: "Could not verify EAN"
                });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [form.ean, product]);

    // --- Handle change ---
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    // --- Handle EAN Builder change ---
    const handleEanBuilderChange = (field, value) => {
        setEanBuilder(prev => {
            const updated = { ...prev, [field]: value };

            // Update country code when country changes
            if (field === "country") {
                const code = getPrimaryCodeForCountry(value);
                updated.countryCode = code || "590";
            }

            // Auto-generate EAN if in builder mode
            if (prev.mode === "builder" && updated.countryCode && updated.manufacturerCode && updated.productCode) {
                try {
                    const generatedEAN = generateEAN13(
                        updated.countryCode,
                        updated.manufacturerCode,
                        updated.productCode
                    );
                    setForm(prevForm => ({ ...prevForm, ean: generatedEAN }));
                } catch (err) {
                    console.error("Failed to generate EAN:", err);
                }
            }

            return updated;
        });
    };

    // --- Cycle through EAN modes ---
    const cycleEanMode = () => {
        setEanBuilder(prev => {
            let nextMode;
            if (prev.mode === "builder") {
                nextMode = "manual";
            } else if (prev.mode === "manual") {
                nextMode = "random";
            } else {
                nextMode = "builder";
            }

            // Auto-generate when switching to random mode
            if (nextMode === "random") {
                try {
                    const generatedEAN = autoGenerateEAN13(prev.countryCode);
                    setForm(prevForm => ({ ...prevForm, ean: generatedEAN }));
                } catch (err) {
                    console.error("Failed to generate EAN:", err);
                }
            }

            return { ...prev, mode: nextMode };
        });
    };

    // --- Submit form ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prevent submission if EAN is invalid or duplicate
        if (form.ean && eanValidation.isValid === false) {
            showToast(`Cannot save: ${eanValidation.message}`, "error",
            );
            return;
        }

        setLoading(true);

        try {
            const payload = {
                sku: form.sku,
                ean: form.ean || null,
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

            showToast(`${message}`, "error",
            );
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

            {/* --- EAN-13 Builder --- */}
            <div className="ean-builder-section" style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
                marginBottom: "15px",
                backgroundColor: "#f9f9f9"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>
                        EAN-13 Barcode
                        {eanValidation.isChecking && (
                            <span style={{ color: "#666", fontSize: "12px", marginLeft: "8px" }}>⏳ {eanValidation.message}</span>
                        )}
                        {!eanValidation.isChecking && eanValidation.isValid === true && (
                            <span style={{ color: "green", fontSize: "12px", marginLeft: "8px" }}>✓ {eanValidation.message}</span>
                        )}
                        {!eanValidation.isChecking && eanValidation.isValid === false && (
                            <span style={{ color: "red", fontSize: "12px", marginLeft: "8px" }}>✗ {eanValidation.message}</span>
                        )}
                    </h4>
                    <button
                        type="button"
                        onClick={cycleEanMode}
                        style={{
                            padding: "5px 10px",
                            fontSize: "12px",
                            background:
                                eanBuilder.mode === "builder" ? "#2196F3" :
                                eanBuilder.mode === "manual" ? "#ff9800" :
                                "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                        }}
                    >
                        Mode: {eanBuilder.mode === "builder" ? "Builder" : eanBuilder.mode === "manual" ? "Manual" : "Random"}
                    </button>
                </div>

                {/* Builder Mode */}
                {eanBuilder.mode === "builder" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "500", display: "block", marginBottom: "5px" }}>
                                Country of Manufacture
                            </label>
                            <select
                                value={eanBuilder.country}
                                onChange={(e) => handleEanBuilderChange("country", e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                            >
                                {getUniqueCountries().map(country => (
                                    <option key={country.name} value={country.name}>
                                        {country.name} ({country.codes[0]})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "500", display: "block", marginBottom: "5px" }}>
                                Manufacturer Code (5 digits)
                            </label>
                            <input
                                type="text"
                                value={eanBuilder.manufacturerCode}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                                    handleEanBuilderChange("manufacturerCode", value);
                                }}
                                placeholder="12345"
                                maxLength={5}
                                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "500", display: "block", marginBottom: "5px" }}>
                                Product Code (4 digits)
                            </label>
                            <input
                                type="text"
                                value={eanBuilder.productCode}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                    handleEanBuilderChange("productCode", value);
                                }}
                                placeholder="0001"
                                maxLength={4}
                                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                            />
                        </div>
                    </div>
                )}

                {/* Manual Mode */}
                {eanBuilder.mode === "manual" && (
                    <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "500", display: "block", marginBottom: "5px" }}>
                            Manual EAN-13 Entry
                        </label>
                        <input
                            type="text"
                            name="ean"
                            placeholder="Enter 13-digit EAN"
                            value={form.ean}
                            onChange={handleChange}
                            maxLength={13}
                            pattern="\d{13}"
                            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                        />
                    </div>
                )}

                {/* Random Mode */}
                {eanBuilder.mode === "random" && (
                    <div style={{ marginBottom: "10px", padding: "15px", backgroundColor: "#e8f5e9", borderRadius: "4px" }}>
                        <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#2e7d32" }}>
                            🎲 Random EAN generated automatically using country code: <strong>{eanBuilder.countryCode}</strong>
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                try {
                                    const generatedEAN = autoGenerateEAN13(eanBuilder.countryCode);
                                    setForm(prev => ({ ...prev, ean: generatedEAN }));
                                    showToast("New random EAN generated!", "success");
                                } catch (err) {
                                    showToast(`Failed to generate EAN: ${err.message}`, "error");
                                }
                            }}
                            style={{
                                width: "100%",
                                padding: "8px",
                                backgroundColor: "#4CAF50",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: "500"
                            }}
                        >
                            🔄 Generate New Random EAN
                        </button>
                    </div>
                )}

                {/* EAN Display */}
                <div style={{
                    padding: "12px",
                    backgroundColor: "#fff",
                    border: `2px solid ${
                        eanValidation.isValid === false ? "#f44336" :
                        eanValidation.isValid === true ? "#4CAF50" :
                        "#2196F3"
                    }`,
                    borderRadius: "4px",
                    textAlign: "center",
                    fontFamily: "monospace",
                    fontSize: "18px",
                    fontWeight: "bold",
                    letterSpacing: "2px"
                }}>
                    {form.ean || "_ _ _ _ _ _ _ _ _ _ _ _ _"}
                </div>

                <p style={{ fontSize: "11px", color: "#666", marginTop: "8px", marginBottom: 0 }}>
                    <strong>Structure:</strong> {eanBuilder.countryCode} (Country) + {eanBuilder.manufacturerCode} (Manufacturer) + {eanBuilder.productCode} (Product) + Check Digit
                </p>
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
            <button
                type="submit"
                className="btn-confirm"
                disabled={loading || (form.ean && eanValidation.isValid === false)}
            >
                {loading ? "Saving..." : "Save"}
            </button>
        </div>
        </form>
    );
}
