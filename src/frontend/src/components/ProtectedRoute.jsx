import React from "react";
import AccessDenied from "../pages/ErrorPages/AccessDenied";

const roleHierarchy = {
    Unspecified: 0,
    ShopAssistant: 1,
    Marketer: 2,
    ItTechnician: 3,
    DeputyManager: 4,
    Manager: 5,
    CEO: 6,
    Admin: 7,
    Root: 8,
};

const ProtectedRoute = ({ requiredRole, children }) => {
    // Get user role dynamically from localStorage (not from props)
    let userRole = null;
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        userRole = user?.role || null;
    } catch {
        userRole = null;
    }

    let userRank = 0;
    const requiredRank = roleHierarchy[requiredRole] ?? 0;

    // Try parse number or string name
    if (!isNaN(userRole)) {
        userRank = parseInt(userRole, 10);
    } else {
        userRank = roleHierarchy[userRole] ?? 0;
    }

    if (userRank < requiredRank) {
        return <AccessDenied />;
    }

    return children;
};

export default ProtectedRoute;
