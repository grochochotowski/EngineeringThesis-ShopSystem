import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PagesStyles/dashboard.css";

import Fallback from "../components/Fallback";

export default function Dashboard() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);

    //  === Load user data on mount ===
    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
    }, []);

    // === Open user options ===
    function handleOpenOptions() {
        localStorage.clear();
        navigate("/");
    }

    // === Toogle menu visibility ===
    const toggleMenu = (index) => {
        setOpenMenu(openMenu === index ? null : index);
    };

    // === If user data is not loaded yet ===
    if (!user) return <Fallback text="Loading dashboard..." />;

    // === Main dashboard layout ===
    return (
        <div id="dashboard">
            <header>
                <div className="nav-left">
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
                    <button onClick={handleOpenOptions} className="user">
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
        </div>
    );
}
