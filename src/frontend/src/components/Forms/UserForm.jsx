import React, { useEffect, useState } from "react";
import { api } from "../../api/apiClient";
import MessageBox from "../MessageBox";

const initialUser = {
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    role: "ShopAssistant",
    login: "",
    password: "",
    confirmPassword: "",
};

const initialAddress = {
    country: "",
    city: "",
    street: "",
    building: "",
    premises: "",
    postalCode: "",
};

export default function UserForm({ mode = "create", user, address, roles = [], onSuccess }) {
    const [userForm, setUserForm] = useState(initialUser);
    const [addressForm, setAddressForm] = useState(initialAddress);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        setUserForm((prev) => ({
            ...initialUser,
            ...user,
            login: mode === "create" ? "" : user?.login || prev.login,
            password: "",
            confirmPassword: "",
        }));
    }, [user, mode]);

    useEffect(() => {
        setAddressForm({ ...initialAddress, ...address });
    }, [address]);

    const handleUserChange = (e) => {
        const { name, value } = e.target;
        setUserForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setAddressForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (mode === "create" && userForm.password !== userForm.confirmPassword) {
            setToast({ message: "Passwords do not match.", type: "error" });
            return;
        }

        const addressPayload = {
            country: addressForm.country,
            city: addressForm.city,
            street: addressForm.street,
            building: addressForm.building,
            premises: addressForm.premises,
            postalCode: addressForm.postalCode,
        };

        try {
            setLoading(true);
            if (mode === "create") {
                const created = await api.post("/Auth/register", {
                    firstName: userForm.firstName,
                    lastName: userForm.lastName,
                    email: userForm.email,
                    phoneNumber: userForm.phoneNumber,
                    dateOfBirth: userForm.dateOfBirth,
                    role: userForm.role,
                    login: userForm.login,
                    password: userForm.password,
                    address: addressPayload,
                });
                onSuccess?.(created?.id);
            } else if (user?.id) {
                if (user?.addressId) {
                    await api.put(`/Addresses/${user.addressId}`, addressPayload);
                }

                await api.put(`/Users/${user.id}`, {
                    firstName: userForm.firstName,
                    lastName: userForm.lastName,
                    email: userForm.email,
                    phoneNumber: userForm.phoneNumber,
                    dateOfBirth: userForm.dateOfBirth,
                    role: userForm.role,
                    ...(user?.addressId ? { addressId: user.addressId } : { address: addressPayload }),
                });
                onSuccess?.(user.id);
            }
        } catch (err) {
            console.error(err);
            setToast({
                message: err.response?.data?.message || "Failed to save user.",
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
                    name="firstName"
                    placeholder="First Name"
                    value={userForm.firstName}
                    onChange={handleUserChange}
                    required
                />
                <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={userForm.lastName}
                    onChange={handleUserChange}
                    required
                />
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={userForm.email}
                    onChange={handleUserChange}
                    required
                />
                <input
                    type="tel"
                    name="phoneNumber"
                    placeholder="Phone Number"
                    value={userForm.phoneNumber}
                    onChange={handleUserChange}
                />
                <input
                    type="date"
                    name="dateOfBirth"
                    value={userForm.dateOfBirth}
                    onChange={handleUserChange}
                    required
                />
                <select
                    name="role"
                    value={userForm.role}
                    onChange={handleUserChange}
                    required
                >
                    {roles.map((r) => (
                        <option key={r} value={r}>
                            {r}
                        </option>
                    ))}
                </select>
            </div>

            {mode === "create" && (
                <div className="form-grid two-column">
                    <input
                        type="text"
                        name="login"
                        placeholder="Login"
                        value={userForm.login}
                        onChange={handleUserChange}
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={userForm.password}
                        onChange={handleUserChange}
                        required
                    />
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={userForm.confirmPassword}
                        onChange={handleUserChange}
                        required
                    />
                </div>
            )}

            <h4 className="form-section-title">Address</h4>
            <div className="form-grid two-column">
                <input
                    type="text"
                    name="country"
                    placeholder="Country"
                    value={addressForm.country}
                    onChange={handleAddressChange}
                    required
                />
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
                    {loading ? "Saving..." : mode === "create" ? "Register" : "Save"}
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
