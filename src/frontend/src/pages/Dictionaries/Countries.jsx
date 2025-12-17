import React, { useMemo } from "react";
import { getCountriesArray } from "../../data/countries";
import Header from "../../components/Header";
import "../styles/dictionaryPages.css";

export default function Countries() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortColumn, setSortColumn] = React.useState("name");
  const [sortDirection, setSortDirection] = React.useState("asc");

  // Get countries as array
  const countriesData = useMemo(() => getCountriesArray(), []);

  // Filter and sort data client-side - instant, no delay
  const processedData = useMemo(() => {
    let data = [...countriesData];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter((item) => item.name.toLowerCase().includes(query));
    }

    // Apply sorting
    if (sortColumn) {
      data.sort((a, b) => {
        const aVal = String(a[sortColumn]).toLowerCase();
        const bVal = String(b[sortColumn]).toLowerCase();
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return data;
  }, [countriesData, searchQuery, sortColumn, sortDirection]);

  const columns = [
    { key: "id", label: "ID", width: "15%", sortable: true },
    { key: "name", label: "Country Name", width: "85%", sortable: true },
  ];

  const handleSort = (column) => {
    const colDef = columns.find((c) => c.key === column);
    if (!colDef || colDef.sortable === false) return;

    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const currentUser = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="page-container">
      <Header
        user={currentUser}
        onLogout={() => {
          localStorage.clear();
          window.location.href = "/";
        }}
      />
      <main className="page-content">
        <div className="dictionary-wrapper">
          {/* Left Sidebar - Search Only */}
          <aside className="dictionary-sidebar">
            <div className="search-panel">
              <input
                type="text"
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </aside>

          {/* Main Table Section */}
          <main className="dictionary-main">
            <h2>Countries</h2>

            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      onClick={() => col.sortable && handleSort(col.key)}
                      className={col.sortable ? "sortable" : ""}
                    >
                      {col.label}
                      {col.sortable && sortColumn === col.key && (
                        <span className="sort-arrow">
                          {sortDirection === "asc" ? " ▲" : " ▼"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processedData.length > 0 ? (
                  processedData.map((row, i) => (
                    <tr key={i}>
                      {columns.map((col) => (
                        <td key={col.key}>{row[col.key]}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="no-data">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </main>
        </div>
      </main>
    </div>
  );
}
