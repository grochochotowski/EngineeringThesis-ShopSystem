import React, { useState, useEffect, useCallback } from 'react';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

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
        items.forEach(tax => {
          // Try both casing styles
          const taxId = tax.id || tax.Id;
          const taxRateValue = tax.rate || tax.Rate;
          const taxCode = tax.code || tax.Code;

          taxMap.set(taxId, { ...tax, id: taxId, rate: taxRateValue, code: taxCode });
        });
        setTaxRates(taxMap);
      } catch (error) {
        console.error('Failed to load tax rates:', error);
      }
    };
    fetchTaxRates();
  }, []);

  // Product search with immediate results
  useEffect(() => {
    if (productSearchQuery.trim().length === 0) {
      setProductSearchResults([]);
      setShowProductDropdown(false);
      return;
    }

    const searchProducts = async () => {
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
    };

    searchProducts();
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
      // Add new product (European pricing: price includes tax)
      const grossPrice = product.price;
      const taxRate = taxRates.get(product.taxRateId)?.rate || 0;
      const netPrice = grossPrice / (1 + taxRate);
      const taxAmount = grossPrice - netPrice;

      setScannedProducts([...scannedProducts, {
        id: product.id,
        sku: product.sku,
        name: product.name,
        unitPriceGross: grossPrice,
        unitPriceNet: netPrice,
        unitTaxAmount: taxAmount,
        quantity: 1,
        taxRateId: product.taxRateId,
        taxRate: taxRate,
        taxCode: taxRates.get(product.taxRateId)?.code || ''
      }]);
    }

    setProductSearchQuery('');
    setShowProductDropdown(false);
  }, [scannedProducts, taxRates]);

  // Calculate totals (European pricing: tax included in price)
  const calculateTotals = useCallback((products) => {
    let totalNet = 0;
    let totalTax = 0;
    let totalGross = 0;

    products.forEach(product => {
      const qty = product.quantity;
      const grossPrice = product.unitPriceGross * qty;
      const taxRate = product.taxRate;
      const netPrice = grossPrice / (1 + taxRate);
      const taxAmount = grossPrice - netPrice;

      totalNet += netPrice;
      totalTax += taxAmount;
      totalGross += grossPrice;
    });

    return {
      totalNet: totalNet.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalGross: totalGross.toFixed(2)
    };
  }, []);

  const totals = calculateTotals(scannedProducts);

  // Calculate total paid and remaining balance
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = parseFloat(totals.totalGross) - totalPaid;

  // Two separate flags for different purposes:
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

  // Handle quantity change
  const handleQuantityChange = (index, newQuantity) => {
    if (newQuantity < 1) return;

    setScannedProducts(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity: newQuantity
      };
      return updated;
    });
  };

  // Handle product removal - show confirmation first
  const handleRemoveProductClick = (product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const handleRemoveProductConfirm = () => {
    if (!productToDelete) return;

    setScannedProducts(prev => prev.filter(p => p.id !== productToDelete.id));

    // Clear selection if the removed product was selected
    if (selectedProduct?.id === productToDelete.id) {
      setSelectedProduct(null);
    }

    setToast({ type: 'success', message: 'Product removed from list' });
    setShowDeleteConfirm(false);
    setProductToDelete(null);
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

    setNewPrice(selectedProduct.unitPriceGross.toString());
    setShowPriceChangeModal(true);
  };

  const handlePriceChangeConfirm = () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      setToast({ type: 'error', message: 'Invalid price value' });
      return;
    }

    // Recalculate net price and tax amount with new gross price
    const updated = scannedProducts.map(p => {
      if (p.id === selectedProduct.id) {
        const grossPrice = price;
        const taxRate = p.taxRate;
        const netPrice = grossPrice / (1 + taxRate);
        const taxAmount = grossPrice - netPrice;
        return {
          ...p,
          unitPriceGross: grossPrice,
          unitPriceNet: netPrice,
          unitTaxAmount: taxAmount
        };
      }
      return p;
    });
    setScannedProducts(updated);
    setSelectedProduct({
      ...selectedProduct,
      unitPriceGross: price,
      unitPriceNet: price / (1 + selectedProduct.taxRate),
      unitTaxAmount: price - (price / (1 + selectedProduct.taxRate))
    });
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

  // Revert all payments and unlock interface
  const handleRevertPayment = () => {
    setPayments([]);
    setPaymentMethod(null);
    setPaymentAmount(0);
    setSaleDocumentGenerated(null);
    setToast({ type: 'success', message: 'All payments reverted' });
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
        unitPriceNet: p.unitPriceNet,
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
    let totalNet = 0;
    let totalTax = 0;
    let totalGross = 0;

    returnItems.forEach(item => {
      if (item.returnQuantity > 0) {
        const lineNet = item.unitPriceNet * item.returnQuantity;
        const taxRate = taxRates.get(item.taxRateId)?.rate || 0;
        const lineGross = lineNet * (1 + taxRate);
        const lineTax = lineGross - lineNet;

        totalNet += lineNet;
        totalTax += lineTax;
        totalGross += lineGross;
      }
    });

    return {
      totalNet: totalNet.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalGross: totalGross.toFixed(2)
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
                disabled={isFullyPaid}
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
              <div className={`pos-products-table-wrapper ${isFullyPaid ? 'disabled' : ''}`}>
                {scannedProducts.length === 0 ? (
                  <div className="pos-empty-message">No products scanned</div>
                ) : (
                  <table className="pos-products-table pos-products-table-clean-header">
                    <thead>
                      <tr>
                        <th style={{ width: "30%", textAlign: "left" }}>Product</th>
                        <th style={{ width: "10%", textAlign: "center" }}>Qty</th>
                        <th style={{ width: "15%", textAlign: "center" }}>Price</th>
                        <th style={{ width: "18%", textAlign: "center" }}>Tax</th>
                        <th style={{ width: "17%", textAlign: "center", paddingRight: "2rem" }}>Total</th>
                        <th style={{ width: "10%", textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedProducts.map((product, index) => {
                        const lineGross = product.unitPriceGross * product.quantity;

                        return (
                          <tr
                            key={product.id}
                            className={selectedProduct?.id === product.id ? 'selected' : ''}
                            onClick={() => !isFullyPaid && handleProductRowClick(product)}
                          >
                            {/* Product Name */}
                            <td style={{ width: "30%", textAlign: "left" }}>{product.name}</td>

                            {/* Editable Quantity */}
                            <td style={{ width: "10%", textAlign: "center" }}>
                              <input
                                type="number"
                                min="1"
                                value={product.quantity}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                onClick={(e) => e.stopPropagation()}
                                disabled={isFullyPaid}
                                style={{ width: "60px", textAlign: "center" }}
                              />
                            </td>

                            {/* Net Price (without tax) */}
                            <td style={{ width: "15%", textAlign: "center" }}>
                              ${product.unitPriceNet.toFixed(2)}
                            </td>

                            {/* Tax (amount and percentage) - New format: XX.XX (yy%) */}
                            <td style={{ width: "18%", textAlign: "center" }}>
                              ${product.unitTaxAmount.toFixed(2)} ({(product.taxRate * 100).toFixed(0)}%)
                            </td>

                            {/* Total (gross price × quantity) - Add padding */}
                            <td style={{ width: "17%", textAlign: "center", paddingRight: "2rem" }}>
                              ${lineGross.toFixed(2)}
                            </td>

                            {/* Remove Button - Trash icon */}
                            <td style={{ width: "10%", textAlign: "center" }}>
                              <button
                                className="btn-remove-product"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveProductClick(product);
                                }}
                                disabled={isFullyPaid}
                                title="Remove product"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                                  <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6m4-6v6"/>
                                </svg>
                              </button>
                            </td>
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
            {/* Total Tax row hidden - calculation kept for receipt generation */}
            {/* <div className="pos-totals-row">
              <span>Total Tax:</span>
              <span>${activeMode === 'Sale' ? totals.totalTax : returnTotals.totalTax}</span>
            </div> */}

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

            <div className="pos-totals-divider"></div>
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
                      disabled={isFullyPaid}
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
                      disabled={isFullyPaid}
                    />
                    Invoice
                  </label>
                </div>
                <button
                  className="pos-option-button"
                  onClick={handleOpenClientModal}
                  disabled={documentType === 'Receipt' || isFullyPaid}
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
                  disabled={!selectedProduct || userRole < 4 || isFullyPaid}
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
                  disabled={isFullyPaid}
                />
                <div className="pos-radio-group">
                  <label className={paymentMethod === 'Card' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Card"
                      checked={paymentMethod === 'Card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={isFullyPaid}
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
                      disabled={isFullyPaid}
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
                      disabled={isFullyPaid}
                    />
                    Gift Card
                  </label>
                </div>
                <div className="pos-payment-buttons">
                  {!isFullyPaid ? (
                    <button
                      className="pos-pay-button"
                      onClick={handlePayClick}
                      disabled={!paymentMethod || parseFloat(paymentAmount) <= 0}
                    >
                      Pay
                    </button>
                  ) : (
                    <button
                      className="pos-revert-button"
                      onClick={handleRevertPayment}
                    >
                      Revert Payment
                    </button>
                  )}
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
            <p>Current Price: ${selectedProduct?.unitPriceGross.toFixed(2)}</p>
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
                className="btn-action btn-choose-modal"
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

      {/* Delete Product Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Remove Product"
          message={`Remove "${productToDelete?.name}" from the transaction?`}
          confirmText="Remove"
          onConfirm={handleRemoveProductConfirm}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setProductToDelete(null);
          }}
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
