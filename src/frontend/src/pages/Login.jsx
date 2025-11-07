import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
    const navigate = useNavigate();
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!login.trim() || !password) {
            setError("Email and password are required.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login, password }),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => null);
                throw new Error(errBody?.message || `Request failed: ${res.status}`);
            }

            const data = await res.json();
            // adjust according to your backend response (e.g. data.token)
            if (data.token) {
                localStorage.setItem("authToken", data.token);
            }
            // optionally store user info
            if (data.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
            }

            // navigate to protected route after login
            navigate("/");
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main>
            <h1>Login</h1>
            <form onSubmit={handleSubmit} noValidate>
                <div>
                    <label htmlFor="login">Login</label>
                    <input
                        id="login"
                        type="text"
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                </div>

                {error && (
                    <div role="alert" aria-live="polite">
                        {error}
                    </div>
                )}

                <button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Log in"}
                </button>
            </form>
        </main>
    );
}