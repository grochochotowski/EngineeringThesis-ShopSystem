import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/error.css";

const NotFound = () => {
    const navigate = useNavigate();
    
    return (
        <div className="error-container">
            <div className="error-content">
                <h1 style={{ color: "var(--accent-main)" }}>404</h1>
                <h2>Page Not Found</h2>
                <p>The page you are looking for does not exist.</p>
                <button onClick={() => navigate("/dashboard")}>
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default NotFound;
