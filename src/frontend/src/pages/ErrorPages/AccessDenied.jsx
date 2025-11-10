import React from "react";
import "../../styles/ErrorStyles/error.css";

const AccessDenied = () => {
    return (
        <div className="error-container">
            <div className="error-content">
                <h1 style={{ color: "var(--btn-danger-bg)" }}>403</h1>
                <h2>Access Denied</h2>
                <p>You don’t have permission to view this page.</p>
                <button onClick={() => (window.location.href = "/dashboard")}>
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default AccessDenied;
