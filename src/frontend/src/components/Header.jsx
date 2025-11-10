import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ComponentsStyles/header.css";

export default function Header({ user, onLogout }) {
    const [openMenu, setOpenMenu] = useState(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const menuRef = useRef(null);
    const userRef = useRef(null);
    const navigate = useNavigate();

    // === Toggle dropdown menu ===
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

    // === Navigate to home (/dashboard) ===
    const handleHomeClick = () => {
        navigate("/dashboard");
    };

    return (
        <header className="main-header">
            <div className="nav-left" ref={menuRef}>

                {/* === HOME BUTTON === */}
                <button className="home-btn" onClick={handleHomeClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                </button>

                {/* === NAVIGATION ITEMS === */}
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="nav-item">
                        <button onClick={() => toggleMenu(i)}>
                            Option {i + 1}
                        </button>

                        {openMenu === i && (
                            <div className="dropdown">
                                <button>Sub-option A</button>
                                <button>Sub-option B</button>
                                <button>Sub-option C</button>
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
