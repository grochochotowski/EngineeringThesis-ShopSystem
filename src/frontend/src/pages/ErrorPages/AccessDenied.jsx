import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/error.css";

const AccessDenied = () => {
    const navigate = useNavigate();

    return (
        <div className="error-container">
            <div className="error-content">
                <h1 style={{ color: "var(--btn-danger-bg)" }}>403</h1>
                <h2>Access Denied</h2>
                <p>You don’t have permission to view this page.</p>
                <button onClick={() => navigate("/dashboard")}>
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default AccessDenied;
