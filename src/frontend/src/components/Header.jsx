import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ComponentsStyles/header.css";

export default function Header({ user, onLogout }) {
    const [openMenu, setOpenMenu] = useState(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const menuRef = useRef(null);
    const userRef = useRef(null);
    const navigate = useNavigate();

    // === MENU STRUCTURE ===
    const menuStructure = [
        {
            title: "Sales",
            items: [
                { name: "POS", path: "/pos" },
                { name: "Sales documents", path: "/sales/documents" },
                { name: "Reports", path: "/reports" },
            ],
        },
        {
            title: "Storage",
            items: [
                { name: "Warehouse Products", path: "/storage/products" },
                { name: "Warehouse", path: "/storage/warehouses" },
            ],
        },
        {
            title: "Shipments",
            items: [
                { name: "Incoming", path: "/shipments/incoming" },
                { name: "Leaving", path: "/shipments/leaving" },
            ],
        },
        {
            title: "Organization",
            items: [
                { name: "Products", path: "/organization/products" },
                { name: "Users", path: "/organization/users" },
                { name: "Clients", path: "/organization/clients" },
                { name: "Addresses", path: "/organization/addresses" },
                { name: "Categories", path: "/organization/categories" },
                { name: "Tax Rates", path: "/organization/tax-rates" },
            ],
        },
        {
            title: "Dictionaries",
            items: [
                { name: "Client Types", path: "/dictionaries/client-types" },
                { name: "Payment Options", path: "/dictionaries/payment-options" },
                { name: "Sales Document Types", path: "/dictionaries/sales-document-types" },
                { name: "Shipment Statuses", path: "/dictionaries/shipment-statuses" },
                { name: "Shipment Types", path: "/dictionaries/shipment-types" },
                { name: "User Roles", path: "/dictionaries/user-roles" },
                { name: "Countries", path: "/dictionaries/countries" },
            ],
        },
        {
            title: "Events",
            items: [
                { name: "Events", path: "/events" },
            ],
        },
    ];

    // === Toggle dropdown ===
    const toggleMenu = (index) => {
        setOpenMenu(openMenu === index ? null : index);
    };

    // === Toggle user modal ===
    const toggleUserModal = () => {
        setIsUserModalOpen((prev) => !prev);
    };

    // === Close menus when clicking outside ===
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target) &&
                userRef.current &&
                !userRef.current.contains(e.target)
            ) {
                setOpenMenu(null);
                setIsUserModalOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // === Navigation ===
    const handleNavigate = (path) => {
        navigate(path);
        setOpenMenu(null);
    };

    const handleHomeClick = () => navigate("/dashboard");

    return (
        <header className="main-header">
            <div className="nav-left" ref={menuRef}>
                {/* === HOME BUTTON === */}
                <button className="home-btn" onClick={handleHomeClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                </button>

                {/* === MENU === */}
                {menuStructure.map((menu, i) => (
                    <div key={i} className="nav-item">
                        <button onClick={() => toggleMenu(i)}>{menu.title}</button>

                        {openMenu === i && (
                            <div className="dropdown">
                                {menu.items.map((item, j) =>
                                    item.sub ? (
                                        <div key={j} className="dropdown-submenu">
                                            <button className="submenu-title">{item.name}</button>
                                            {item.sub.map((sub, k) => (
                                                <button key={k} onClick={() => handleNavigate(sub.path)}>
                                                    {sub.name}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <button key={j} onClick={() => handleNavigate(item.path)}>
                                            {item.name}
                                        </button>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* === USER MENU === */}
            <div className="nav-right" ref={userRef}>
                <button onClick={toggleUserModal} className="user">
                    {user?.name || "User"}
                </button>

                {isUserModalOpen && (
                    <div className="user-modal">
                        <h4>Do you want to sign out?</h4>
                        <button className="logout" onClick={onLogout}>
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
