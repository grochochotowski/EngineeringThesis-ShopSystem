import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { GlobalStateContext } from "../GlobalState";

import MessageBox from "../components/MessageBox";
import "../styles/PagesStyles/login.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const { setState } = useContext(GlobalStateContext);

    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("https://localhost:7132/api/Auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login, password }),
            });

            const data = await res.json();
            if (!res.ok)
                throw new Error(data?.message || `Login failed (${res.status})`);

            // store tokens & user data
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);
            localStorage.setItem(
                "user",
                JSON.stringify({
                    id: data.id,
                    name: `${data.firstName} ${data.lastName}`,
                    email: data.email,
                    role: data.role,
                })
            );

            // update global state
            setState(prev => ({ ...prev, isLoggedIn: true }));

            // send message & redirect
            setToast({ message: "Login successful!", type: "success" });
            navigate("/dashboard");

        } catch (err) {
            setToast({ message: err.message || "Invalid login or password", type: "error" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div id="login-page">
            <main>
                <h1>BackOffice</h1>
                <form id="loginForm" onSubmit={handleSubmit} noValidate>
                    <div>
                        <label htmlFor="login">Login</label>
                        <input
                            id="login"
                            type="text"
                            placeholder="Login"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div>
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                </form>
                <button type="submit" form="loginForm" disabled={loading}>
                    {loading ? "Logging in..." : "Log in"}
                </button>
            </main>
            <footer>
                <small>Engineering thesis project - Białystok University of Technology</small>
                <small>&copy; 2025 Michał Grochowski</small>
            </footer>
            {toast && (
            <MessageBox
                message={toast.message}
                type={toast.type}
                duration={2500}
                onClose={() => setToast(null)}
            />)}
        </div>
    );
}