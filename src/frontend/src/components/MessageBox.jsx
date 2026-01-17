import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import "../styles/ComponentsStyles/messageBox.css";

export default function MessageBox({ message, type = "success", duration = 3000, onClose, className = "" }) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(true);
    const [progress, setProgress] = useState(100);

    // Trigger mount animation after first render
    useEffect(() => {
        const timer = requestAnimationFrame(() => {
            setMounted(true);
        });
        return () => cancelAnimationFrame(timer);
    }, []);

    useEffect(() => {
        if (!duration || duration <= 0) return;
        let start = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - start;
            const percentage = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(percentage);
            if (elapsed >= duration) {
                clearInterval(interval);
                setVisible(false);
            }
        }, 30);

        return () => clearInterval(interval);
    }, [duration]);

    useEffect(() => {
        if (!visible) {
            const t = setTimeout(() => {
                if (typeof onClose === "function") onClose();
            }, 200);
            return () => clearTimeout(t);
        }
    }, [visible, onClose]);

    // Icon renderer based on message type - using simple text characters for reliability
    const renderIcon = () => {
        switch (type) {
            case "success":
                return "✓";
            case "error":
                return "✕";
            case "info":
                return "ℹ";
            case "warning":
                return "!";
            default:
                return null;
        }
    };

    const isVisible = mounted && visible;
    const baseStyle = {
        position: 'relative',
        width: 'fit-content',
        maxWidth: '480px',
        minWidth: '260px',
        padding: '12px 14px 18px 14px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '10px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        pointerEvents: 'auto',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
    };

    const typeStyles = {
        success: { backgroundColor: '#e6fffa', border: '1px solid #22543d', color: '#22543d' },
        error: { backgroundColor: '#fff5f5', border: '1px solid #742a2a', color: '#742a2a' },
        info: { backgroundColor: '#ebf8ff', border: '1px solid #1e3a8a', color: '#1e3a8a' },
        warning: { backgroundColor: '#fffbea', border: '1px solid #744210', color: '#744210' },
    };

    return (
        <div
            role="status"
            aria-live={type === "error" ? "assertive" : "polite"}
            className={`message-box ${type} ${visible ? "show" : "hide"} ${className}`}
            style={{ ...baseStyle, ...typeStyles[type] }}
        >
            <div className={`icon icon-${type}`} aria-hidden="true" style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                {renderIcon()}
            </div>
            <div className="text" style={{ flex: 1, fontSize: '14px', lineHeight: '1.4', wordBreak: 'break-word' }}>{message}</div>
            <div className="progress-bar" style={{ position: 'absolute', left: 0, bottom: 0, height: '4px', width: `${progress}%`, background: 'currentColor', opacity: 0.6 }} />
        </div>
    );
}


MessageBox.propTypes = {
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(["success", "error", "info", "warning"]),
    duration: PropTypes.number,
    onClose: PropTypes.func,
    className: PropTypes.string,
};
