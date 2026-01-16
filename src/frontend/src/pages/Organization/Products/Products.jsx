// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { api } from "../../../api/apiClient";
import { useSearchParams } from "react-router-dom";
import Header from "../../../components/Header";
import BaseListPage from "../../BaseListPage";
import AddEditModal from "./Modals/AddEditModal";
import StatusConfirmDialog from "./Modals/StatusConfirmDialog";
import { useToast } from "../../../components/ToastContext";

// === ROLE HELPER FUNCTIONS ===
const ROLE_HIERARCHY = ["Marketer", "ItTechnician", "ShopAssistant", "DeputyManager", "Manager", "CEO", "Admin", "Root"];
const getRoleLevel = (role) => ROLE_HIERARCHY.indexOf(role);
const isDeputyManagerOrAbove = (role) => ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf("DeputyManager");

// === COMPONENT ===
/**
 * Products page - manages product catalog with CRUD operations
 * Uses BaseListPage for consistent list UI with infinite scroll, sorting, and filtering
 * Supports creating, editing, and activating/deactivating products
 * Features advanced filtering by price, category, defective status, and active status
 */
export default function Products() {
  const { showToast } = useToast();
  // === STATE ===
  const [searchParams, setSearchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [actionableProduct, setActionableProduct] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [categories, setCategories] = useState(new Map());
  const [taxRates, setTaxRates] = useState(new Map());

  const [products, setProducts] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isDelayedRefresh, setIsDelayedRefresh] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    categoryId: "",
    defective: "",
    isActive: "",
  });

  const [searchQuery, setSearchQuery] = useState("");

  const observerRef = useRef(null);
  const loadedPages = useRef(new Set());
  const filtersRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const userRole = user?.role;

  // Permission checks
  const canAddEdit = isDeputyManagerOrAbove(userRole);

  // === INITIAL DATA LOADING ===
  /**
   * Loads initial reference data (categories and tax rates)
   * This data is needed before products can be displayed properly
   */
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [categoriesRes, taxRatesRes] = await Promise.all([
          api.get("/Categories"),
          api.get("/TaxRate"),
        ]);

        const categoriesMap = new Map(categoriesRes.items.map(c => [c.id, c.name]));
        const taxRatesMap = new Map(taxRatesRes.map(t => [t.id, t.rate]));

        setCategories(categoriesMap);
        setTaxRates(taxRatesMap);
        setInitialDataLoaded(true);
      } catch (err) {
        console.error("Failed to fetch initial data", err);
        setError("Failed to load initial page data.");
      }
    };

    fetchInitialData();
  }, []);

  /**
   * Handles auto-search from query parameters
   * Allows deep-linking to search results
   */
  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam && initialDataLoaded) {
      setSearchQuery(searchParam);
      setIsDelayedRefresh(false);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, initialDataLoaded, setSearchParams]);

  // === DATA FETCHING ===
  /**
   * Fetches products from API with pagination, filtering, and sorting
   * @param {number} page - Page number to fetch
   * @param {object} currentFilters - Filter values to apply
   * @param {string} currentSearchQuery - Search query string
   * @param {string} currentSortColumn - Column to sort by
   * @param {string} currentSortDirection - Sort direction (asc/desc)
   */
  const fetchProductsData = async (
    page,
    currentFilters,
    currentSearchQuery,
    currentSortColumn,
    currentSortDirection
  ) => {
    try {
      setLoading(true);
      const source = axios.CancelToken.source();
      const { items, totalPages } = await api.get("/Products", {
        params: {
          PageNumber: page,
          PageSize: 50,
          ...(currentSearchQuery && { q: currentSearchQuery }),
          ...(currentFilters.minPrice && { minPrice: currentFilters.minPrice }),
          ...(currentFilters.maxPrice && { maxPrice: currentFilters.maxPrice }),
          ...(currentFilters.categoryId && { categoryId: currentFilters.categoryId }),
          ...(currentFilters.defective !== "" && { defective: currentFilters.defective }),
          ...(currentFilters.isActive !== "" && { isActive: currentFilters.isActive }),
          ...(currentSortColumn && { orderBy: currentSortColumn }),
          ...(currentSortDirection && { sortDirection: currentSortDirection }),
        },
        cancelToken: source.token,
      });

      if (items?.length) {
        setProducts(prev => page === 1 ? items : [...prev, ...items.filter(i => !prev.some(p => p.id === i.id))]);
        setHasMore(page < (totalPages || 1));
      } else {
        setProducts([]);
        setHasMore(false);
      }
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error(err);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Debounced fetch for search and filter changes
   * Waits 1 second before executing to reduce API calls
   */
  const debouncedFetchProducts = useCallback(() => {
    if (!initialDataLoaded) return;
    const delay = setTimeout(() => {
      setProducts([]);
      loadedPages.current.clear();
      setPageNumber(1);
      fetchProductsData(1, filters, searchQuery, sortColumn, sortDirection);
      setIsDelayedRefresh(false);
    }, 1000);

    return () => clearTimeout(delay);
  }, [filters, searchQuery, initialDataLoaded, sortColumn, sortDirection]);

  /**
   * Immediate fetch for sort changes
   */
  const immediateFetchProducts = useCallback(() => {
    if (!initialDataLoaded) return;
    setProducts([]);
    loadedPages.current.clear();
    setPageNumber(1);
    fetchProductsData(1, filters, searchQuery, sortColumn, sortDirection);
  }, [sortColumn, sortDirection, filters, searchQuery, initialDataLoaded]);

  // === EFFECTS ===
  /**
   * Triggers fetch based on delayed or immediate refresh flag
   */
  useEffect(() => {
    if (isDelayedRefresh) {
      debouncedFetchProducts();
    } else {
      immediateFetchProducts();
    }
  }, [debouncedFetchProducts, immediateFetchProducts, isDelayedRefresh]);

  /**
   * Infinite scroll observer
   */
  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setPageNumber((prev) => prev + 1);
      }
    });
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, hasMore]);

  /**
   * Load next page when pageNumber changes
   */
  useEffect(() => {
    if (pageNumber > 1) {
      fetchProductsData(pageNumber, filters, searchQuery, sortColumn, sortDirection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber]);

  /**
   * Close filters panel when clicking outside
   */
  useEffect(() => {
    if (!showFilters) return;

    const handleClickOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showFilters]);

  // === TABLE CONFIGURATION ===
  const columns = [
    { key: "sku", label: "SKU", width: "15%", sortable: true },
    { key: "ean", label: "EAN", width: "15%", sortable: false },
    { key: "name", label: "Name", width: "25%", sortable: true },
    { key: "price", label: "Price", width: "15%", sortable: true },
    { key: "defective", label: "Defective", width: "15%", sortable: true },
    { key: "category", label: "Category", width: "10%", sortable: true },
    { key: "isactive", label: "Active", width: "10%", sortable: true },
  ];

  const rows = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    ean: p.ean || "—",
    name: p.name,
    price: p.price.toFixed(2),
    defective: p.defective ? "Yes" : "No",
    category: categories.get(p.categoryId) || "—",
    isactive: p.isActive ? "Yes" : "No",
  }));

  const productDetailsConfig = {
    status: {
      key: "isActive",
      activeLabel: "Active",
      inactiveLabel: "Inactive",
    },
    fields: [
      { label: "Id", key: "id" },
      { label: "SKU", key: "sku" },
      { label: "EAN", key: "ean" },
      { label: "Name", key: "name" },
      { label: "Price", key: "price" },
      {
        label: "Category",
        key: "categoryId",
        render: (data) => categories.get(data.categoryId) || "—",
      },
      {
        label: "Tax Rate",
        key: "taxRateId",
        render: (data) => {
          const rate = taxRates.get(data.taxRateId);
          return rate !== undefined ? `${(rate * 100).toFixed(0)}%` : "—";
        },
      },
      { label: "Defective", key: "defective", isColumn: true },
      { label: "Description", key: "description", isColumn: true },
    ],
  };

  // === EVENT HANDLERS ===
  /**
   * Handles search input changes with debounce
   */
  const handleSearchChange = (value) => {
    setIsDelayedRefresh(true);
    setSearchQuery(value);
    setSelectedRow(null);
    setSelectedProductDetails(null);
  };

  /**
   * Handles text input filter changes (price fields) with debounce
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "minPrice" || name === "maxPrice") {
      setIsDelayedRefresh(true);
    } else {
      setIsDelayedRefresh(false);
    }
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handles boolean/select filter changes without debounce
   */
  const handleBooleanChange = (e) => {
    setIsDelayedRefresh(false);
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value === "" ? "" : value === "true",
    }));
  };

  /**
   * Handles row selection and loads full product details
   */
  const handleRowSelect = async (row) => {
    if (!row) {
      setSelectedRow(null);
      setSelectedProductDetails(null);
      return;
    }

    setSelectedRow(row);
    try {
      const full = await api.get(`/Products/${row.id}`);
      setSelectedProductDetails(full);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to load product details.", "error",
      );
    }
  };

  /**
   * Handles column header clicks for sorting
   * Cycles through: asc -> desc -> no sort
   */
  const handleSort = (column) => {
    const colDef = columns.find(c => c.key === column);
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

  /**
   * Opens add modal for creating new product
   */
  const handleAdd = () => {
    if (!canAddEdit) {
      showToast("You don't have permission to add products", "error");
      return;
    }
    setSelectedRow(null);
    setSelectedProductDetails(null);
    setShowModal(true);
  };

  /**
   * Opens edit modal and loads full product details if needed
   */
  const handleEdit = async (row) => {
    if (!canAddEdit) {
      showToast("You don't have permission to edit products", "error");
      return;
    }
    if (selectedProductDetails && selectedProductDetails.id === row.id && selectedProductDetails.description) {
      setShowModal(true);
      return;
    }

    try {
      const full = await api.get(`/Products/${row.id}`);
      setSelectedProductDetails(full);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to load full product details.", "error");
    }
  };

  /**
   * Opens confirmation dialog for status toggle
   */
  const handleDelete = (row) => {
    if (!canAddEdit) {
      showToast("You don't have permission to activate/deactivate products", "error");
      return;
    }
    setActionableProduct({ ...row, isActive: row.isactive === "Yes" });
    setShowConfirm(true);
  };

  /**
   * Confirms and executes status change (activate/deactivate)
   */
  const handleConfirmStatusChange = async () => {
    if (!actionableProduct) return;

    try {
      setLoading(true);
      let newStatus;
      if (actionableProduct.isActive) {
        await api.delete(`/Products/${actionableProduct.id}`);
        newStatus = false;
        showToast("Product deactivated successfully!", "success",
        );
      } else {
        await api.post(`/Products/${actionableProduct.id}/restore`);
        newStatus = true;
        showToast("Product activated successfully!", "success",
        );
      }

      const newIsActiveString = newStatus ? "Yes" : "No";
      if (selectedRow && selectedRow.id === actionableProduct.id) {
        setSelectedRow(prev => ({ ...prev, isactive: newIsActiveString }));
      }
      if (selectedProductDetails && selectedProductDetails.id === actionableProduct.id) {
        setSelectedProductDetails(prev => ({ ...prev, isActive: newStatus }));
      }

      loadedPages.current.clear();
      setPageNumber(1);
      immediateFetchProducts();

    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to update the product.", "error",
      );
    } finally {
      setLoading(false);
      setShowConfirm(false);
      setActionableProduct(null);
    }
  };

  /**
   * Handles successful product creation or update
   * Refreshes data and reselects the modified product
   */
  const handleSuccess = async (productId) => {
    setShowModal(false);

    if (productId) {
      try {
        const full = await api.get(`/Products/${productId}`);
        setSelectedProductDetails(full);
        setSelectedRow({
          id: full.id,
          sku: full.sku,
          name: full.name,
          price: full.price.toFixed(2),
          defective: full.defective ? "Yes" : "No",
          category: categories.get(full.categoryId) || "—",
          isactive: full.isActive ? "Yes" : "No",
        });
      } catch (err) {
        console.error("Failed to re-fetch updated product details:", err);
      }
    }

    loadedPages.current.clear();
    setPageNumber(1);
    immediateFetchProducts();

    showToast(productId
        ? "Product updated successfully!"
        : "Product created successfully!", "success",
    );
  };

  // === RENDER ===
  return (
    <div className="page-container">
      <Header
        user={user}
        onLogout={() => {
          localStorage.clear();
          window.location.href = "/";
        }}
      />
      <main className="page-content">
        <BaseListPage
          title="Products"
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          selectedRow={selectedRow}
          onSelectRow={handleRowSelect}
          detailsData={selectedProductDetails}
          detailsConfig={initialDataLoaded ? productDetailsConfig : null}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onAdd={handleAdd}
          disableAdd={!canAddEdit}
          onEdit={handleEdit}
          disableEdit={!selectedRow || !canAddEdit}
          onDelete={handleDelete}
          disableDelete={!selectedRow || !canAddEdit}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSearchChange={handleSearchChange}
          searchValue={searchQuery}
          deleteButtonLabel={!selectedRow || selectedRow.isactive === "Yes" ? "Deactivate" : "Activate"}
          deleteButtonIcon={
            !selectedRow || selectedRow.isactive === "Yes" ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <path fill="none" stroke="currentColor" strokeWidth="2" d="M18 6L6 18M6 6l12 12"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <path fill="none" stroke="currentColor" strokeWidth="2" d="M20 6L9 17l-5-5"/>
              </svg>
            )
          }
          deleteButtonClass={
            !selectedRow || selectedRow.isactive === "Yes"
              ? "btn-confirm-negative"
              : "btn-confirm-positive"
          }
        />

        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>
            <div className="filters-row">
              <input
                type="number"
                name="minPrice"
                placeholder="Min price"
                value={filters.minPrice}
                onChange={handleInputChange}
              />
              <input
                type="number"
                name="maxPrice"
                placeholder="Max price"
                value={filters.maxPrice}
                onChange={handleInputChange}
              />
            </div>
            <select
              name="categoryId"
              value={filters.categoryId}
              onChange={handleInputChange}
            >
              <option value="">All Categories</option>
              {Array.from(categories.entries()).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select
              name="defective"
              value={filters.defective}
              onChange={handleBooleanChange}
            >
              <option value="">All products</option>
              <option value="true">Only defective</option>
              <option value="false">Only non-defective</option>
            </select>
            <select
              name="isActive"
              value={filters.isActive}
              onChange={handleBooleanChange}
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        )}

        <div ref={observerRef} style={{ height: "1px" }} />
        {loading && (
          <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>
        )}
      </main>

      <AddEditModal
        show={showModal}
        product={selectedProductDetails}
        categories={categories}
        taxRates={taxRates}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />

      <StatusConfirmDialog
        product={actionableProduct}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
