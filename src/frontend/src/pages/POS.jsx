import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import ClientFormModal from '../components/Forms/ClientFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import MessageBox from '../components/MessageBox';
import { api } from '../api/apiClient';
import { clientTypesData } from '../data/clientTypes';
import '../styles/PagesStyles/pos.css';

export default function POS() {
  // User context
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = currentUser?.role || 0;

  // Helper function to get document type enum based on document type and client type
  const getDocumentTypeEnum = (docType, client) => {
    if (docType === 'Receipt') {
      return 1; // SalesDocumentType.Receipt
    } else {
      // Invoice selected - check client type
      // ClientType: Company=1, Person=2 (but API returns as string: "Company", "Person")
      // SalesDocumentType: InvoicePersonal=2, InvoiceCompany=3
      const clientType = typeof client?.type === 'string' ? client.type : '';
      return clientType === 'Person' || client?.type === 2 ? 2 : 3; // Person → InvoicePersonal, Company → InvoiceCompany
    }
  };

  // Helper function to get client type label
  const getClientTypeLabel = (typeValue) => {
    // Handle both string enum values (from API with JsonStringEnumConverter) and numeric IDs
    if (typeof typeValue === 'string') {
      // API returns string like "Company" or "Person"
      const type = clientTypesData.find(t => t.value === typeValue);
      return type?.value || 'Unknown';
    } else {
      // Fallback for numeric IDs
      const type = clientTypesData.find(t => t.id === typeValue);
      return type?.value || 'Unknown';
    }
  };

  // Mode management
  const [activeMode, setActiveMode] = useState('Sale'); // Sale, Returns, Exchange

  // Scanned products state
  const [scannedProducts, setScannedProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productLocationLines, setProductLocationLines] = useState({}); // Map of productId -> array of { locationId, quantity }

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

  // Buy Gift Card modal
  const [showBuyGiftCardModal, setShowBuyGiftCardModal] = useState(false);
  const [giftCardValue, setGiftCardValue] = useState('');

  // Gift Card Payment modal
  const [showGiftCardPaymentModal, setShowGiftCardPaymentModal] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [validatedGiftCard, setValidatedGiftCard] = useState(null); // { id, code, value }

  // Returns mode state
  const [saleDocumentNumber, setSaleDocumentNumber] = useState('');
  const [saleDocumentLocked, setSaleDocumentLocked] = useState(false);
  const [originalDocument, setOriginalDocument] = useState(null);
  const [returnItems, setReturnItems] = useState([]); // Array of items with returnQuantity and locations
  const [returnLocationLines, setReturnLocationLines] = useState({}); // Map of itemId -> array of { locationId, quantity }
  const [refundMethod, setRefundMethod] = useState(null);
  const [availableLocationsForReturn, setAvailableLocationsForReturn] = useState(new Map()); // Map of productId -> available locations
  const [allWarehouseLocations, setAllWarehouseLocations] = useState([]); // All warehouse locations for returns

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
        console.log('Loaded tax rates:', items);

        const taxMap = new Map();
        items.forEach(tax => {
          // Try both casing styles
          const taxId = tax.id || tax.Id;
          const taxRateValue = tax.rate || tax.Rate;
          const taxCode = tax.code || tax.Code;

          taxMap.set(taxId, { ...tax, id: taxId, rate: taxRateValue, code: taxCode });
        });
        console.log('Tax rates Map:', Array.from(taxMap.entries()));
        setTaxRates(taxMap);
      } catch (error) {
        console.error('Failed to load tax rates:', error);
      }
    };
    fetchTaxRates();
  }, []);

  // Load all warehouse locations on mount (for returns)
  useEffect(() => {
    const fetchAllLocations = async () => {
      try {
        const response = await api.get('/Location', {
          params: { PageSize: 1000 } // Get all locations (increase if needed)
        });
        // Location endpoint returns paged result with items array
        const locations = response.items || response || [];
        console.log('Loaded warehouse locations:', locations);
        setAllWarehouseLocations(locations);
      } catch (error) {
        console.error('Failed to load warehouse locations:', error);
      }
    };
    fetchAllLocations();
  }, []);

  // Product search autocomplete disabled - only scan with Enter key
  // (Autocomplete disabled to prevent dropdown interference with barcode scanning)
  /*
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
  */

  // Add product to scanned list
  const handleAddProduct = useCallback(async (product) => {
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
      // Fetch available locations for this product
      try {
        const locations = await api.get(`/products-in-warehouse/product/${product.id}`);

        // VALIDATION: Check if product has any stock in warehouse
        const totalStock = locations?.reduce((sum, loc) => sum + loc.quantity, 0) || 0;
        if (totalStock === 0 || !locations || locations.length === 0) {
          setToast({
            type: 'error',
            message: `Cannot add "${product.name}": No stock available in warehouse`
          });
          setProductSearchQuery('');
          setShowProductDropdown(false);
          return;
        }

        // Initialize location lines for this product (one empty line to start)
        setProductLocationLines(prev => ({
          ...prev,
          [product.id]: [{ locationId: null, quantity: 1 }]
        }));

        // Add new product (European pricing: price includes tax)
        const grossPrice = product.price;
        const taxRate = taxRates.get(product.taxRateId)?.rate || 0;
        const netPrice = grossPrice / (1 + taxRate);
        const taxAmount = grossPrice - netPrice;

        console.log(`Adding product "${product.name}":`, {
          grossPrice,
          taxRateId: product.taxRateId,
          taxRate,
          taxRateFromMap: taxRates.get(product.taxRateId),
          netPrice,
          taxAmount
        });

        setScannedProducts([...scannedProducts, {
          id: product.id,
          sku: product.sku,
          ean: product.ean || null,
          name: product.name,
          unitPriceGross: grossPrice,
          unitPriceNet: netPrice,
          unitTaxAmount: taxAmount,
          quantity: 1,
          taxRateId: product.taxRateId,
          taxRate: taxRate,
          taxCode: taxRates.get(product.taxRateId)?.code || '',
          availableLocations: locations || []
        }]);
      } catch (error) {
        console.error('Failed to load locations for product:', error);
        setToast({ type: 'error', message: `Failed to load locations: ${error.message}` });
      }
    }

    setProductSearchQuery('');
    setShowProductDropdown(false);
  }, [scannedProducts, taxRates]);

  // Handle Enter key press for SKU scanning
  const handleScanKeyPress = useCallback(async (e) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    const sku = productSearchQuery.trim();

    // Validate SKU is not empty
    if (!sku) {
      setToast({ type: 'error', message: 'Please enter a SKU' });
      return;
    }

    // Validate minimum SKU length (adjust as needed for your business rules)
    if (sku.length < 3) {
      setToast({ type: 'error', message: 'SKU too short (minimum 3 characters)' });
      return;
    }

    try {
      // Search for exact SKU match
      const { items } = await api.get('/Products', {
        params: {
          q: sku,
          PageSize: 20,
          isActive: true
        }
      });

      if (!items || items.length === 0) {
        setToast({ type: 'error', message: `Product not found: ${sku}` });
        // Keep the value in input for correction
        return;
      }

      // Find exact SKU match (case-insensitive)
      const exactMatch = items.find(p => p.sku.toLowerCase() === sku.toLowerCase());

      if (exactMatch) {
        // Add the exact match
        handleAddProduct(exactMatch);
        setToast({ type: 'success', message: `Added: ${exactMatch.name}` });
      } else if (items.length === 1) {
        // If only one result and it's a partial match, add it
        handleAddProduct(items[0]);
        setToast({ type: 'success', message: `Added: ${items[0].name}` });
      } else {
        // Multiple partial matches - show dropdown for user to select
        setProductSearchResults(items);
        setShowProductDropdown(true);
        setToast({ type: 'info', message: `Found ${items.length} matches - please select` });
      }
    } catch (error) {
      console.error('SKU scan failed:', error);
      setToast({ type: 'error', message: `Scan failed: ${error.message || 'Network error'}` });
      // Keep the value in input for retry
    }
  }, [productSearchQuery, handleAddProduct]);

  // Helper to round to 2 decimal places (matches backend Round2)
  const round2 = useCallback((value) => Math.round(value * 100) / 100, []);

  // Calculate line item totals (matches backend calculation exactly)
  const calculateLineTotal = useCallback((product) => {
    const lineGross = round2(product.unitPriceGross * product.quantity);
    const lineNet = round2(lineGross / (1 + product.taxRate));
    const lineTax = round2(lineGross - lineNet);
    return { lineNet, lineTax, lineGross };
  }, [round2]);

  // Calculate totals (European pricing: tax included in price)
  // IMPORTANT: Must match backend rounding logic exactly to avoid payment validation errors
  const calculateTotals = useCallback((products) => {
    let totalNet = 0;
    let totalTax = 0;
    let totalGross = 0;

    products.forEach(product => {
      // Use same calculation as table display
      const { lineNet, lineTax, lineGross } = calculateLineTotal(product);

      totalNet += lineNet;
      totalTax += lineTax;
      totalGross += lineGross;
    });

    const result = {
      totalNet: totalNet.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalGross: totalGross.toFixed(2)
    };

    if (products.length > 0) {
      console.log('Calculated totals:', result);
    }

    return result;
  }, [calculateLineTotal]);

  const totals = calculateTotals(scannedProducts);

  // Calculate total paid and remaining balance
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = parseFloat(totals.totalGross) - totalPaid;

  // Calculate total amount tendered (actual amount customer gave)
  const totalTendered = payments.reduce((sum, payment) => {
    // For Cash: use amountTendered; for Card/Gift Card: use amount charged
    return sum + (payment.method === 'Cash' && payment.amountTendered ? payment.amountTendered : payment.amount);
  }, 0);

  // Two separate flags for different purposes:
  const isFullyPaid = scannedProducts.length > 0 && remainingBalance <= 0; // Is transaction fully paid?

  const change = totalTendered - parseFloat(totals.totalGross);

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

  // Handle quantity change (updates total product quantity)
  const handleQuantityChange = (productId, lineIndex, value) => {
    // Allow empty string (user is clearing the input)
    if (value === '' || value === null || value === undefined) {
      setProductLocationLines(prev => {
        const lines = [...(prev[productId] || [])];
        lines[lineIndex] = {
          ...lines[lineIndex],
          quantity: '' // Store empty string temporarily
        };
        return {
          ...prev,
          [productId]: lines
        };
      });
      return;
    }

    // Parse to integer
    const newQuantity = parseInt(value);

    // Validate positive integer - allow any positive number (will be capped on blur)
    if (isNaN(newQuantity) || newQuantity < 1) return;

    // No blocking validation - allow user to type any quantity
    // Enforcement happens in handleQuantityBlur

    setProductLocationLines(prev => {
      const lines = [...(prev[productId] || [])];
      lines[lineIndex] = {
        ...lines[lineIndex],
        quantity: newQuantity
      };

      // Update total product quantity (only count numeric quantities)
      const totalQuantity = lines.reduce((sum, line) => {
        const qty = typeof line.quantity === 'number' ? line.quantity : 0;
        return sum + qty;
      }, 0);

      setScannedProducts(products => products.map(p =>
        p.id === productId ? { ...p, quantity: totalQuantity } : p
      ));

      return {
        ...prev,
        [productId]: lines
      };
    });
  };

  // Handle quantity blur - set to 1 if empty, or cap to max available if exceeds
  const handleQuantityBlur = (productId, lineIndex) => {
    setProductLocationLines(prev => {
      const lines = [...(prev[productId] || [])];
      const currentQty = lines[lineIndex].quantity;
      const selectedLocationId = lines[lineIndex]?.locationId;

      let finalQuantity = currentQty;
      let wasEmptyInput = false;

      // If quantity is empty or invalid, set to 1
      if (currentQty === '' || currentQty === null || currentQty === undefined || isNaN(currentQty)) {
        finalQuantity = 1;
        wasEmptyInput = true;
      } else if (selectedLocationId) {
        // If a location is selected, validate against available stock
        const product = scannedProducts.find(p => p.id === productId);
        const availableLocation = product?.availableLocations?.find(loc => loc.locationId === selectedLocationId);

        if (availableLocation && currentQty > availableLocation.quantity) {
          // Cap to maximum available quantity
          finalQuantity = availableLocation.quantity;
          setToast({
            type: 'warning',
            message: `Quantity capped to available stock at ${availableLocation.locationCode}: ${availableLocation.quantity}`
          });
        }
      }

      // Only update if quantity changed
      if (finalQuantity !== currentQty) {
        lines[lineIndex] = {
          ...lines[lineIndex],
          quantity: finalQuantity
        };

        // Update total product quantity
        const totalQuantity = lines.reduce((sum, line) => {
          const qty = typeof line.quantity === 'number' ? line.quantity : 1;
          return sum + qty;
        }, 0);

        setScannedProducts(products => products.map(p =>
          p.id === productId ? { ...p, quantity: totalQuantity } : p
        ));

        // Show warning toast for empty input
        if (wasEmptyInput) {
          setToast({
            type: 'warning',
            message: 'Empty quantity set to 1'
          });
        }

        return {
          ...prev,
          [productId]: lines
        };
      }

      return prev;
    });
  };

  // Handle location selection for a specific line
  const handleLocationChange = (productId, lineIndex, locationId) => {
    const parsedLocationId = locationId ? parseInt(locationId) : null;

    // Check for duplicate location selection
    if (parsedLocationId) {
      const lines = productLocationLines[productId] || [];
      const isDuplicate = lines.some((line, idx) => idx !== lineIndex && line.locationId === parsedLocationId);

      if (isDuplicate) {
        setToast({ type: 'error', message: 'This location is already selected for this product' });
        return;
      }
    }

    setProductLocationLines(prev => {
      const lines = [...(prev[productId] || [])];
      const currentQuantity = lines[lineIndex]?.quantity || 1;

      // If a location is selected and current quantity exceeds available stock, cap it
      let adjustedQuantity = currentQuantity;
      if (parsedLocationId) {
        const product = scannedProducts.find(p => p.id === productId);
        const availableLocation = product?.availableLocations?.find(loc => loc.locationId === parsedLocationId);

        if (availableLocation && currentQuantity > availableLocation.quantity) {
          adjustedQuantity = availableLocation.quantity;
          setToast({
            type: 'warning',
            message: `Quantity adjusted to available stock at ${availableLocation.locationCode}: ${availableLocation.quantity}`
          });
        }
      }

      lines[lineIndex] = {
        ...lines[lineIndex],
        locationId: parsedLocationId,
        quantity: adjustedQuantity
      };

      // Update total product quantity if quantity was adjusted
      if (adjustedQuantity !== currentQuantity) {
        const totalQuantity = lines.reduce((sum, line) => {
          const qty = typeof line.quantity === 'number' ? line.quantity : 1;
          return sum + qty;
        }, 0);

        setScannedProducts(products => products.map(p =>
          p.id === productId ? { ...p, quantity: totalQuantity } : p
        ));
      }

      return {
        ...prev,
        [productId]: lines
      };
    });
  };

  // Add a new location line for a product
  const handleAddLocationLine = (productId) => {
    setProductLocationLines(prev => {
      const lines = [...(prev[productId] || [])];
      lines.push({ locationId: null, quantity: 1 });

      // Update total product quantity
      const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
      setScannedProducts(products => products.map(p =>
        p.id === productId ? { ...p, quantity: totalQuantity } : p
      ));

      return {
        ...prev,
        [productId]: lines
      };
    });
  };

  // Remove a location line (only if there's more than one)
  const handleRemoveLocationLine = (productId, lineIndex) => {
    setProductLocationLines(prev => {
      const lines = [...(prev[productId] || [])];
      if (lines.length <= 1) return prev; // Don't remove the last line

      lines.splice(lineIndex, 1);

      // Update total product quantity
      const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
      setScannedProducts(products => products.map(p =>
        p.id === productId ? { ...p, quantity: totalQuantity } : p
      ));

      return {
        ...prev,
        [productId]: lines
      };
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

    // Remove location lines for this product
    setProductLocationLines(prev => {
      const updated = { ...prev };
      delete updated[productToDelete.id];
      return updated;
    });

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

  const handleClientCreated = async (clientId) => {
    // Fetch the newly created client details
    try {
      const newClient = await api.get(`/Clients/${clientId}`);

      // Close both modals (creation modal and selection modal)
      setShowClientCreateModal(false);
      setShowClientModal(false);

      // Automatically select the newly created client
      setSelectedClient(newClient);

      // Show success message
      setToast({ type: 'success', message: `Client ${newClient.name} created and selected` });
    } catch (error) {
      console.error('Failed to fetch newly created client:', error);
      setToast({ type: 'error', message: 'Client created but failed to select automatically' });

      // Still close the modals
      setShowClientCreateModal(false);
      setShowClientModal(false);
    }
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
    setToast({ type: 'success', message: 'All payments reverted' });
  };

  // Gift Card Payment handlers
  const handleGiftCardPaymentClick = () => {
    // Show modal to input gift card code
    setGiftCardCode('');
    setValidatedGiftCard(null);
    setShowGiftCardPaymentModal(true);
  };

  const handleGiftCardValidate = async () => {
    if (!giftCardCode.trim()) {
      setToast({ type: 'error', message: 'Please enter a gift card code' });
      return;
    }

    try {
      const result = await api.post('/GiftCard/validate', { code: giftCardCode.trim() });

      if (result.isValid) {
        setValidatedGiftCard({
          id: result.giftCardId,
          code: giftCardCode.trim(),
          value: result.value
        });

        // Auto-set payment amount to min(giftCardValue, remainingBalance)
        const autoAmount = Math.min(result.value, remainingBalance);
        setPaymentAmount(autoAmount.toFixed(2));

        setToast({
          type: 'success',
          message: `Gift card validated. Balance: $${result.value.toFixed(2)}`
        });
      } else {
        setValidatedGiftCard(null);
        setToast({ type: 'error', message: result.errorMessage || 'Invalid gift card' });
      }
    } catch (error) {
      console.error('Gift card validation failed:', error);
      setValidatedGiftCard(null);
      setToast({
        type: 'error',
        message: error.response?.data?.error || 'Failed to validate gift card'
      });
    }
  };

  const handleGiftCardPaymentConfirm = () => {
    if (!validatedGiftCard) {
      setToast({ type: 'error', message: 'Please validate gift card first' });
      return;
    }

    const enteredAmount = parseFloat(paymentAmount);
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      setToast({ type: 'error', message: 'Please enter a valid payment amount' });
      return;
    }

    // Validate amount doesn't exceed gift card balance
    if (enteredAmount > validatedGiftCard.value) {
      setToast({
        type: 'error',
        message: `Amount exceeds gift card balance of $${validatedGiftCard.value.toFixed(2)}`
      });
      return;
    }

    // Validate amount doesn't exceed remaining balance
    if (enteredAmount > remainingBalance) {
      setToast({
        type: 'error',
        message: `Amount exceeds remaining balance of $${remainingBalance.toFixed(2)}`
      });
      return;
    }

    // Add gift card payment with ID
    const newPayment = {
      method: 'Gift Card',
      amount: enteredAmount,
      giftCardId: validatedGiftCard.id
    };
    const allPayments = [...payments, newPayment];
    setPayments(allPayments);

    // Clear payment method selection and reset amount
    setPaymentMethod(null);
    const newRemaining = parseFloat(totals.totalGross) - allPayments.reduce((sum, p) => sum + p.amount, 0);
    setPaymentAmount(Math.max(0, newRemaining).toFixed(2));

    // Close modal and reset state
    setShowGiftCardPaymentModal(false);
    setGiftCardCode('');
    setValidatedGiftCard(null);

    setToast({
      type: 'success',
      message: `Gift card payment of $${enteredAmount.toFixed(2)} recorded`
    });
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

    // Gift Card payment uses separate modal flow
    if (paymentMethod === 'Gift Card') {
      handleGiftCardPaymentClick();
      return;
    }

    const enteredAmount = parseFloat(paymentAmount);
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      setToast({ type: 'error', message: 'Please enter a valid payment amount' });
      return;
    }

    // Calculate actual amount and change for Cash payments
    let actualAmount;
    let tenderedAmount;
    let changeAmount;

    if (paymentMethod === 'Cash') {
      // For cash: if entered amount > remaining, only charge remaining and give change
      if (enteredAmount > remainingBalance) {
        actualAmount = remainingBalance;
        tenderedAmount = enteredAmount;
        changeAmount = enteredAmount - remainingBalance;
      } else {
        actualAmount = enteredAmount;
        tenderedAmount = enteredAmount;
        changeAmount = 0;
      }
    } else {
      // For Card: charge the entered amount
      actualAmount = enteredAmount;
      tenderedAmount = null;
      changeAmount = null;
    }

    // Update or add payment (allow repeated payments with same method)
    const existingIndex = payments.findIndex(p => p.method === paymentMethod);
    let allPayments;

    if (existingIndex !== -1) {
      // Update existing payment by adding to it
      const updated = [...payments];

      updated[existingIndex] = {
        ...updated[existingIndex],
        amount: updated[existingIndex].amount + actualAmount,
        amountTendered: paymentMethod === 'Cash'
          ? (updated[existingIndex].amountTendered || 0) + tenderedAmount
          : null,
        change: paymentMethod === 'Cash'
          ? (updated[existingIndex].change || 0) + changeAmount
          : null
      };
      setPayments(updated);
      allPayments = updated;
    } else {
      // Add new payment
      const newPayment = {
        method: paymentMethod,
        amount: actualAmount,
        amountTendered: tenderedAmount,
        change: changeAmount
      };
      allPayments = [...payments, newPayment];
      setPayments(allPayments);
    }

    // Clear payment method selection and reset amount
    setPaymentMethod(null);
    const newRemaining = parseFloat(totals.totalGross) - allPayments.reduce((sum, p) => sum + p.amount, 0);
    setPaymentAmount(Math.max(0, newRemaining).toFixed(2));

    // Show appropriate success message
    const successMsg = paymentMethod === 'Cash' && changeAmount > 0
      ? `${paymentMethod} payment of $${actualAmount.toFixed(2)} recorded. Change: $${changeAmount.toFixed(2)}`
      : `${paymentMethod} payment of $${actualAmount.toFixed(2)} recorded`;
    setToast({ type: 'success', message: successMsg });
  };

  // Buy Gift Card handlers
  const handleBuyGiftCardClick = () => {
    setGiftCardValue('');
    setShowBuyGiftCardModal(true);
  };

  const handleBuyGiftCardConfirm = async () => {
    const value = parseFloat(giftCardValue);

    // Validation
    if (isNaN(value) || value < 20 || value > 1000) {
      setToast({ type: 'error', message: 'Gift card value must be between $20 and $1000' });
      return;
    }

    try {
      // Find Gift Card product by SKU
      const products = await api.get('/Products', { params: { q: '_gc' } });
      const giftCardProduct = products.items?.find(p => p.sku === '_gc');

      if (!giftCardProduct) {
        setToast({ type: 'error', message: 'Gift Card product not found in system' });
        return;
      }

      // Gift cards are digital products - no warehouse location needed
      // Add gift card to cart with custom price
      const taxRate = taxRates.get(giftCardProduct.taxRateId)?.rate || 0;
      const grossPrice = value;
      const netPrice = grossPrice / (1 + taxRate);
      const taxAmount = grossPrice - netPrice;

      setScannedProducts([...scannedProducts, {
        id: giftCardProduct.id,
        sku: giftCardProduct.sku,
        ean: giftCardProduct.ean || null,
        name: giftCardProduct.name,
        unitPriceGross: grossPrice,
        unitPriceNet: netPrice,
        unitTaxAmount: taxAmount,
        quantity: 1,
        taxRateId: giftCardProduct.taxRateId,
        taxRate: taxRate,
        taxCode: taxRates.get(giftCardProduct.taxRateId)?.code || '',
        availableLocations: [], // Empty - no locations needed for digital products
        isGiftCard: true, // Mark as gift card for later processing
        giftCardValue: value // Store the value for gift card creation
      }]);

      setToast({ type: 'success', message: `Gift card ($${value.toFixed(2)}) added to cart` });
      setShowBuyGiftCardModal(false);
      setGiftCardValue('');
    } catch (error) {
      console.error('Failed to add gift card:', error);
      setToast({ type: 'error', message: `Failed to add gift card: ${error.message}` });
    }
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
      // Validate all products have all location lines with locations selected
      // Skip validation for gift cards (digital products don't need locations)
      const productsWithMissingLocations = [];

      for (const product of scannedProducts) {
        // Skip location validation for gift cards
        if (product.isGiftCard) {
          continue;
        }

        const lines = productLocationLines[product.id] || [];
        const hasEmptyLocation = lines.some(line => !line.locationId);
        if (hasEmptyLocation) {
          productsWithMissingLocations.push(product.name);
        }
      }

      if (productsWithMissingLocations.length > 0) {
        setToast({
          type: 'error',
          message: `Please select locations for all lines: ${productsWithMissingLocations.join(', ')}`
        });
        setShowFinishConfirm(false);
        return;
      }

      // Map document type to enum value
      const documentTypeEnum = getDocumentTypeEnum(documentType, selectedClient);

      // Prepare finalization DTO - create separate line items for each location
      const items = [];
      scannedProducts.forEach(product => {
        // Gift cards are digital products - no location needed
        if (product.isGiftCard) {
          items.push({
            productId: product.id,
            productName: product.name,
            productSKU: product.sku,
            quantity: 1,
            unitGross: product.unitPriceGross,
            taxRateId: product.taxRateId,
            fromLocationId: null // No location for digital products
          });
        } else {
          // Regular products - create line items from location lines
          const lines = productLocationLines[product.id] || [];
          lines.forEach(line => {
            items.push({
              productId: product.id,
              productName: product.name,
              productSKU: product.sku,
              quantity: line.quantity,
              unitGross: product.unitPriceGross,
              taxRateId: product.taxRateId,
              fromLocationId: line.locationId
            });
          });
        }
      });

      const finalizationDto = {
        documentType: documentTypeEnum,
        clientId: documentType === 'Invoice' ? selectedClient?.id : null,
        items: items,
        payments: payments.map(payment => ({
          paymentOption: payment.method === 'Card' ? 1 : payment.method === 'Cash' ? 2 : 3,
          amount: payment.amount,
          amountTendered: payment.amountTendered || null,
          change: payment.change || null,
          giftCardId: payment.giftCardId || null
        })),
        userId: currentUser?.id || 0
      };

      console.log('Finalization DTO:', JSON.stringify(finalizationDto, null, 2));

      // Call finalization endpoint
      const response = await api.post('/SalesDocument/finalize', finalizationDto);

      // Use gift cards for payments
      const giftCardPayments = payments.filter(p => p.giftCardId);
      if (giftCardPayments.length > 0) {
        try {
          for (const payment of giftCardPayments) {
            await api.post('/GiftCard/use', {
              giftCardId: payment.giftCardId,
              amount: payment.amount
            });
          }
        } catch (error) {
          console.error('Failed to use gift card:', error);
          setToast({
            type: 'warning',
            message: `${response.documentNumber} - Transaction completed but gift card use failed: ${error.message}`
          });
        }
      }

      // Check if any products are gift cards and create them
      const giftCardProducts = scannedProducts.filter(p => p.isGiftCard);
      if (giftCardProducts.length > 0) {
        try {
          const createdCodes = [];
          for (const giftCard of giftCardProducts) {
            const created = await api.post('/GiftCard', {
              value: giftCard.giftCardValue
            });
            createdCodes.push(created.code);
          }
          setToast({
            type: 'success',
            message: `${response.documentNumber} - Gift card(s) created: ${createdCodes.join(', ')}`
          });
        } catch (error) {
          console.error('Failed to create gift card:', error);
          setToast({
            type: 'warning',
            message: `${response.documentNumber} - Transaction completed but gift card creation failed: ${error.message}`
          });
        }
      } else {
        setToast({
          type: 'success',
          message: response.documentNumber
        });
      }

      setShowFinishConfirm(false);

      // Reset entire state
      setScannedProducts([]);
      setSelectedProduct(null);
      setSelectedClient(null);
      setPaymentMethod(null);
      setPayments([]);
      setPaymentAmount(0);
      setDocumentType('Receipt');
      setProductLocationLines({});
    } catch (error) {
      console.error('Failed to finalize transaction:', error);
      console.error('Error details:', error.response?.data);
      const errorData = error.response?.data;
      const errorMsg = errorData?.error || error.message || 'Unknown error';
      const details = errorData?.details;
      const innerException = errorData?.innerException;

      let fullMsg = errorMsg;
      if (details) fullMsg += `\n\nDetails: ${details}`;
      if (innerException) fullMsg += `\n\nRoot cause: ${innerException}`;

      setToast({ type: 'error', message: `Transaction failed: ${fullMsg}` });
      setShowFinishConfirm(false);
    }
  };

  // Returns mode - Load sale document
  const handleSaleDocumentSearch = async () => {
    if (!saleDocumentNumber.trim()) {
      setToast({ type: 'error', message: 'Please enter a sale document number' });
      return;
    }

    try {
      console.log('Searching for document:', saleDocumentNumber.trim());

      // Fetch document by document number (using query parameter)
      const fullDoc = await api.get('/SalesDocument/by-number', {
        params: { documentNumber: saleDocumentNumber.trim() }
      });

      console.log('Received document:', fullDoc);

      if (!fullDoc) {
        setToast({ type: 'error', message: 'Sale document not found' });
        return;
      }

      // Validate document type (cannot return a return document)
      if (fullDoc.documentType === 4 || fullDoc.documentType === 5) { // ReceiptReturn or InvoiceReturn
        setToast({ type: 'error', message: 'Cannot return a return document' });
        return;
      }

      // Store original document
      setOriginalDocument(fullDoc);

      // Initialize return items with location lines (exclude gift cards - digital products are not returnable)
      const returnableItems = fullDoc.items
        .filter(item => item.productSKU !== '_gc') // Filter out gift cards
        .map(item => ({
          ...item,
          returnQuantity: 0,
          maxQuantity: Math.abs(item.quantity), // Use absolute value
          ean: item.ean || null
        }));

      if (returnableItems.length === 0) {
        setToast({ type: 'warning', message: 'This document contains only non-returnable items (gift cards)' });
        return;
      }

      setReturnItems(returnableItems);

      // Initialize location lines for each item (one empty line to start with quantity 0)
      const initialLocationLines = {};
      returnableItems.forEach(item => {
        initialLocationLines[item.id] = [{ locationId: null, quantity: 0 }];
      });
      setReturnLocationLines(initialLocationLines);

      // Fetch current product locations (to show stock info in dropdown)
      const productLocationsMap = new Map();
      for (const item of returnableItems) {
        try {
          const locations = await api.get(`/products-in-warehouse/product/${item.productId}`);
          productLocationsMap.set(item.productId, locations || []);
        } catch (error) {
          console.error(`Failed to load locations for product ${item.productId}:`, error);
          productLocationsMap.set(item.productId, []);
        }
      }
      setAvailableLocationsForReturn(productLocationsMap);

      setSaleDocumentLocked(true);
      setToast({ type: 'success', message: `Sale document ${fullDoc.documentNumber} loaded` });
    } catch (error) {
      console.error('Failed to load sale document:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status
      });

      let errorMsg = 'Failed to load sale document';
      if (error.response?.status === 404) {
        errorMsg = `Document "${saleDocumentNumber.trim()}" not found`;
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }

      setToast({ type: 'error', message: errorMsg });
    }
  };

  // Handle return location quantity change
  const handleReturnLocationQuantityChange = (itemId, lineIndex, value) => {
    // Allow empty string (user is clearing the input)
    if (value === '' || value === null || value === undefined) {
      setReturnLocationLines(prev => {
        const lines = [...(prev[itemId] || [])];
        lines[lineIndex] = {
          ...lines[lineIndex],
          quantity: ''
        };
        return {
          ...prev,
          [itemId]: lines
        };
      });
      return;
    }

    const newQuantity = parseInt(value);
    if (isNaN(newQuantity) || newQuantity < 0) return; // Allow 0 for returns

    setReturnLocationLines(prev => {
      const lines = [...(prev[itemId] || [])];
      const item = returnItems.find(i => i.id === itemId);

      // Don't allow total to exceed max quantity
      const otherLinesTotal = lines.reduce((sum, line, idx) => {
        if (idx === lineIndex) return sum;
        return sum + (typeof line.quantity === 'number' ? line.quantity : 0);
      }, 0);

      const maxForThisLine = item.maxQuantity - otherLinesTotal;
      const finalQuantity = Math.min(newQuantity, maxForThisLine);

      lines[lineIndex] = {
        ...lines[lineIndex],
        quantity: finalQuantity
      };

      // Update total return quantity
      const totalReturnQty = lines.reduce((sum, line) => {
        return sum + (typeof line.quantity === 'number' ? line.quantity : 0);
      }, 0);

      setReturnItems(items => items.map(i =>
        i.id === itemId ? { ...i, returnQuantity: totalReturnQty } : i
      ));

      return {
        ...prev,
        [itemId]: lines
      };
    });
  };

  // Handle return location quantity blur
  const handleReturnLocationQuantityBlur = (itemId, lineIndex) => {
    setReturnLocationLines(prev => {
      const lines = [...(prev[itemId] || [])];
      const currentQty = lines[lineIndex].quantity;

      if (currentQty === '' || currentQty === null || currentQty === undefined || isNaN(currentQty)) {
        lines[lineIndex] = {
          ...lines[lineIndex],
          quantity: 0
        };

        const totalReturnQty = lines.reduce((sum, line) => {
          return sum + (typeof line.quantity === 'number' ? line.quantity : 0);
        }, 0);

        setReturnItems(items => items.map(i =>
          i.id === itemId ? { ...i, returnQuantity: totalReturnQty } : i
        ));

        setToast({
          type: 'warning',
          message: 'Empty quantity set to 0'
        });

        return {
          ...prev,
          [itemId]: lines
        };
      }

      return prev;
    });
  };

  // Handle return location selection
  const handleReturnLocationChange = (itemId, lineIndex, locationId) => {
    const parsedLocationId = locationId ? parseInt(locationId) : null;

    // Check for duplicate location selection
    if (parsedLocationId) {
      const lines = returnLocationLines[itemId] || [];
      const isDuplicate = lines.some((line, idx) => idx !== lineIndex && line.locationId === parsedLocationId);

      if (isDuplicate) {
        setToast({ type: 'error', message: 'This location is already selected for this product' });
        return;
      }
    }

    setReturnLocationLines(prev => {
      const lines = [...(prev[itemId] || [])];
      lines[lineIndex] = {
        ...lines[lineIndex],
        locationId: parsedLocationId
      };

      return {
        ...prev,
        [itemId]: lines
      };
    });
  };

  // Add return location line
  const handleAddReturnLocationLine = (itemId) => {
    setReturnLocationLines(prev => {
      const lines = [...(prev[itemId] || [])];
      lines.push({ locationId: null, quantity: 0 });

      // Update total return quantity
      const totalReturnQty = lines.reduce((sum, line) => sum + (typeof line.quantity === 'number' ? line.quantity : 0), 0);
      setReturnItems(items => items.map(i =>
        i.id === itemId ? { ...i, returnQuantity: totalReturnQty } : i
      ));

      return {
        ...prev,
        [itemId]: lines
      };
    });
  };

  // Remove return location line
  const handleRemoveReturnLocationLine = (itemId, lineIndex) => {
    setReturnLocationLines(prev => {
      const lines = [...(prev[itemId] || [])];
      if (lines.length <= 1) return prev;

      lines.splice(lineIndex, 1);

      // Update total return quantity
      const totalReturnQty = lines.reduce((sum, line) => sum + (typeof line.quantity === 'number' ? line.quantity : 0), 0);
      setReturnItems(items => items.map(i =>
        i.id === itemId ? { ...i, returnQuantity: totalReturnQty } : i
      ));

      return {
        ...prev,
        [itemId]: lines
      };
    });
  };

  const handleProcessReturn = () => {
    const returningItems = returnItems.filter(item => item.returnQuantity > 0);

    if (returningItems.length === 0) {
      setToast({ type: 'error', message: 'Please specify return quantities (must be > 0)' });
      return;
    }

    if (!refundMethod) {
      setToast({ type: 'error', message: 'Please select a refund method' });
      return;
    }

    // Validate only items being returned (returnQuantity > 0) have locations selected and quantities match
    const itemsWithMissingLocations = [];
    const itemsWithMismatchedQuantities = [];

    for (const item of returningItems) {
      const lines = returnLocationLines[item.id] || [];

      // Check for empty location selections (only check lines with quantity > 0)
      const linesWithQuantity = lines.filter(line => line.quantity > 0);
      const hasEmptyLocation = linesWithQuantity.some(line => !line.locationId);
      if (hasEmptyLocation) {
        itemsWithMissingLocations.push(item.productName);
        continue;
      }

      // Check if location quantities sum matches return quantity
      const totalLocationQty = lines
        .filter(line => line.locationId && line.quantity > 0)
        .reduce((sum, line) => sum + (typeof line.quantity === 'number' ? line.quantity : 0), 0);

      if (totalLocationQty !== item.returnQuantity) {
        itemsWithMismatchedQuantities.push(
          `${item.productName} (return: ${item.returnQuantity}, locations: ${totalLocationQty})`
        );
      }
    }

    if (itemsWithMissingLocations.length > 0) {
      setToast({
        type: 'error',
        message: `Please select locations for: ${itemsWithMissingLocations.join(', ')}`
      });
      return;
    }

    if (itemsWithMismatchedQuantities.length > 0) {
      setToast({
        type: 'error',
        message: `Location quantities must match return quantities: ${itemsWithMismatchedQuantities.join(', ')}`
      });
      return;
    }

    setShowReturnConfirm(true);
  };

  const handleReturnConfirm = async () => {
    try {
      const returningItems = returnItems.filter(item => item.returnQuantity > 0);

      // Build return DTO
      const returnDto = {
        originalDocumentNumber: saleDocumentNumber.trim(),
        refundMethod: refundMethod === 'Card' ? 1 : refundMethod === 'Cash' ? 2 : 3,
        userId: currentUser?.id || 0,
        items: returningItems.map(item => {
          const lines = returnLocationLines[item.id] || [];
          return {
            originalItemId: item.id,
            productId: item.productId,
            productName: item.productName,
            productSKU: item.productSKU,
            returnQuantity: item.returnQuantity,
            unitGross: item.unitGross,
            taxRateId: item.taxRateId,
            locations: lines
              .filter(line => line.locationId && line.quantity > 0)
              .map(line => ({
                toLocationId: line.locationId,
                quantity: typeof line.quantity === 'number' ? line.quantity : 1
              }))
          };
        })
      };

      console.log('Sending return DTO:', JSON.stringify(returnDto, null, 2));
      const response = await api.post('/SalesDocument/process-return', returnDto);

      // If refund method is Gift Card, automatically create a gift card with return value
      if (refundMethod === 'Gift Card') {
        try {
          // Use absolute value since returns have negative totals, but gift cards must be positive
          const giftCardValue = Math.abs(response.totalGross || returnTotals.totalGross);

          const giftCard = await api.post('/GiftCard', {
            value: giftCardValue
          });
          setToast({
            type: 'success',
            message: `Return processed. Document: ${response.returnDocumentNumber}. Gift card created: ${giftCard.code} ($${giftCardValue.toFixed(2)})`
          });
        } catch (error) {
          console.error('Failed to create gift card for return:', error);
          setToast({
            type: 'warning',
            message: `Return processed (${response.returnDocumentNumber}), but gift card creation failed: ${error.message}`
          });
        }
      } else {
        setToast({
          type: 'success',
          message: `Return processed successfully. Document: ${response.returnDocumentNumber}`
        });
      }
      setShowReturnConfirm(false);

      // Reset returns state
      setSaleDocumentNumber('');
      setSaleDocumentLocked(false);
      setOriginalDocument(null);
      setReturnItems([]);
      setReturnLocationLines({});
      setRefundMethod(null);
      setAvailableLocationsForReturn(new Map());
    } catch (error) {
      console.error('Failed to process return:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Return failed';
      setToast({ type: 'error', message: `Return failed: ${errorMsg}` });
      setShowReturnConfirm(false);
    }
  };

  const calculateReturnTotals = () => {
    let totalNet = 0;
    let totalTax = 0;
    let totalGross = 0;

    returnItems.forEach(item => {
      if (item.returnQuantity > 0) {
        const taxRate = taxRates.get(item.taxRateId)?.rate || 0;
        const lineGross = round2(item.unitGross * item.returnQuantity);
        const lineNet = round2(lineGross / (1 + taxRate));
        const lineTax = round2(lineGross - lineNet);

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
            <>
              <div className="pos-search-bar">
                <input
                  type="text"
                  placeholder="Search products by SKU or name..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  onKeyDown={handleScanKeyPress}
                  onFocus={() => productSearchResults.length > 0 && setShowProductDropdown(true)}
                  disabled={isFullyPaid}
                  className="pos-product-search"
                />
                <button
                  className="btn-buy-gift-card"
                  onClick={handleBuyGiftCardClick}
                  disabled={isFullyPaid}
                  title="Buy a Gift Card"
                >
                  Buy Gift Card
                </button>
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
                          SKU: {product.sku}{product.ean ? ` | EAN: ${product.ean}` : ''} | ${product.price.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
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
                        <th style={{ width: "20%", textAlign: "left" }}>Product</th>
                        <th style={{ width: "10%", textAlign: "left" }}>SKU</th>
                        <th style={{ width: "10%", textAlign: "left" }}>EAN</th>
                        <th style={{ width: "6%", textAlign: "center" }}>Total Qty</th>
                        <th style={{ width: "8%", textAlign: "center" }}>Price</th>
                        <th style={{ width: "8%", textAlign: "center" }}>Tax</th>
                        <th style={{ width: "8%", textAlign: "center" }}>Total</th>
                        <th style={{ width: "12%", textAlign: "left" }}>Location</th>
                        <th style={{ width: "10%", textAlign: "left" }}>Qty</th>
                        <th style={{ width: "8%", textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedProducts.map((product) => {
                        // Calculate line total using backend-matching logic
                        const { lineGross } = calculateLineTotal(product);
                        const locations = product.availableLocations || [];
                        const locationLines = productLocationLines[product.id] || [];

                        const firstLine = locationLines[0] || { locationId: null, quantity: 1 };
                        const additionalLines = locationLines.slice(1);

                        return (
                          <React.Fragment key={product.id}>
                            {/* Main product row with first location inline */}
                            <tr
                              className={`pos-product-main-row ${selectedProduct?.id === product.id ? 'selected' : ''}`}
                              onClick={() => !isFullyPaid && handleProductRowClick(product)}
                            >
                              {/* Product Name */}
                              <td style={{ width: "20%", textAlign: "left", fontWeight: "600" }}>
                                {product.name}
                              </td>

                              {/* SKU */}
                              <td style={{ width: "10%", textAlign: "left", fontSize: "0.9rem" }}>
                                {product.sku}
                              </td>

                              {/* EAN */}
                              <td style={{ width: "10%", textAlign: "left", fontSize: "0.9rem" }}>
                                {product.ean || '-'}
                              </td>

                              {/* Total Quantity (sum of all location lines) */}
                              <td style={{ width: "6%", textAlign: "center", fontWeight: "600" }}>
                                {product.quantity}
                              </td>

                              {/* Gross Price (including tax) - European pricing */}
                              <td style={{ width: "8%", textAlign: "center" }}>
                                ${product.unitPriceGross.toFixed(2)}
                              </td>

                              {/* Tax rate percentage */}
                              <td style={{ width: "8%", textAlign: "center" }}>
                                {(product.taxRate * 100).toFixed(0)}%
                              </td>

                              {/* Total (gross price × quantity) - matches backend rounding */}
                              <td style={{ width: "8%", textAlign: "center", fontWeight: "600" }}>
                                ${lineGross.toFixed(2)}
                              </td>

                              {/* First Location Selection - Hidden for gift cards (digital products) */}
                              <td style={{ width: "12%", textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
                                {product.isGiftCard ? (
                                  <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.9rem" }}>
                                    Digital product
                                  </span>
                                ) : (
                                  <select
                                    value={firstLine.locationId || ''}
                                    onChange={(e) => handleLocationChange(product.id, 0, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={isFullyPaid}
                                    className={`pos-location-select ${!firstLine.locationId ? 'not-selected' : ''}`}
                                  >
                                    <option value="">Select location...</option>
                                    {locations.map(loc => {
                                      const isAlreadySelected = locationLines.some((line, idx) => idx !== 0 && line.locationId === loc.locationId);
                                      return (
                                        <option key={loc.locationId} value={loc.locationId} disabled={isAlreadySelected}>
                                          {loc.locationCode} (Qty: {loc.quantity}) {isAlreadySelected ? '- Already selected' : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                )}
                              </td>

                              {/* First Location Quantity with action buttons inline - Hidden for gift cards */}
                              <td style={{ width: "10%", textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
                                {!product.isGiftCard && (
                                  <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                                    <input
                                      type="number"
                                      min="1"
                                      value={firstLine.quantity}
                                      onChange={(e) => handleQuantityChange(product.id, 0, e.target.value)}
                                      onBlur={() => handleQuantityBlur(product.id, 0)}
                                      onClick={(e) => e.stopPropagation()}
                                      disabled={isFullyPaid}
                                      className="pos-quantity-input"
                                    />
                                    {/* Show + button only if there are still unselected locations available */}
                                    {locationLines.length < locations.length && (
                                      <button
                                        className="btn-add-location-line"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddLocationLine(product.id);
                                        }}
                                        disabled={isFullyPaid}
                                        title="Add another location"
                                      >
                                        +
                                      </button>
                                    )}
                                    {locationLines.length > 1 && (
                                      <button
                                        className="btn-remove-location-line"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveLocationLine(product.id, 0);
                                        }}
                                        disabled={isFullyPaid}
                                        title="Remove this location line"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Remove Product Button - Trash icon */}
                              <td style={{ width: "8%", textAlign: "center" }}>
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

                            {/* Additional location lines as sub-rows (if any) - Not applicable for gift cards */}
                            {!product.isGiftCard && additionalLines.map((line, additionalIndex) => {
                              const lineIndex = additionalIndex + 1; // Offset by 1 since first line is in main row
                              return (
                                <tr
                                  key={`${product.id}-line-${lineIndex}`}
                                  className="pos-location-line-row"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Empty product columns */}
                                  <td style={{ width: "20%", paddingLeft: "2rem", textAlign: "left" }}>
                                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                      Location {lineIndex + 1}
                                    </span>
                                  </td>
                                  <td style={{ width: "10%", textAlign: "left" }}></td>
                                  <td style={{ width: "10%", textAlign: "left" }}></td>
                                  <td style={{ width: "6%", textAlign: "center" }}></td>
                                  <td style={{ width: "8%", textAlign: "center" }}></td>
                                  <td style={{ width: "8%", textAlign: "center" }}></td>
                                  <td style={{ width: "8%", textAlign: "center" }}></td>

                                  {/* Location Selection */}
                                  <td style={{ width: "12%", textAlign: "left" }}>
                                    <select
                                      value={line.locationId || ''}
                                      onChange={(e) => handleLocationChange(product.id, lineIndex, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      disabled={isFullyPaid}
                                      className={`pos-location-select ${!line.locationId ? 'not-selected' : ''}`}
                                    >
                                      <option value="">Select location...</option>
                                      {locations.map(loc => {
                                        const isAlreadySelected = locationLines.some((l, idx) => idx !== lineIndex && l.locationId === loc.locationId);
                                        return (
                                          <option key={loc.locationId} value={loc.locationId} disabled={isAlreadySelected}>
                                            {loc.locationCode} (Qty: {loc.quantity}) {isAlreadySelected ? '- Already selected' : ''}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </td>

                                  {/* Location Quantity with action buttons inline */}
                                  <td style={{ width: "10%", textAlign: "left" }}>
                                    <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                                      <input
                                        type="number"
                                        min="1"
                                        value={line.quantity}
                                        onChange={(e) => handleQuantityChange(product.id, lineIndex, e.target.value)}
                                        onBlur={() => handleQuantityBlur(product.id, lineIndex)}
                                        onClick={(e) => e.stopPropagation()}
                                        disabled={isFullyPaid}
                                        className="pos-quantity-input"
                                      />
                                      {/* No + button on additional lines - only on first line */}
                                      <button
                                        className="btn-remove-location-line"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveLocationLine(product.id, lineIndex);
                                        }}
                                        disabled={isFullyPaid}
                                        title="Remove this location line"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </td>

                                  {/* Empty cell for product remove button */}
                                  <td style={{ width: "8%", textAlign: "center" }}></td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
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
                  <table className="pos-products-table pos-products-table-clean-header">
                    <thead>
                      <tr>
                        <th style={{ width: "20%", textAlign: "left" }}>Product</th>
                        <th style={{ width: "10%", textAlign: "left" }}>SKU</th>
                        <th style={{ width: "10%", textAlign: "left" }}>EAN</th>
                        <th style={{ width: "6%", textAlign: "center" }}>Orig Qty</th>
                        <th style={{ width: "8%", textAlign: "center" }}>Price</th>
                        <th style={{ width: "8%", textAlign: "center" }}>Tax</th>
                        <th style={{ width: "8%", textAlign: "center" }}>Return Total</th>
                        <th style={{ width: "18%", textAlign: "left" }}>Return Location</th>
                        <th style={{ width: "10%", textAlign: "left" }}>Return Qty</th>
                        <th style={{ width: "8%", textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((item) => {
                        // Get product's current locations (where it exists)
                        const productLocations = availableLocationsForReturn.get(item.productId) || [];

                        // Combine all warehouse locations with stock info
                        const locationsWithStock = (allWarehouseLocations || []).map(loc => {
                          const stockInfo = productLocations.find(pl => pl.locationId === loc.id);
                          return {
                            locationId: loc.id,
                            locationCode: loc.locationCode,
                            currentStock: stockInfo ? stockInfo.quantity : 0,
                            hasStock: !!stockInfo
                          };
                        });

                        const locationLines = returnLocationLines[item.id] || [];
                        const firstLine = locationLines[0] || { locationId: null, quantity: 0 };
                        const additionalLines = locationLines.slice(1);

                        // Calculate refund for this item
                        const taxRate = taxRates.get(item.taxRateId)?.rate || 0;
                        const lineGross = round2(item.unitGross * item.returnQuantity);
                        const lineNet = round2(lineGross / (1 + taxRate));
                        const lineTax = round2(lineGross - lineNet);

                        return (
                          <React.Fragment key={item.id}>
                            {/* Main return item row with first location inline */}
                            <tr className="pos-product-main-row">
                              {/* Product Name */}
                              <td style={{ width: "20%", textAlign: "left", fontWeight: "600" }}>
                                {item.productName}
                              </td>

                              {/* SKU */}
                              <td style={{ width: "10%", textAlign: "left", fontSize: "0.9rem" }}>
                                {item.productSKU}
                              </td>

                              {/* EAN */}
                              <td style={{ width: "10%", textAlign: "left", fontSize: "0.9rem" }}>
                                {item.ean || '-'}
                              </td>

                              {/* Original Quantity */}
                              <td style={{ width: "6%", textAlign: "center" }}>
                                {item.maxQuantity}
                              </td>

                              {/* Unit Price Gross */}
                              <td style={{ width: "8%", textAlign: "center" }}>
                                ${item.unitGross.toFixed(2)}
                              </td>

                              {/* Tax Rate */}
                              <td style={{ width: "8%", textAlign: "center" }}>
                                {(taxRate * 100).toFixed(0)}%
                              </td>

                              {/* Return Total (with tax) */}
                              <td style={{ width: "8%", textAlign: "center", fontWeight: "600" }}>
                                ${lineGross.toFixed(2)}
                              </td>

                              {/* First Return Location Selection */}
                              <td style={{ width: "18%", textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={firstLine.locationId || ''}
                                  onChange={(e) => handleReturnLocationChange(item.id, 0, e.target.value)}
                                  className={`pos-location-select ${!firstLine.locationId ? 'not-selected' : ''}`}
                                >
                                  <option value="">Select location...</option>
                                  {locationsWithStock.map(loc => {
                                    const isAlreadySelected = locationLines.some((line, idx) => idx !== 0 && line.locationId === loc.locationId);
                                    const stockInfo = loc.hasStock ? ` (Stock: ${loc.currentStock})` : '';
                                    return (
                                      <option key={loc.locationId} value={loc.locationId} disabled={isAlreadySelected}>
                                        {loc.locationCode}{stockInfo} {isAlreadySelected ? '- Selected' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </td>

                              {/* First Return Location Quantity with action buttons */}
                              <td style={{ width: "10%", textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.maxQuantity}
                                    value={firstLine.quantity}
                                    onChange={(e) => handleReturnLocationQuantityChange(item.id, 0, e.target.value)}
                                    onBlur={() => handleReturnLocationQuantityBlur(item.id, 0)}
                                    className="pos-quantity-input"
                                  />
                                  {/* Show + button only if there are still unselected locations AND not all quantity is allocated */}
                                  {(() => {
                                    const allocatedQty = locationLines.reduce((sum, line) => sum + (typeof line.quantity === 'number' ? line.quantity : 0), 0);
                                    const canAddMore = allocatedQty < item.returnQuantity && locationLines.length < locationsWithStock.length;
                                    return canAddMore && (
                                      <button
                                        className="btn-add-location-line"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddReturnLocationLine(item.id);
                                        }}
                                        title="Add another location"
                                      >
                                        +
                                      </button>
                                    );
                                  })()}
                                  {locationLines.length > 1 && (
                                    <button
                                      className="btn-remove-location-line"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveReturnLocationLine(item.id, 0);
                                      }}
                                      title="Remove this location line"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Empty cell */}
                              <td style={{ width: "8%", textAlign: "center" }}></td>
                            </tr>

                            {/* Additional location lines as sub-rows (if any) */}
                            {additionalLines.map((line, additionalIndex) => {
                              const lineIndex = additionalIndex + 1;
                              return (
                                <tr
                                  key={`${item.id}-line-${lineIndex}`}
                                  className="pos-location-line-row"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Empty product columns */}
                                  <td style={{ width: "20%", paddingLeft: "2rem", textAlign: "left" }}>
                                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                      Location {lineIndex + 1}
                                    </span>
                                  </td>
                                  <td style={{ width: "10%", textAlign: "left" }}></td>
                                  <td style={{ width: "10%", textAlign: "left" }}></td>
                                  <td style={{ width: "6%", textAlign: "center" }}></td>
                                  <td style={{ width: "8%", textAlign: "center" }}></td>
                                  <td style={{ width: "8%", textAlign: "center" }}></td>
                                  <td style={{ width: "8%", textAlign: "center" }}></td>

                                  {/* Return Location Selection */}
                                  <td style={{ width: "18%", textAlign: "left" }}>
                                    <select
                                      value={line.locationId || ''}
                                      onChange={(e) => handleReturnLocationChange(item.id, lineIndex, e.target.value)}
                                      className={`pos-location-select ${!line.locationId ? 'not-selected' : ''}`}
                                    >
                                      <option value="">Select location...</option>
                                      {locationsWithStock.map(loc => {
                                        const isAlreadySelected = locationLines.some((l, idx) => idx !== lineIndex && l.locationId === loc.locationId);
                                        const stockInfo = loc.hasStock ? ` (Stock: ${loc.currentStock})` : '';
                                        return (
                                          <option key={loc.locationId} value={loc.locationId} disabled={isAlreadySelected}>
                                            {loc.locationCode}{stockInfo} {isAlreadySelected ? '- Selected' : ''}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </td>

                                  {/* Return Location Quantity with action buttons */}
                                  <td style={{ width: "10%", textAlign: "left" }}>
                                    <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                                      <input
                                        type="number"
                                        min="0"
                                        max={item.maxQuantity}
                                        value={line.quantity}
                                        onChange={(e) => handleReturnLocationQuantityChange(item.id, lineIndex, e.target.value)}
                                        onBlur={() => handleReturnLocationQuantityBlur(item.id, lineIndex)}
                                        className="pos-quantity-input"
                                      />
                                      <button
                                        className="btn-remove-location-line"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveReturnLocationLine(item.id, lineIndex);
                                        }}
                                        title="Remove this location line"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </td>

                                  {/* Empty cell */}
                                  <td style={{ width: "8%", textAlign: "center" }}></td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
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
                {payments.map((payment, index) => {
                  // For Cash: show amountTendered; for Card/Gift Card: show amount charged
                  const displayAmount = payment.method === 'Cash' && payment.amountTendered
                    ? payment.amountTendered
                    : payment.amount;

                  return (
                    <div
                      key={index}
                      className="pos-totals-row pos-payment-row clickable"
                      onClick={() => handleRemovePayment(payment.method)}
                      title="Click to remove this payment"
                    >
                      <span>Paid with {payment.method}:</span>
                      <span>${displayAmount.toFixed(2)}</span>
                    </div>
                  );
                })}
              </>
            )}

            <div className="pos-totals-divider"></div>

            {/* Summary section */}
            {activeMode === 'Sale' && payments.length > 0 ? (
              <>
                <div className="pos-totals-row">
                  <span>Total to Pay:</span>
                  <span>${totals.totalGross}</span>
                </div>
                <div className="pos-totals-row">
                  <span>Total Paid:</span>
                  <span>${totalTendered.toFixed(2)}</span>
                </div>
                <div className="pos-totals-row pos-total-row">
                  <span>Total Change:</span>
                  <span style={{ color: '#dc2626', fontWeight: 'bold' }}>${change.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="pos-totals-row pos-total-row">
                <span>Total:</span>
                <span>
                  ${activeMode === 'Sale' ? totals.totalGross : returnTotals.totalGross}
                </span>
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
                    <div>{selectedClient.email}</div>
                    <div>Type: {getClientTypeLabel(selectedClient.type)}</div>
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
                  placeholder="Payment amount"
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

                {/* Cash payment change display */}
                {paymentMethod === 'Cash' && parseFloat(paymentAmount) > remainingBalance && (
                  <div className="pos-change-display">
                    Change: ${(parseFloat(paymentAmount) - remainingBalance).toFixed(2)}
                  </div>
                )}
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
              {/* Section 1: Refund Method */}
              <div className="pos-section">
                <h4>Refund Method</h4>
                <div className="pos-radio-group">
                  <label className={refundMethod === 'Card' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="refundMethod"
                      value="Card"
                      checked={refundMethod === 'Card'}
                      onChange={(e) => setRefundMethod(e.target.value)}
                      disabled={!saleDocumentLocked}
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
                      disabled={!saleDocumentLocked}
                    />
                    Cash
                  </label>
                  <label className={refundMethod === 'Gift Card' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="refundMethod"
                      value="Gift Card"
                      checked={refundMethod === 'Gift Card'}
                      onChange={(e) => setRefundMethod(e.target.value)}
                      disabled={!saleDocumentLocked}
                    />
                    Gift Card
                  </label>
                </div>
              </div>

              <div className="pos-section-divider"></div>

              {/* Section 2: Return Actions */}
              <div className="pos-section">
                <h4>Actions</h4>
                <div className="pos-payment-buttons">
                  <button
                    className="pos-pay-button"
                    onClick={handleProcessReturn}
                    disabled={returnItems.length === 0 || returnItems.every(item => item.returnQuantity === 0)}
                  >
                    Process Return
                  </button>
                  {saleDocumentLocked && (
                    <button
                      className="pos-revert-button"
                      onClick={() => {
                        setSaleDocumentNumber('');
                        setSaleDocumentLocked(false);
                        setOriginalDocument(null);
                        setReturnItems([]);
                        setReturnLocationLines({});
                        setRefundMethod(null);
                        setAvailableLocationsForReturn(new Map());
                        setToast({ type: 'success', message: 'Return cleared' });
                      }}
                    >
                      Clear Return
                    </button>
                  )}
                </div>
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
                        <td>{getClientTypeLabel(client.type)}</td>
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
      <ClientFormModal
        isOpen={showClientCreateModal}
        onClose={() => setShowClientCreateModal(false)}
        mode="create"
        onClientCreated={handleClientCreated}
      />

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

      {/* Buy Gift Card Modal */}
      {showBuyGiftCardModal && (
        <Modal
          title="Buy Gift Card"
          onClose={() => setShowBuyGiftCardModal(false)}
        >
          <div className="pos-gift-card-modal">
            <p>Enter the value for the gift card</p>
            <label>
              Gift Card Value ($20 - $1000):
              <input
                type="number"
                step="0.01"
                min="20"
                max="1000"
                value={giftCardValue}
                onChange={(e) => setGiftCardValue(e.target.value)}
                className="pos-price-input"
                placeholder="Enter amount..."
                autoFocus
              />
            </label>
            <div className="pos-modal-actions">
              <button
                className="btn-action btn-cancel-modal"
                onClick={() => setShowBuyGiftCardModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-action btn-choose-modal"
                onClick={handleBuyGiftCardConfirm}
                disabled={!giftCardValue || parseFloat(giftCardValue) < 20 || parseFloat(giftCardValue) > 1000}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Gift Card Payment Modal */}
      {showGiftCardPaymentModal && (
        <Modal
          title="Gift Card Payment"
          onClose={() => {
            setShowGiftCardPaymentModal(false);
            setGiftCardCode('');
            setValidatedGiftCard(null);
          }}
        >
          <div className="pos-gift-card-modal">
            <p>Enter the gift card number to validate</p>
            <label>
              Gift Card Number:
              <input
                type="text"
                value={giftCardCode}
                onChange={(e) => setGiftCardCode(e.target.value)}
                className="pos-price-input"
                placeholder="Enter gift card code..."
                autoFocus
              />
            </label>

            {validatedGiftCard && (
              <div className="pos-gift-card-validated">
                <p className="validation-success">✓ Gift card validated</p>
                <p className="gift-card-balance">Balance: ${validatedGiftCard.value.toFixed(2)}</p>
              </div>
            )}

            {validatedGiftCard && (
              <label>
                Payment Amount:
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Math.min(validatedGiftCard.value, remainingBalance)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="pos-price-input"
                  placeholder="Enter amount..."
                />
              </label>
            )}

            <div className="pos-modal-actions">
              <button
                className="btn-action btn-cancel-modal"
                onClick={() => {
                  setShowGiftCardPaymentModal(false);
                  setGiftCardCode('');
                  setValidatedGiftCard(null);
                }}
              >
                Cancel
              </button>
              {!validatedGiftCard ? (
                <button
                  className="btn-action btn-choose-modal"
                  onClick={handleGiftCardValidate}
                  disabled={!giftCardCode.trim()}
                >
                  Validate
                </button>
              ) : (
                <button
                  className="btn-action btn-choose-modal"
                  onClick={handleGiftCardPaymentConfirm}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                >
                  Pay
                </button>
              )}
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
