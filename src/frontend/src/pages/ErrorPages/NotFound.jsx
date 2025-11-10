import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/ErrorStyles/notFound.css";

const NotFound = () => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate("/dashboard");
    };

    return (
        <div className="not-found-container">
            <div className="not-found-content">
                <h1>404</h1>
                <h2>Page Not Found</h2>
                <p>The page you are looking for does not exist or has been moved.</p>
                <button onClick={handleGoHome}>Back to Dashboard</button>
            </div>
        </div>
    );
};

export default NotFound;
