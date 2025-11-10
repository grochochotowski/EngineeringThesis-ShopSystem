import React from "react";
import { Navigate } from "react-router-dom";

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

const ProtectedRoute = ({ userRole, requiredRole, children }) => {
    const userRank = roleHierarchy[userRole] ?? 0;
    const requiredRank = roleHierarchy[requiredRole] ?? 0;

    if (userRank < requiredRank) {
        return <Navigate to="/403" replace />;
    }

    return children;
};

export default ProtectedRoute;
