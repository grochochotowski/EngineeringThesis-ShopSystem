import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/apiClient';
import Header from '../../components/Header';
import MessageBox from '../../components/MessageBox';
import '../../styles/PagesStyles/organizationPages.css';

const GiftCards = () => {
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [searchCode, setSearchCode] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  const fetchGiftCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        PageNumber: currentPage,
        PageSize: pageSize,
      };

      if (searchCode) {
        params.code = searchCode;
      }

      if (filterStatus !== 'all') {
        params.isActive = filterStatus === 'active';
      }

      const response = await api.get('/GiftCard', { params });
      setGiftCards(response.items || []);
      setTotalCount(response.totalCount || 0);
    } catch (error) {
      console.error('Error fetching gift cards:', error);
      setToast({ type: 'error', message: 'Failed to load gift cards' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchCode, filterStatus]);

  useEffect(() => {
    fetchGiftCards();
  }, [fetchGiftCards]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleResetFilters = () => {
    setSearchCode('');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="page-container">
      <Header />
      {toast && (
        <MessageBox
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="content-wrapper">
        <div className="main-content">
          <div className="org-page-header">
            <h1>Gift Cards</h1>
          </div>

          {loading && giftCards.length === 0 ? (
            <div className="loading">Loading gift cards...</div>
          ) : (
            <>
              <div className="org-table-wrapper">
                <table className="org-table">
                  <thead>
                    <tr>
                      <th>Gift Card Number</th>
                      <th>Value</th>
                      <th>Date Issued</th>
                      <th>Valid Until</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftCards.length > 0 ? (
                      giftCards.map((card) => (
                        <tr key={card.id}>
                          <td className="code-cell">{card.code}</td>
                          <td className="amount-cell">${card.value.toFixed(2)}</td>
                          <td>{formatDate(card.dateIssued)}</td>
                          <td>{formatDate(card.dateValidUntil)}</td>
                          <td>
                            <span className={`status-badge ${card.isActive ? 'active' : 'inactive'}`}>
                              {card.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="no-data">
                          No gift cards found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {currentPage} of {totalPages} ({totalCount} total)
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="side-panel">
          <div className="filter-section">
            <h3>Search</h3>
            <div className="filter-group">
              <label htmlFor="searchCode">Gift Card Number</label>
              <input
                id="searchCode"
                type="text"
                value={searchCode}
                onChange={(e) => {
                  setSearchCode(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Enter gift card number..."
              />
            </div>
          </div>

          <div className="filter-section">
            <h3>Filter by Status</h3>
            <div className="filter-group">
              <label htmlFor="filterStatus">Status</label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <button className="btn-secondary btn-full-width" onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiftCards;
