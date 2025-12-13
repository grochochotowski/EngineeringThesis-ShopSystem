import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import MessageBox from '../components/MessageBox';
import { api } from '../api/apiClient';
import '../styles/PagesStyles/pos.css';

export default function POS() {
  // User context
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = currentUser?.role || 0;

  // Mode management
  const [activeMode, setActiveMode] = useState('Sale'); // Sale, Returns, Exchange

  // Scanned products state
  const [scannedProducts, setScannedProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Product search autocomplete
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Sale mode state
  const [documentType, setDocumentType] = useState('Receipt'); // Receipt, Invoice
  const [selectedClient, setSelectedClient] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // null until selected
  const [payments, setPayments] = useState([]); // Array of { method: "Card"|"Cash"|"Gift Card", amount: number }
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [saleDocumentGenerated, setSaleDocumentGenerated] = useState(null);

  // Client selection modal
  const [showClientModal, setShowClientModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);
  const [selectedClientRow, setSelectedClientRow] = useState(null);

  // Client creation modal
  const [showClientCreateModal, setShowClientCreateModal] = useState(false);

  // Price change modal
  const [showPriceChangeModal, setShowPriceChangeModal] = useState(false);
  const [newPrice, setNewPrice] = useState('');

  // Returns mode state
  const [saleDocumentNumber, setSaleDocumentNumber] = useState('');
  const [saleDocumentLocked, setSaleDocumentLocked] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState(null);

  // Confirmation dialogs
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);

  // Toast messages
  const [toast, setToast] = useState(null);

  // Tax rates cache (for price calculations)
  const [taxRates, setTaxRates] = useState(new Map());

  // Load tax rates on mount
  useEffect(() => {
    const fetchTaxRates = async () => {
      try {
        const items = await api.get('/TaxRate');
        const taxMap = new Map();
        items.forEach(tax => taxMap.set(tax.id, tax));
        setTaxRates(taxMap);
      } catch (error) {
        console.error('Failed to load tax rates:', error);
      }
    };
    fetchTaxRates();
  }, []);

  // Product search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (productSearchQuery.trim().length === 0) {
      setProductSearchResults([]);
      setShowProductDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { items } = await api.get('/Products', {
          params: {
            q: productSearchQuery,
            PageSize: 20,
            isActive: true
          }
        });
        setProductSearchResults(items || []);
        setShowProductDropdown(true);
      } catch (error) {
        console.error('Product search failed:', error);
        setProductSearchResults([]);
      }
    }, 1000);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [productSearchQuery]);

  // Add product to scanned list
  const handleAddProduct = useCallback((product) => {
    // Check if product already in list
    const existingIndex = scannedProducts.findIndex(p => p.id === product.id);

    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...scannedProducts];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1
      };
      setScannedProducts(updated);
    } else {
      // Add new product
      setScannedProducts([...scannedProducts, {
        id: product.id,
        sku: product.sku,
        name: product.name,
        unitPrice: product.price,
        quantity: 1,
        taxRateId: product.taxRateId,
        taxRate: taxRates.get(product.taxRateId)?.rate || 0,
        taxCode: taxRates.get(product.taxRateId)?.code || ''
      }]);
    }

    setProductSearchQuery('');
    setShowProductDropdown(false);
  }, [scannedProducts, taxRates]);

  // Calculate totals
  const calculateTotals = useCallback((products) => {
    let subtotal = 0;
    let totalTax = 0;

    products.forEach(product => {
      const lineNet = product.unitPrice * product.quantity;
      const lineTax = lineNet * product.taxRate;
      subtotal += lineNet;
      totalTax += lineTax;
    });

    return {
      subtotal: subtotal.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalGross: (subtotal + totalTax).toFixed(2)
    };
  }, []);

  const totals = calculateTotals(scannedProducts);

  // Calculate total paid and remaining balance
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = parseFloat(totals.totalGross) - totalPaid;

  // Two separate flags for different purposes:
  const hasPayments = payments.length > 0; // Has any payment been made?
  const isFullyPaid = scannedProducts.length > 0 && remainingBalance <= 0; // Is transaction fully paid?

  const change = totalPaid > parseFloat(totals.totalGross) ? totalPaid - parseFloat(totals.totalGross) : 0;

  // Update payment amount when totals change
  useEffect(() => {
    if (scannedProducts.length > 0) {
      setPaymentAmount(Math.max(0, remainingBalance).toFixed(2));
    }
  }, [scannedProducts, remainingBalance]);

  // Handle product row selection
  const handleProductRowClick = (product) => {
    setSelectedProduct(product);
  };

  // Change price (Deputy Manager or higher)
  const handleChangePrice = () => {
    if (!selectedProduct) {
      setToast({ type: 'error', message: 'Please select a product first' });
      return;
    }

    if (userRole < 4) { // DeputyManager is role 4
      setToast({ type: 'error', message: 'Insufficient permissions to change price' });
      return;
    }

    setNewPrice(selectedProduct.unitPrice.toString());
    setShowPriceChangeModal(true);
  };

  const handlePriceChangeConfirm = () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      setToast({ type: 'error', message: 'Invalid price value' });
      return;
    }

    const updated = scannedProducts.map(p =>
      p.id === selectedProduct.id ? { ...p, unitPrice: price } : p
    );
    setScannedProducts(updated);
    setSelectedProduct({ ...selectedProduct, unitPrice: price });
    setShowPriceChangeModal(false);
    setToast({ type: 'success', message: 'Price updated successfully' });
  };

  // Client selection
  const handleOpenClientModal = () => {
    if (documentType === 'Receipt') return;
    setShowClientModal(true);
    fetchClients('');
  };

  const fetchClients = async (searchQuery) => {
    setClientsLoading(true);
    try {
      const { items } = await api.get('/Clients', {
        params: {
          q: searchQuery,
          PageSize: 50
        }
      });
      setClients(items || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
      setToast({ type: 'error', message: 'Failed to load clients' });
    } finally {
      setClientsLoading(false);
    }
  };

  const handleClientSearch = (e) => {
    const query = e.target.value;
    setClientSearchQuery(query);
    fetchClients(query);
  };

  const handleClientSelect = () => {
    if (!selectedClientRow) {
      setToast({ type: 'error', message: 'Please select a client' });
      return;
    }
    setSelectedClient(selectedClientRow);
    setShowClientModal(false);
    setToast({ type: 'success', message: `Client ${selectedClientRow.name} selected` });
  };

  // Remove payment handler
  const handleRemovePayment = (method) => {
    setPayments(prev => prev.filter(p => p.method !== method));
    setPaymentMethod(null);
    setToast({ type: 'success', message: `${method} payment removed` });
  };

  // Payment Step 1: Record a payment
  const handlePayClick = () => {
    // Validation
    if (scannedProducts.length === 0) {
      setToast({ type: 'error', message: 'Please add at least one product' });
      return;
    }

    if (!paymentMethod) {
      setToast({ type: 'error', message: 'Please select a payment method' });
      return;
    }

    if (documentType === 'Invoice' && !selectedClient) {
      setToast({ type: 'error', message: 'Please select a client for invoice' });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setToast({ type: 'error', message: 'Please enter a valid payment amount' });
      return;
    }

    // Update or add payment (allow repeated payments with same method)
    const existingIndex = payments.findIndex(p => p.method === paymentMethod);
    let allPayments;

    if (existingIndex !== -1) {
      // Update existing payment by adding to it
      const updated = [...payments];
      updated[existingIndex] = {
        ...updated[existingIndex],
        amount: updated[existingIndex].amount + amount
      };
      setPayments(updated);
      allPayments = updated;
    } else {
      // Add new payment
      const newPayment = { method: paymentMethod, amount };
      allPayments = [...payments, newPayment];
      setPayments(allPayments);
    }

    // Generate sale document (but don't save yet)
    const documentTypeEnum = documentType === 'Receipt' ? 1 : (selectedClient?.type === 0 ? 2 : 3);

    const createDto = {
      documentType: documentTypeEnum,
      issueDate: new Date().toISOString(),
      description: `POS ${documentType} - ${new Date().toLocaleString()}`,
      documentNumber: `POS-${Date.now()}`,
      clientId: documentType === 'Invoice' ? selectedClient?.id : null,
      items: scannedProducts.map(p => ({
        productId: p.id,
        productName: p.name,
        productSKU: p.sku,
        quantity: p.quantity,
        unitPriceNet: p.unitPrice,
        taxRateId: p.taxRateId
      })),
      payments: allPayments.map(payment => ({
        paymentOption: payment.method === 'Card' ? 1 : payment.method === 'Cash' ? 2 : 3, // 1=Card, 2=Cash, 3=GiftCard
        amount: payment.amount
      }))
    };

    setSaleDocumentGenerated(createDto);

    // Clear payment method selection and reset amount
    setPaymentMethod(null);
    const newRemaining = parseFloat(totals.totalGross) - allPayments.reduce((sum, p) => sum + p.amount, 0);
    setPaymentAmount(Math.max(0, newRemaining).toFixed(2));

    setToast({ type: 'success', message: `${paymentMethod} payment of $${amount.toFixed(2)} recorded` });
  };

  // Payment Step 2: Finalize transaction
  const handleFinishTransaction = () => {
    if (!isFullyPaid) {
      setToast({ type: 'error', message: 'Transaction is not fully paid' });
      return;
    }
    setShowFinishConfirm(true);
  };

  const handleFinishConfirm = async () => {
    try {
      if (!saleDocumentGenerated) {
        setToast({ type: 'error', message: 'No sale document to save' });
        return;
      }

      await api.post('/SalesDocuments', saleDocumentGenerated);

      setToast({ type: 'success', message: 'Transaction completed successfully!' });
      setShowFinishConfirm(false);

      // Reset entire state
      setScannedProducts([]);
      setSelectedProduct(null);
      setSelectedClient(null);
      setPaymentMethod(null);
      setPayments([]);
      setPaymentAmount(0);
      setSaleDocumentGenerated(null);
      setDocumentType('Receipt');
    } catch (error) {
      console.error('Failed to save transaction:', error);
      setToast({ type: 'error', message: `Transaction failed: ${error.message}` });
    }
  };

  // Returns mode
  const handleSaleDocumentSearch = async () => {
    if (!saleDocumentNumber.trim()) {
      setToast({ type: 'error', message: 'Please enter a sale document number' });
      return;
    }

    try {
      // Search by document number
      const { items } = await api.get('/SalesDocuments', {
        params: {
          q: saleDocumentNumber,
          PageSize: 1
        }
      });

      if (!items || items.length === 0) {
        setToast({ type: 'error', message: 'Sale document not found' });
        return;
      }

      const doc = items[0];

      // Fetch full document details
      const fullDoc = await api.get(`/SalesDocuments/${doc.id}`);

      // Convert to return items
      const returnableItems = fullDoc.items.map(item => ({
        ...item,
        returnQuantity: 0,
        maxQuantity: item.quantity
      }));

      setReturnItems(returnableItems);
      setSaleDocumentLocked(true);
      setToast({ type: 'success', message: 'Sale document loaded' });
    } catch (error) {
      console.error('Failed to load sale document:', error);
      setToast({ type: 'error', message: 'Failed to load sale document' });
    }
  };

  const handleReturnQuantityChange = (itemId, value) => {
    const qty = parseInt(value) || 0;
    const updated = returnItems.map(item =>
      item.id === itemId ? { ...item, returnQuantity: Math.min(qty, item.maxQuantity) } : item
    );
    setReturnItems(updated);
  };

  const handleProcessReturn = () => {
    const returningItems = returnItems.filter(item => item.returnQuantity > 0);

    if (returningItems.length === 0) {
      setToast({ type: 'error', message: 'Please specify return quantities' });
      return;
    }

    if (!refundMethod) {
      setToast({ type: 'error', message: 'Please select a refund method' });
      return;
    }

    setShowReturnConfirm(true);
  };

  const handleReturnConfirm = async () => {
    try {
      // For now, just show success (actual implementation would create return document)
      setToast({ type: 'success', message: 'Return processed successfully (placeholder)' });
      setShowReturnConfirm(false);

      // Reset returns state
      setSaleDocumentNumber('');
      setSaleDocumentLocked(false);
      setReturnItems([]);
      setRefundMethod(null);
    } catch (error) {
      console.error('Failed to process return:', error);
      setToast({ type: 'error', message: 'Return failed' });
    }
  };

  const calculateReturnTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    returnItems.forEach(item => {
      if (item.returnQuantity > 0) {
        const lineNet = item.unitPriceNet * item.returnQuantity;
        const taxRate = taxRates.get(item.taxRateId)?.rate || 0;
        const lineTax = lineNet * taxRate;
        subtotal += lineNet;
        totalTax += lineTax;
      }
    });

    return {
      subtotal: subtotal.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalGross: (subtotal + totalTax).toFixed(2)
    };
  };

  const returnTotals = calculateReturnTotals();

  return (
    <div className="pos-wrapper">
      <Header
        user={currentUser}
        onLogout={() => {
          localStorage.clear();
          window.location.href = "/";
        }}
      />

      <main className="pos-container">
        {/* Left Section */}
        <section className="pos-left-section">
          {/* Product Search (Sale mode only) */}
          {activeMode === 'Sale' && (
            <div className="pos-search-bar">
              <input
                type="text"
                placeholder="Search products by SKU or name..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                onFocus={() => productSearchResults.length > 0 && setShowProductDropdown(true)}
                disabled={hasPayments}
                className="pos-product-search"
              />
              {showProductDropdown && productSearchResults.length > 0 && (
                <div className="pos-product-dropdown">
                  {productSearchResults.map(product => (
                    <div
                      key={product.id}
                      className="pos-product-dropdown-item"
                      onClick={() => handleAddProduct(product)}
                    >
                      <div className="product-dropdown-name">{product.name}</div>
                      <div className="product-dropdown-details">
                        {product.sku} - ${product.price.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sale Document Search (Returns mode only) */}
          {activeMode === 'Returns' && (
            <div className="pos-search-bar">
              <input
                type="text"
                placeholder="Enter sale document number..."
                value={saleDocumentNumber}
                onChange={(e) => setSaleDocumentNumber(e.target.value)}
                disabled={saleDocumentLocked}
                onKeyDown={(e) => e.key === 'Enter' && handleSaleDocumentSearch()}
              />
              {!saleDocumentLocked && (
                <button
                  className="btn-search-document"
                  onClick={handleSaleDocumentSearch}
                >
                  Load
                </button>
              )}
            </div>
          )}

          {/* Scanned Products List (Sale mode) */}
          {activeMode === 'Sale' && (
            <>
              <div className="pos-list-header">
                <h3>Scanned Products</h3>
              </div>
              <div className={`pos-products-table-wrapper ${hasPayments ? 'disabled' : ''}`}>
                {scannedProducts.length === 0 ? (
                  <div className="pos-empty-message">No products scanned</div>
                ) : (
                  <table className="pos-products-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Tax</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedProducts.map(product => {
                        const lineNet = product.unitPrice * product.quantity;
                        const lineTax = lineNet * product.taxRate;
                        const lineGross = lineNet + lineTax;

                        return (
                          <tr
                            key={product.id}
                            className={selectedProduct?.id === product.id ? 'selected' : ''}
                            onClick={() => !hasPayments && handleProductRowClick(product)}
                          >
                            <td>{product.name}</td>
                            <td>{product.quantity}</td>
                            <td>${product.unitPrice.toFixed(2)}</td>
                            <td>{(product.taxRate * 100).toFixed(0)}%</td>
                            <td>${lineGross.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* Return Items List (Returns mode) */}
          {activeMode === 'Returns' && (
            <>
              <div className="pos-list-header">
                <h3>Return Items</h3>
              </div>
              <div className="pos-products-table-wrapper">
                {returnItems.length === 0 ? (
                  <div className="pos-empty-message">Load a sale document to begin return</div>
                ) : (
                  <table className="pos-products-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Orig Qty</th>
                        <th>Return Qty</th>
                        <th>Price</th>
                        <th>Refund</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map(item => {
                        const refund = item.unitPriceNet * item.returnQuantity;
                        const taxRate = taxRates.get(item.taxRateId)?.rate || 0;
                        const refundWithTax = refund + (refund * taxRate);

                        return (
                          <tr key={item.id}>
                            <td>{item.productName}</td>
                            <td>{item.quantity}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max={item.maxQuantity}
                                value={item.returnQuantity}
                                onChange={(e) => handleReturnQuantityChange(item.id, e.target.value)}
                                className="return-qty-input"
                              />
                            </td>
                            <td>${item.unitPriceNet.toFixed(2)}</td>
                            <td>${refundWithTax.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* Totals Section */}
          <div className="pos-totals">
            <div className="pos-totals-row">
              <span>Subtotal:</span>
              <span>${activeMode === 'Sale' ? totals.subtotal : returnTotals.subtotal}</span>
            </div>
            <div className="pos-totals-row">
              <span>Total Tax:</span>
              <span>${activeMode === 'Sale' ? totals.totalTax : returnTotals.totalTax}</span>
            </div>

            {/* Payment tracking rows (Sale mode only) */}
            {activeMode === 'Sale' && payments.length > 0 && (
              <>
                {payments.map((payment, index) => (
                  <div
                    key={index}
                    className="pos-totals-row pos-payment-row clickable"
                    onClick={() => handleRemovePayment(payment.method)}
                    title="Click to remove this payment"
                  >
                    <span>Paid with {payment.method}:</span>
                    <span>${payment.amount.toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}

            <div className="pos-totals-row pos-total-row">
              <span>Total:</span>
              <span>
                ${activeMode === 'Sale' ? totals.totalGross : returnTotals.totalGross}
                {activeMode === 'Sale' && payments.length > 0 && (
                  <span className={`remaining-amount ${remainingBalance <= 0 ? 'paid' : 'unpaid'}`}>
                    {' '}(Remaining: {remainingBalance < 0 ? '-' : ''}${Math.abs(remainingBalance).toFixed(2)})
                  </span>
                )}
              </span>
            </div>

            {/* Change display (Sale mode only, when overpaid) */}
            {activeMode === 'Sale' && change > 0 && (
              <div className="pos-totals-row change-row">
                <span>Change:</span>
                <span>${change.toFixed(2)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Right Section */}
        <section className="pos-right-section">
          {/* Mode Tabs */}
          <div className="pos-mode-tabs">
            <button
              className={activeMode === 'Sale' ? 'active' : ''}
              onClick={() => setActiveMode('Sale')}
            >
              Sale
            </button>
            <button
              className={activeMode === 'Returns' ? 'active' : ''}
              onClick={() => setActiveMode('Returns')}
            >
              Returns
            </button>
            <button
              className={activeMode === 'Exchange' ? 'active' : ''}
              disabled
              title="Coming soon"
            >
              Exchange
            </button>
          </div>

          {/* Sale Mode Options */}
          {activeMode === 'Sale' && (
            <div className="pos-options">
              {/* Section 1: Document */}
              <div className="pos-section">
                <h4>Document</h4>
                <div className="pos-radio-group">
                  <label className={documentType === 'Receipt' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="documentType"
                      value="Receipt"
                      checked={documentType === 'Receipt'}
                      onChange={(e) => setDocumentType(e.target.value)}
                      disabled={hasPayments}
                    />
                    Receipt
                  </label>
                  <label className={documentType === 'Invoice' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="documentType"
                      value="Invoice"
                      checked={documentType === 'Invoice'}
                      onChange={(e) => setDocumentType(e.target.value)}
                      disabled={hasPayments}
                    />
                    Invoice
                  </label>
                </div>
                <button
                  className="pos-option-button"
                  onClick={handleOpenClientModal}
                  disabled={documentType === 'Receipt' || hasPayments}
                >
                  {selectedClient ? selectedClient.name : 'Select Client'}
                </button>
                {selectedClient && (
                  <div className="pos-selected-info">
                    {selectedClient.email}
                  </div>
                )}
              </div>

              <div className="pos-section-divider"></div>

              {/* Section 2: Adjust */}
              <div className="pos-section">
                <h4>Adjust</h4>
                <button
                  className="btn-action btn-view-details"
                  onClick={handleChangePrice}
                  disabled={!selectedProduct || userRole < 4 || hasPayments}
                  title={userRole < 4 ? 'Requires Deputy Manager or higher' : ''}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  Change Price
                </button>
              </div>

              <div className="pos-section-divider"></div>

              {/* Section 3: Payment */}
              <div className="pos-section">
                <h4>Payment</h4>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="pos-amount-input"
                />
                <div className="pos-radio-group">
                  <label className={paymentMethod === 'Card' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Card"
                      checked={paymentMethod === 'Card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    Card
                  </label>
                  <label className={paymentMethod === 'Cash' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Cash"
                      checked={paymentMethod === 'Cash'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    Cash
                  </label>
                  <label className={paymentMethod === 'Gift Card' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Gift Card"
                      checked={paymentMethod === 'Gift Card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    Gift Card
                  </label>
                </div>
                <div className="pos-payment-buttons">
                  <button
                    className="pos-pay-button"
                    onClick={handlePayClick}
                    disabled={!paymentMethod || parseFloat(paymentAmount) <= 0}
                  >
                    Pay
                  </button>
                  <button
                    className="pos-finish-button"
                    onClick={handleFinishTransaction}
                    disabled={!isFullyPaid}
                  >
                    Finish Transaction
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Returns Mode Options */}
          {activeMode === 'Returns' && (
            <div className="pos-options">
              {/* Refund Method */}
              <div className="pos-option-section">
                <h4>Refund Method</h4>
                <div className="pos-radio-group">
                  <label className={refundMethod === 'Card' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="refundMethod"
                      value="Card"
                      checked={refundMethod === 'Card'}
                      onChange={(e) => setRefundMethod(e.target.value)}
                    />
                    Card
                  </label>
                  <label className={refundMethod === 'Cash' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="refundMethod"
                      value="Cash"
                      checked={refundMethod === 'Cash'}
                      onChange={(e) => setRefundMethod(e.target.value)}
                    />
                    Cash
                  </label>
                  <label className="disabled" title="Coming soon">
                    <input
                      type="radio"
                      name="refundMethod"
                      value="GiftCard"
                      disabled
                    />
                    Gift Card
                  </label>
                </div>
              </div>

              {/* Process Return Button */}
              <div className="pos-action-section">
                <button
                  className="pos-pay-button"
                  onClick={handleProcessReturn}
                  disabled={returnItems.length === 0}
                >
                  Process Return ${returnTotals.totalGross}
                </button>
              </div>
            </div>
          )}

          {/* Exchange Mode (disabled) */}
          {activeMode === 'Exchange' && (
            <div className="pos-options">
              <div className="pos-empty-message">
                Exchange mode coming soon
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Client Selection Modal */}
      {showClientModal && (
        <Modal
          title="Select Client"
          onClose={() => setShowClientModal(false)}
          wide
        >
          <div className="pos-client-modal">
            <div className="pos-client-search-row">
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearchQuery}
                onChange={handleClientSearch}
                className="pos-client-search-input"
              />
              <button
                className="btn-action btn-view-details"
                onClick={() => setShowClientCreateModal(true)}
              >
                Add
              </button>
            </div>

            <div className="pos-client-list">
              {clientsLoading ? (
                <div className="pos-loading">Loading clients...</div>
              ) : clients.length === 0 ? (
                <div className="pos-empty-message">No clients found</div>
              ) : (
                <table className="pos-client-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(client => (
                      <tr
                        key={client.id}
                        className={selectedClientRow?.id === client.id ? 'selected' : ''}
                        onClick={() => setSelectedClientRow(client)}
                      >
                        <td>{client.name}</td>
                        <td>{client.email}</td>
                        <td>{client.phoneNumber}</td>
                        <td>{client.type === 0 ? 'Personal' : 'Company'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pos-modal-actions">
              <button
                className="btn-action btn-cancel-modal"
                onClick={() => setShowClientModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-action btn-choose-modal"
                onClick={handleClientSelect}
                disabled={!selectedClientRow}
              >
                Choose
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Client Creation Modal */}
      {showClientCreateModal && (
        <Modal
          title="Create Client"
          onClose={() => setShowClientCreateModal(false)}
        >
          <div className="pos-client-create">
            <p>Client creation form will be implemented later.</p>
            <div className="pos-modal-actions">
              <button
                className="pos-button-primary"
                onClick={() => setShowClientCreateModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Price Change Modal */}
      {showPriceChangeModal && (
        <Modal
          title="Change Price"
          onClose={() => setShowPriceChangeModal(false)}
        >
          <div className="pos-price-change">
            <p>Product: {selectedProduct?.name}</p>
            <p>Current Price: ${selectedProduct?.unitPrice.toFixed(2)}</p>
            <label>
              New Price:
              <input
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="pos-price-input"
              />
            </label>
            <div className="pos-modal-actions">
              <button
                className="pos-button-primary"
                onClick={handlePriceChangeConfirm}
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Finish Transaction Confirmation */}
      {showFinishConfirm && (
        <ConfirmDialog
          title="Finalize Transaction"
          message="Finalize this transaction and save to database?"
          confirmText="Confirm"
          onConfirm={handleFinishConfirm}
          onCancel={() => setShowFinishConfirm(false)}
        />
      )}

      {/* Return Confirmation */}
      {showReturnConfirm && (
        <ConfirmDialog
          title="Confirm Return"
          message={`Process return of $${returnTotals.totalGross} via ${refundMethod}?`}
          confirmText="Confirm"
          onConfirm={handleReturnConfirm}
          onCancel={() => setShowReturnConfirm(false)}
        />
      )}

      {/* Toast Messages */}
      {toast && (
        <MessageBox
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
