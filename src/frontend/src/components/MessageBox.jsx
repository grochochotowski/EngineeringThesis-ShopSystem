import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import "../styles/ComponentsStyles/messageBox.css";

export default function MessageBox({ message, type = "success", duration = 3000, onClose, className = "" }) {
    const [visible, setVisible] = useState(true);
    const [progress, setProgress] = useState(100);

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

       return (
        <div
            role="status"
            aria-live={type === "error" ? "assertive" : "polite"}
            className={`message-box ${type} ${visible ? "show" : "hide"} ${className}`}
        >
            <div className={`icon icon-${type}`} aria-hidden="true"></div>
            <div className="text">{message}</div>
            <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
    );
}


MessageBox.propTypes = {
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(["success", "error", "info"]),
    duration: PropTypes.number,
    onClose: PropTypes.func,
};
