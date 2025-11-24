import React from "react";
import "../styles/ComponentsStyles/confirmDialog.css";

export default function ConfirmDialog({
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    confirmButtonClass = "dialog-btn-confirm-negative",
}) {
    return (
        <div className="confirm-overlay" onClick={onCancel}>
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
                <h3>{title}</h3>
                <p>{message}</p>
                <div className="confirm-actions">
                    <button className="btn-cancel" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button className={confirmButtonClass} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
