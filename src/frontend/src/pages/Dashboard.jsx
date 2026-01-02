import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PagesStyles/dashboard.css";
import { FaShoppingCart, FaWarehouse, FaTruckLoading, FaTruckMoving, FaCalendarAlt, FaCashRegister, FaBoxes, FaFileImport, FaFileExport, FaClipboardList, FaFileInvoice } from 'react-icons/fa';

import Fallback from "../components/Fallback";
import Header from "../components/Header";

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
    }, []);

    function handleLogout() {
        localStorage.clear();
        navigate("/");
    }

    const quickActions = [
        { name: "POS", icon: <FaCashRegister />, path: "/pos" },
        { name: "Sales Documents", icon: <FaFileInvoice />, path: "/sales/documents" },
        { name: "Warehouse Products", icon: <FaBoxes />, path: "/storage/products" },
        { name: "Incoming Shipments", icon: <FaFileImport />, path: "/shipments/incoming" },
        { name: "Leaving Shipments", icon: <FaFileExport />, path: "/shipments/leaving" },
        { name: "Events", icon: <FaClipboardList />, path: "/events" },
    ];

    // === If user data is not loaded yet ===
    if (!user) return <Fallback text="Loading dashboard..." />;

    // === Main dashboard layout ===
    return (
        <div id="dashboard">
            <Header user={user} onLogout={handleLogout} />

            <main>
                <div className="quick-options">
                    {quickActions.map((action, index) => (
                        <div key={index} className="option-card" onClick={() => navigate(action.path)}>
                            {action.icon}
                            <p>{action.name}</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
