const API_BASE_URL = "https://localhost:7132/api";

export async function apiRequest(path, method = "GET", body = null, params = {}) {
    const token = localStorage.getItem("token");

    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}${path}${query ? `?${query}` : ""}`;

    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` }),
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);

        if (response.status === 401) {
            const refreshToken = localStorage.getItem("refreshToken");
            if (refreshToken) {
                try {
                    const refreshRes = await fetch(`${API_BASE_URL}/Auth/refresh`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ refreshToken }),
                    });

                    if (refreshRes.ok) {
                        const refreshData = await refreshRes.json();
                        localStorage.setItem("token", refreshData.accessToken);
                        return await apiRequest(path, method, body, params); // 🔁 ponów zapytanie
                    }
                } catch {
                    console.warn("⚠️ Refresh token failed, redirecting to login...");
                }
            }
            window.location.href = "/";
            return null;
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API error ${response.status}: ${text}`);
        }

        try {
            return await response.json();
        } catch {
            return await response.text();
        }
    } catch (error) {
        console.error("❌ API request failed:", error.message);
        throw error;
    }
}

// === Shortcuts ===
export const api = {
    get: (path, config = {}) => apiRequest(path, "GET", null, config.params || {}),
    post: (path, data) => apiRequest(path, "POST", data),
    put: (path, data) => apiRequest(path, "PUT", data),
    delete: (path) => apiRequest(path, "DELETE"),
};
