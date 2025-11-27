import React, { useEffect, useState } from "react";
import { api } from "../../api/apiClient";
import MessageBox from "../MessageBox";

const initialCategory = {
    name: "",
    description: "",
};

export default function CategoryForm({ mode = "create", category, onSuccess }) {
    const [form, setForm] = useState(initialCategory);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (mode === "edit" && category) {
            setForm({
                name: category.name || "",
                description: category.description || "",
            });
        } else {
            setForm(initialCategory);
        }
    }, [category, mode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === "create") {
                const response = await api.post("/Categories", form);
                onSuccess?.(response.id);
            } else {
                await api.put(`/Categories/${category.id}`, form);
                onSuccess?.(category.id);
            }
        } catch (err) {
            console.error(err);
            setToast({
                message: err.response?.data?.message || "Failed to save category.",
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
                    Name
                    <input
                        type="text"
                        name="name"
                        placeholder="Category Name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Description
                    <textarea
                        name="description"
                        placeholder="Category Description"
                        value={form.description}
                        onChange={handleChange}
                        rows={3}
                    />
                </label>
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
