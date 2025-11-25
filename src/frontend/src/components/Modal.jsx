import React, { useEffect } from "react";
import "../styles/ComponentsStyles/modal.css";

export default function Modal({ title, children, onClose, wide = false }) {
    // Close on ESC
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-container ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <h3>{title}</h3>
                    <button className="btn-close" onClick={onClose}>×</button>
                </header>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
}
