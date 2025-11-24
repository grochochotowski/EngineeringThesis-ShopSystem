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
    onSelectRow,
    searchValue = "",
    onClearSelection,
    detailsData,
}) {
    const [selectedRow, setSelectedRow] = useState(null);

    // save and restore selection
     useEffect(() => {
        if (onClearSelection) {
            onClearSelection((restoreId) => {
                if (!restoreId) return setSelectedRow(null);
                const found = data.find((r) => r.id === restoreId);
                if (found) setSelectedRow(found);
            });
        }
    }, [onClearSelection, data]);

    // clear selection if data changes or selected row is gone
    useEffect(() => {
        if (selectedRow && !data.some((r) => r.id === selectedRow.id)) {
            setSelectedRow(null);
        }
    }, [data, selectedRow]);

    // --- Render ---
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
                            onChange={(e) => onSearchChange?.(e.target.value)}
                        />
                        <div className="search-buttons">
                            <button className="btn-filter" onClick={(e) => { e.stopPropagation(); onToggleFilters?.()}}>
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
                    {detailsData  ? (
                        <>
                        <div className="title-details-row">
                            <h3>Details</h3>
                            <div className={detailsData.isActive ? "badge status-active" : "bbadge status-inactive"}>
                                {detailsData.isActive ? "Active" : "Inactive"}
                            </div>
                        </div>
                        <ul>
                            <li><strong>Id:</strong> {detailsData.id}</li>
                            <li><strong>SKU:</strong> {detailsData.sku}</li>
                            <li><strong>Name:</strong> {detailsData.name}</li>
                            <li><strong>Price:</strong> {detailsData.price}</li>
                            <li><strong>Category:</strong> {detailsData.categoryId}</li>
                            <li><strong>Tax Rate:</strong> {detailsData.taxRateId ?? "—"}</li>
                            <li className="list-column">
                                <div className="top">
                                    <strong>Defective:</strong>
                                    {detailsData.defective ? "Yes" : "No"}
                                </div>
                                {detailsData.defective && (
                                    <span className="description">
                                    {detailsData.defectDescription || "—"}
                                    </span>
                                )}
                            </li>
                            <li className="list-column">
                                <div className="top">
                                    <strong>Description:</strong>
                                </div>
                                <span className="description">
                                    {detailsData.description || "—"}
                                </span>
                            </li>
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
                                        className={selectedRow?.id === row.id ? "selected" : ""}
                                        onClick={() => {
                                            setSelectedRow(row);
                                            onSelectRow?.(row);
                                        }}
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
