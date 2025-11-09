import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import MessageBox from "../components/MessageBox";
import "../styles/login.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();

        if (!login.trim() || !password) {
            setToast({ message: "Email and password are required.", type: "error" });
            return;
        }

        // 🔹 symulacja logowania bez backendu
        setLoading(true);
        setTimeout(() => {
            if (login === "admin" && password === "admin") {
                // przykładowy „sukces”
                localStorage.setItem("authToken", "fakeToken123");
                setToast({ message: "Login successful!", type: "success" });
                setTimeout(() => navigate("/"), 1000);
            } else {
                // przykładowy „błąd logowania”
                setToast({ message: "Invalid login or password", type: "error" });
            }
            setLoading(false);
        }, 1000); // symulacja krótkiego opóźnienia
    }

    return (
        <div id="login-page">
            <main>
                <h1>BackOffice</h1>
                <form onSubmit={handleSubmit} noValidate>
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
                            placeholder="Passowrd"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                </form>
                <button onClick={handleSubmit} disabled={loading}>
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