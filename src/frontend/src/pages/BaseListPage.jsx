import React, { useState, useEffect } from "react";
import "../styles/PagesStyles/baseListPage.css";

export default function BaseListPage({
    title,
    columns = [],
    data = [],
    loading = false,
    onAdd,
    onEdit,
    onDelete,
    onToggleFilters,
    onSearchChange,
    searchValue = "",
    onClearSelection,
}) {
    const [selectedRow, setSelectedRow] = useState(null);

    useEffect(() => {
        if (data.length > 0 && !selectedRow) setSelectedRow(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    // expose clear function to parent
    useEffect(() => {
        if (onClearSelection) onClearSelection(() => setSelectedRow(null));
    }, [onClearSelection]);

    return (
        <div className="base-list-wrapper">
            <div className="base-list-container">
                {/* === LEFT SIDEBAR === */}
                <aside className="sidebar">
                    {/* Search */}
                    <div className="search-panel">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchValue}
                            onChange={(e) => onSearchChange?.(e.target.value)} // 👈 update query on typing
                        />
                        <div className="search-buttons">
                            <button className="btn-filter" onClick={() => onToggleFilters?.()}>
                                Filters
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="action-buttons">
                        <button onClick={onAdd} className="btn-action">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 5v14M5 12h14"/>
                            </svg>
                            Add
                        </button>

                        <button
                            onClick={() => selectedRow && onEdit?.(selectedRow)}
                            className={`btn-action ${!selectedRow ? "disabled" : ""}`}
                            disabled={!selectedRow}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 20h9M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/>
                            </svg>
                            Edit
                        </button>

                        <button
                            onClick={() => selectedRow && onDelete?.(selectedRow)}
                            className={`btn-action ${!selectedRow ? "disabled" : ""}`}
                            disabled={!selectedRow}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                <path fill="none" stroke="currentColor" strokeWidth="2" d="M3 6h18M8 6V4h8v2m-1 0v14H9V6h6z"/>
                            </svg>
                            Delete
                        </button>
                    </div>

                    {/* === DETAILS PANEL === */}
                    <div className="details-panel">
                        {selectedRow ? (
                            <>
                                <h3>Details</h3>
                                <ul>
                                    {Object.entries(selectedRow).map(([key, value]) => {
                                        const column = columns.find(c => c.key === key);
                                        const label =
                                            column?.label ||
                                            key
                                                .replace(/([A-Z])/g, " $1")
                                                .replace(/^./, s => s.toUpperCase());
                                        return (
                                            <li key={key}>
                                                <strong>{label}:</strong> {String(value) || "—"}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        ) : (
                            <p className="details-placeholder">
                                Select an item from the list to view details.
                            </p>
                        )}
                    </div>
                </aside>

                {/* === MAIN TABLE SECTION === */}
                <main className="list-section">
                    <h2>{title} List</h2>

                    <table className="data-table">
                        <thead>
                            <tr>
                                {columns.map((col, i) => (
                                    <th key={i}>{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.length > 0 ? (
                                data.map((row, i) => (
                                    <tr
                                        key={i}
                                        className={selectedRow === row ? "selected" : ""}
                                        onClick={() => setSelectedRow(row)}
                                    >
                                        {columns.map((col, j) => (
                                            <td key={j}>{row[col.key]}</td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="no-data">
                                        No data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </main>
            </div>

            {loading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                </div>
            )}
        </div>
    );
}
