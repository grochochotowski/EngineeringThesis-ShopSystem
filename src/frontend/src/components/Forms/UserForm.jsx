import React, { useEffect, useState } from "react";
import { api } from "../../api/apiClient";
import { useToast } from "../ToastContext";

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

export default function UserForm({ mode = "create", user, address, roles = [], roleLimit, onSuccess }) {
    const { showToast } = useToast();
    const [userForm, setUserForm] = useState(initialUser);
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
            showToast("Passwords do not match.", "error");
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
                // For edit mode, always send address data
                // Backend will use GetOrCreateAsync to reuse existing addresses or create new ones
                await api.put(`/Users/${user.id}`, {
                    firstName: userForm.firstName,
                    lastName: userForm.lastName,
                    email: userForm.email,
                    phoneNumber: userForm.phoneNumber,
                    dateOfBirth: userForm.dateOfBirth,
                    role: userForm.role,
                    address: addressPayload,
                });
                onSuccess?.(user.id);
            }
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || "Failed to save user.", "error");
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
                    {roles
                        .filter((r) => {
                            if (!roleLimit) return true;
                            const hierarchy = ["ShopAssistant", "ItTechnician", "Marketer", "DeputyManager", "Manager", "CEO", "Admin", "Root"];
                            const limitRank = hierarchy.indexOf(roleLimit);
                            const roleRank = hierarchy.indexOf(r);
                            return roleRank <= limitRank;
                        })
                        .map((r) => (
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
                    {loading ? "Saving..." : mode === "create" ? "Register" : "Save"}
                </button>
            </div>
        </form>
    );
}
