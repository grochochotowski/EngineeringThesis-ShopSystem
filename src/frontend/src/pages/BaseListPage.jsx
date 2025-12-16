import React from "react";
import "../styles/PagesStyles/baseListPage.css";

const RenderDetails = ({ detailsConfig, detailsData }) => {
    if (!detailsData) {
        return <p className="details-placeholder">Select an item to view details.</p>;
    }

    const effectiveDetailsConfig = detailsConfig || {
        status: null,
        fields: Object.keys(detailsData).map(key => ({
            key: key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            isColumn: false,
        }))
    };

    return (
        <>
            <div className="title-details-row">
                <h3>Details</h3>
                {effectiveDetailsConfig.status && (
                    effectiveDetailsConfig.status.render ? (
                        effectiveDetailsConfig.status.render(detailsData)
                    ) : (
                        <div className={detailsData[effectiveDetailsConfig.status.key] ? "badge status-active" : "badge status-inactive"}>
                            {detailsData[effectiveDetailsConfig.status.key] ? effectiveDetailsConfig.status.activeLabel : effectiveDetailsConfig.status.inactiveLabel}
                        </div>
                    )
                )}
            </div>
            <ul>
                {effectiveDetailsConfig.fields.map((field, index) => {
                    // Use custom renderer if provided, otherwise format the value
                    const renderValue = () => {
                        if (field.render) {
                            return field.render(detailsData);
                        }
                        
                        let fieldValue = detailsData[field.key];
                        if (field.key === "price" && typeof fieldValue === "number") {
                            fieldValue = fieldValue.toFixed(2);
                        }
                        if (field.key === "defective" && fieldValue !== undefined) {
                            fieldValue = fieldValue ? "Yes" : "No";
                        }
                        if (field.key === "isActive" && fieldValue !== undefined) {
                            fieldValue = fieldValue ? "Yes" : "No";
                        }
                        return fieldValue ?? "—";
                    };

                    const listClass = field.isColumn ? "list-column" : "list-row";

                    if (field.isColumn) {
                        return (
                            <li key={index} className={listClass}>
                                <div className="top">
                                    <strong className="detail-label">{field.label}:</strong>
                                    {!(field.key === "description") && ( // Only render value if not description
                                        <span className={`detail-value ${field.className || ""}`}>{renderValue()}</span>
                                    )}
                                </div>
                                {field.key === "defective" && detailsData.defective && (
                                    <span className="description detail-value">
                                        {detailsData.defectDescription || "—"}
                                    </span>
                                )}
                                {field.key === "description" && (
                                    <span className="description detail-value">
                                        {detailsData.description || "—"}
                                    </span>
                                )}
                            </li>
                        );
                    } else {
                        return (
                            <li key={index} className={listClass}>
                                <strong className="detail-label">{field.label}</strong>
                                <span className={`detail-value ${field.className || ""}`}> {renderValue()}</span>
                            </li>
                        );
                    }
                })}
            </ul>
        </>
    );
};

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
    onSort,
    sortColumn,
    sortDirection,
    searchValue = "",
    detailsData,
    detailsConfig,
    deleteButtonLabel = "Delete",
    deleteButtonIcon,
    deleteButtonClass = "",
    selectedRow,
    onChangePassword,
    changePasswordButtonLabel = "Change Password",
    changePasswordButtonClass = "",
    changePasswordButtonIcon,
    changePasswordDisabled = false,
    onChangeLogin,
    changeLoginButtonLabel = "Change Login",
    changeLoginButtonClass = "",
    changeLoginButtonIcon,
    changeLoginDisabled = false,
    disableAdd = false,
    disableEdit = false,
    disableDelete = false,
    hideAddButton = false,
    hideEditButton = false,
    hideDeleteButton = false,
}) {
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
                        {onToggleFilters && (
                            <div className="search-buttons">
                                <button className="btn-filter" onClick={(e) => { e.stopPropagation(); onToggleFilters();}}>
                                    Filters
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="action-buttons">
                        {!hideAddButton && (
                            <button
                                onClick={!disableAdd ? onAdd : undefined}
                                className={`btn-action btn-add ${disableAdd ? "disabled" : ""}`}
                                disabled={disableAdd}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 5v14M5 12h14"/>
                                </svg>
                                Add
                            </button>
                        )}

                        {!hideEditButton && (
                            <button
                                onClick={() => !disableEdit && selectedRow && onEdit?.(selectedRow)}
                                className={`btn-action btn-edit ${(!selectedRow || disableEdit) ? "disabled" : ""}`}
                                disabled={!selectedRow || disableEdit}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 20h9M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z"/>
                                </svg>
                                Edit
                            </button>
                        )}

                        {onChangePassword && (
                            <button
                                onClick={() => selectedRow && !changePasswordDisabled && onChangePassword?.(selectedRow)}
                                className={`btn-action ${changePasswordButtonClass} ${(!selectedRow || changePasswordDisabled) ? "disabled" : ""}`}
                                disabled={!selectedRow || changePasswordDisabled}
                            >
                                {changePasswordButtonIcon || (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 3l4 4-9 9-4 1 1-4 9-9zm3 9h6"/>
                                    </svg>
                                )}
                                {changePasswordButtonLabel}
                            </button>
                        )}

                        {onChangeLogin && (
                            <button
                                onClick={() => selectedRow && !changeLoginDisabled && onChangeLogin?.(selectedRow)}
                                className={`btn-action ${changeLoginButtonClass} ${(!selectedRow || changeLoginDisabled) ? "disabled" : ""}`}
                                disabled={!selectedRow || changeLoginDisabled}
                            >
                                {changeLoginButtonIcon || (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="none" stroke="currentColor" strokeWidth="2" d="M5 5h14v14H5zM9 9h6v6H9z"/>
                                    </svg>
                                )}
                                {changeLoginButtonLabel}
                            </button>
                        )}

                        {!hideDeleteButton && (
                            <button
                                onClick={() => !disableDelete && selectedRow && onDelete?.(selectedRow)}
                                className={`btn-action ${deleteButtonClass} ${(!selectedRow || disableDelete) ? "disabled" : ""}`}
                                disabled={!selectedRow || disableDelete}
                            >
                                {deleteButtonIcon || (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="none" stroke="currentColor" strokeWidth="2" d="M3 6h18M8 6V4h8v2m-1 0v14H9V6h6z"/>
                                    </svg>
                                )}
                                {deleteButtonLabel}
                            </button>
                        )}
                    </div>

                    {/* === DETAILS PANEL === */}
                    <div className="details-panel">
                        <RenderDetails detailsConfig={detailsConfig} detailsData={detailsData} />
                    </div>
                </aside>

                {/* === MAIN TABLE SECTION === */}
                <main className="list-section">
                    <h2>{title} List</h2>

                    <table className="data-table">
                        <thead>
                            <tr>
                                {columns.map((col, i) => {
                                    const sortable = col.sortable !== false && !!onSort;
                                    return (
                                        <th 
                                            key={i} 
                                            onClick={() => sortable && onSort?.(col.key)}
                                            className={`${sortable ? "sortable" : ""} ${sortable && sortColumn === col.key ? 'sorted' : ''}`}
                                            style={{ width: col.width, cursor: sortable ? "pointer" : "default" }}
                                        >
                                            {col.label}
                                            {sortable && sortColumn === col.key && (
                                                <span className={`sort-arrow ${sortDirection === 'asc' ? 'asc' : 'desc'}`}>
                                                    {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                                                </span>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {data.length > 0 ? (
                                data.map((row, i) => (
                                    <tr
                                        key={i}
                                        className={selectedRow?.id === row.id ? "selected" : ""}
                                        onClick={() => onSelectRow?.(row)}
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
