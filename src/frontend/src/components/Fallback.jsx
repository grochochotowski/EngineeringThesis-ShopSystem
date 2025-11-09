import React from "react";
import "../styles/ComponentsStyles/fallback.css";

export default function Fallback({ text = "Loading..." }) {
    return (
        <div id="fallback">
            <div className="spinner"></div>
            <p>{text}</p>
        </div>
    );
}