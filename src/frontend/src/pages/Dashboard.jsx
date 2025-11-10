import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PagesStyles/dashboard.css";

import Fallback from "../components/Fallback";

export default function Dashboard() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    const menuRef = useRef(null);

    //  === Load user data on mount ===
    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
    }, []);

    // === Close dropdown when clicking outside ===
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // === Toggle menu visibility ===
    const toggleMenu = (index) => {
        setOpenMenu(openMenu === index ? null : index);
    };

    // === Open/Close user modal ===
    const toggleUserModal = () => {
        setIsUserModalOpen((prev) => !prev);
    };

    // === Logout ===
    const handleLogout = () => {
        localStorage.clear();
        navigate("/");
    };

    // === If user data is not loaded yet ===
    if (!user) return <Fallback text="Loading dashboard..." />;

    // === Main dashboard layout ===
    return (
        <div id="dashboard">
            <header>
                <div className="nav-left" ref={menuRef}>
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
                <div className="nav-right">
                    <button onClick={toggleUserModal} className="user">
                        {user.name}
                    </button>
                </div>
            </header>

            <main>
                <section>
                    <div className="quick-options">
                        {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="option-card">
                            <div className="icon" />
                            <p>Option name</p>
                        </div>
                    ))}
                    </div>
                    <div className="summary-card">
                        <div className="summary-text">
                            <h4>Today's earnings</h4>
                            <p className="value">5463 zł</p>
                            <h4>Today's plan</h4>
                            <p className="value">8000 zł</p>
                        </div>
                        <p>📊 Chart placeholder</p>
                    </div>
                </section>
                <section>
                    <div className="messages">
                        <ul>
                            <li className="info">
                                <span>01-02-2025</span> This is information
                            </li>
                            <li className="error">
                                <span>01-02-2025</span> This is warning
                            </li>
                            <li className="warning">
                                <span>01-02-2025</span> Action required
                            </li>
                            <li className="info">
                                <span>01-02-2025</span> This is information
                            </li>
                            <li className="info">
                                <span>01-02-2025</span> This is information
                            </li>
                            <li className="warning">
                                <span>01-02-2025</span> Action required
                            </li>
                        </ul>
                    </div>
                </section>
            </main>
            {/* === USER MODAL === */}
            {isUserModalOpen && (
                <div
                    className="modal-backdrop"
                    onClick={() => setIsUserModalOpen(false)}
                >
                    <div
                        className="modal user-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>Confirm logout</h3>
                        <button className="logout-btn" onClick={handleLogout}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="logout-icon">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
