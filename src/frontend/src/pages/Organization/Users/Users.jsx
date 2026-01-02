// === IMPORTS ===
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../../../api/apiClient";
import Header from "../../../components/Header";
import BaseListPage from "../../BaseListPage";
import AddEditModal from "./Modals/AddEditModal";
import StatusConfirmDialog from "./Modals/StatusConfirmDialog";
import ChangePasswordModal from "./Modals/ChangePasswordModal";
import ChangeLoginModal from "./Modals/ChangeLoginModal";
import MessageBox from "../../../components/MessageBox";

// === CONSTANTS ===
const roles = [
  "Root",
  "Admin",
  "CEO",
  "Manager",
  "DeputyManager",
  "ShopAssistant",
  "ItTechnician",
  "Marketer",
];

const isManagerOrAbove = (role) =>
  ["Root", "Admin", "CEO", "Manager", "DeputyManager"].includes(role);

const formatDateForInput = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().split("T")[0];
};

const formatDateReadable = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
};

const initialAddress = {
  country: "",
  city: "",
  street: "",
  building: "",
  premises: "",
  postalCode: "",
};

const sortKeyMap = {
  firstName: "firstName",
  lastName: "lastName",
  email: "email",
  role: "role",
  isActiveLabel: "isActive",
};

// === COMPONENT ===
/**
 * Users page - manages system users with CRUD operations
 * Uses BaseListPage for consistent list UI with infinite scroll, sorting, and filtering
 * Supports creating, editing, activating/deactivating users, and changing passwords/logins
 * Includes role-based access control for user management operations
 */
export default function Users() {
  // === STATE ===
  const [users, setUsers] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState(null);

  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [actionableUser, setActionableUser] = useState(null);
  const lastSelectedId = useRef(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userFormMode, setUserFormMode] = useState("create");
  const [formUserData, setFormUserData] = useState(null);
  const [formAddressData, setFormAddressData] = useState(initialAddress);

  const [filters, setFilters] = useState({
    role: "",
    isActive: "",
  });
  const [sortColumn, setSortColumn] = useState("lastName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const observerRef = useRef(null);
  const loadedPages = useRef(new Set());
  const filtersRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const canManageUsers = isManagerOrAbove(currentUser?.role);
  const canChangeAnyPassword = isManagerOrAbove(currentUser?.role);
  const disableManageActions = !canManageUsers;

  // === DATA FETCHING ===
  /**
   * Fetches users with pagination, filtering, and sorting
   * Uses loadedPages ref to prevent duplicate requests
   * @param {number} page - Page number to fetch
   * @param {boolean} reset - If true, clears cache and fetches from page 1
   */
  const fetchUsers = useCallback(
    async (page = 1, reset = false) => {
      if (loadedPages.current.has(page) && !reset) return;
      loadedPages.current.add(page);

      try {
        setLoading(true);
        const mappedSort = sortKeyMap[sortColumn] || undefined;
        const { items = [], totalPages = 1 } = await api.get("/Users", {
          params: {
            PageNumber: page,
            PageSize: 20,
            ...(searchQuery && { search: searchQuery }),
            ...(filters.role && { role: filters.role }),
            ...(filters.isActive !== "" && { isActive: filters.isActive }),
            ...(mappedSort && { orderBy: mappedSort }),
            ...(sortDirection && { sortDirection }),
          },
        });

        setUsers((prev) =>
          page === 1 ? items : [...prev, ...items.filter((i) => !prev.some((p) => p.id === i.id))]
        );
        setHasMore(page < (totalPages || 1));

        if (page === 1 && items.length === 0) {
          setSelectedRow(null);
          setSelectedUserDetails(null);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    },
    [filters, searchQuery, sortColumn, sortDirection]
  );

  /**
   * Fetches and selects a specific user by ID
   * Updates both table row and details panel with latest data
   */
  const fetchAndSelectUser = useCallback(
    async (userId) => {
      if (!userId) return;
      try {
        const full = await api.get(`/Users/${userId}`);
        let address = null;
        if (full?.addressId) {
          try {
            address = await api.get(`/Addresses/${full.addressId}`);
          } catch (addrErr) {
            console.error("Failed to load address", addrErr);
          }
        }
        const mappedRow = toRow(full);
        setSelectedRow(mappedRow);
        setSelectedUserDetails({ ...full, isActive: full.isActive ?? mappedRow._isActive, address });
        lastSelectedId.current = userId;

        setUsers((prev) => {
          const without = prev.filter((u) => u.id !== userId);
          return [full, ...without];
        });
      } catch (err) {
        console.error("Failed to reselect user", err);
      }
    },
    []
  );

  // === EFFECTS ===
  /**
   * Initial load of users
   */
  useEffect(() => {
    fetchUsers(1, true);
  }, [fetchUsers]);

  /**
   * Auto refresh when filters or search change with debounce
   */
  useEffect(() => {
    const delay = setTimeout(() => {
      setUsers([]);
      loadedPages.current.clear();
      setPageNumber(1);
      fetchUsers(1, true);
    }, 500);

    return () => clearTimeout(delay);
  }, [filters, searchQuery, fetchUsers]);

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
    if (pageNumber > 1) fetchUsers(pageNumber);
  }, [pageNumber, fetchUsers]);

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

  /**
   * Reselect previously chosen row after data refresh
   */
  useEffect(() => {
    if (!lastSelectedId.current || users.length === 0) return;
    const target = users.find((u) => u.id === lastSelectedId.current);
    if (!target) {
      setSelectedRow(null);
      setSelectedUserDetails(null);
      return;
    }
    if (selectedRow?.id === target.id && selectedUserDetails) return;
    handleRowSelect(toRow(target));
  }, [users, selectedRow, selectedUserDetails]);

  /**
   * Show confirm dialog when actionableUser is set
   */
  useEffect(() => {
    if (actionableUser) {
      setShowConfirm(true);
    }
  }, [actionableUser]);

  // === TABLE CONFIGURATION ===
  const columns = [
    { key: "id", label: "ID", width: "8%", sortable: false },
    { key: "firstName", label: "First Name", width: "16%" },
    { key: "lastName", label: "Last Name", width: "16%" },
    { key: "email", label: "Email", width: "22%" },
    { key: "phoneNumber", label: "Phone", width: "14%", sortable: false },
    { key: "role", label: "Role", width: "14%" },
    { key: "isActiveLabel", label: "Active", width: "10%" },
  ];

  /**
   * Transforms user data to table row format
   */
  const toRow = useCallback((u) => {
    const active = typeof u.isActive === "boolean" ? u.isActive : Boolean(u.isActive);
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phoneNumber: u.phoneNumber || "—",
      role: u.role || "—",
      isActiveLabel: active ? "Yes" : "No",
      _isActive: active,
      addressId: u.addressId,
    };
  }, []);

  const rows = useMemo(() => users.map(toRow), [users, toRow]);

  const userDetailsConfig = {
    status: {
      key: "isActive",
      activeLabel: "Active",
      inactiveLabel: "Inactive",
    },
    fields: [
      { label: "Id", key: "id" },
      { label: "First Name", key: "firstName" },
      { label: "Last Name", key: "lastName" },
      { label: "Login", key: "login" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phoneNumber" },
      { label: "Role", key: "role" },
      { label: "Date of Birth", key: "dateOfBirth", render: (data) => formatDateReadable(data.dateOfBirth) },
      {
        label: "Address",
        key: "address",
        render: (data) => {
          if (!data?.address) return "—";
          const a = data.address;
          const line1 = [a.street, a.building, a.premises].filter(Boolean).join(" ");
          const line2 = [a.postalCode, a.city].filter(Boolean).join(" ");
          return [line1, line2, a.country].filter(Boolean).join(", ");
        },
      },
    ],
  };

  // === EVENT HANDLERS ===
  /**
   * Handles column header clicks for sorting
   */
  const handleSort = (column) => {
    if (!sortKeyMap[column]) return;

    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortColumn(column);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  /**
   * Handles search input changes
   */
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setSelectedRow(null);
    setSelectedUserDetails(null);
  };

  /**
   * Handles filter dropdown changes
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handles boolean filter changes
   */
  const handleBooleanChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value === "" ? "" : value === "true",
    }));
  };

  /**
   * Handles row selection and loads full user details
   */
  const handleRowSelect = useCallback(async (row) => {
    if (!row) {
      setSelectedRow(null);
      setSelectedUserDetails(null);
      lastSelectedId.current = null;
      return;
    }

    lastSelectedId.current = row.id;
    setSelectedRow(row);
    try {
      const full = await api.get(`/Users/${row.id}`);
      let address = null;
      if (full?.addressId) {
        try {
          address = await api.get(`/Addresses/${full.addressId}`);
        } catch (addrErr) {
          console.error("Failed to load address", addrErr);
        }
      }
      setSelectedUserDetails({ ...full, isActive: full.isActive ?? row._isActive, address });
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to load user details.",
        type: "error",
      });
    }
  }, []);

  /**
   * Opens create user modal
   * Checks permissions before allowing action
   */
  const openCreateModal = () => {
    if (!canManageUsers) {
      setToast({ message: "Only Deputy Manager or higher can register users.", type: "error" });
      return;
    }
    setFormUserData(null);
    setFormAddressData(initialAddress);
    setUserFormMode("create");
    setShowUserModal(true);
  };

  /**
   * Opens edit user modal and loads full user data
   * Checks permissions before allowing action
   */
  const openEditModal = async (row) => {
    if (!row) return;
    if (!canManageUsers) {
      setToast({ message: "Only Deputy Manager or higher can edit users.", type: "error" });
      return;
    }

    try {
      setLoading(true);
      const full = await api.get(`/Users/${row.id}`);
      let addressData = initialAddress;
      if (full?.addressId) {
        try {
          const addr = await api.get(`/Addresses/${full.addressId}`);
          addressData = {
            country: addr.country || "",
            city: addr.city || "",
            street: addr.street || "",
            building: addr.building || "",
            premises: addr.premises || "",
            postalCode: addr.postalCode || "",
          };
        } catch (addrErr) {
          console.error("Failed to fetch address", addrErr);
        }
      }
      setFormUserData({ ...full, dateOfBirth: formatDateForInput(full.dateOfBirth) });
      setFormAddressData(addressData);
      setUserFormMode("edit");
      setShowUserModal(true);
      setSelectedUserDetails({ ...full, isActive: full.isActive ?? row._isActive, address: addressData });
      lastSelectedId.current = row.id;
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to load full user details.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Opens confirmation dialog for status toggle
   */
  const handleStatusToggle = (row) => {
    if (!canManageUsers) {
      setToast({ message: "Only Deputy Manager or higher can change user status.", type: "error" });
      return;
    }
    setActionableUser(row);
  };

  /**
   * Confirms and executes status change (activate/deactivate)
   */
  const confirmStatusChange = async () => {
    if (!actionableUser) return;
    try {
      setLoading(true);
      if (actionableUser._isActive) {
        await api.delete(`/Users/${actionableUser.id}`);
        setToast({ message: "User deactivated successfully.", type: "success" });
      } else {
        await api.put(`/Users/${actionableUser.id}/activate`);
        setToast({ message: "User activated successfully.", type: "success" });
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === actionableUser.id
            ? { ...u, isActive: !actionableUser._isActive }
            : u
        )
      );

      if (selectedRow && selectedRow.id === actionableUser.id) {
        const newActive = !actionableUser._isActive;
        setSelectedRow((prev) => prev ? { ...prev, _isActive: newActive, isActiveLabel: newActive ? "Yes" : "No" } : prev);
        setSelectedUserDetails((prev) => prev ? { ...prev, isActive: newActive } : prev);
      }

      loadedPages.current.clear();
      setPageNumber(1);
      fetchUsers(1, true);
      lastSelectedId.current = actionableUser.id;
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to update user status.",
        type: "error",
      });
    } finally {
      setLoading(false);
      setShowConfirm(false);
      setActionableUser(null);
    }
  };

  /**
   * Opens change password modal
   * Validates permissions based on role hierarchy
   */
  const handleOpenPasswordModal = (row) => {
    if (!row) return;
    if (!canChangeAnyPassword) {
      setToast({ message: "Only Deputy Manager or higher can change passwords.", type: "error" });
      return;
    }
    if (currentUser && row.role && currentUser.role) {
      const hierarchy = ["ShopAssistant", "ItTechnician", "Marketer", "DeputyManager", "Manager", "CEO", "Admin", "Root"];
      const actorRank = hierarchy.indexOf(currentUser.role);
      const targetRank = hierarchy.indexOf(row.role);
      if (targetRank >= actorRank && row.id !== currentUser.id) {
        setToast({ message: "You can only change password for users with lower role or yourself.", type: "error" });
        return;
      }
    }
    setShowPasswordModal(true);
  };

  /**
   * Opens change login modal
   * Validates permissions based on role hierarchy
   */
  const handleOpenLoginModal = (row) => {
    if (!row) return;
    if (!canChangeAnyPassword) {
      setToast({ message: "Only Deputy Manager or higher can change logins.", type: "error" });
      return;
    }
    if (currentUser && row.role && currentUser.role) {
      const hierarchy = ["ShopAssistant", "ItTechnician", "Marketer", "DeputyManager", "Manager", "CEO", "Admin", "Root"];
      const actorRank = hierarchy.indexOf(currentUser.role);
      const targetRank = hierarchy.indexOf(row.role);
      if (targetRank >= actorRank && row.id !== currentUser.id) {
        setToast({ message: "You can only change login for users with lower role or yourself.", type: "error" });
        return;
      }
    }
    setShowLoginModal(true);
  };

  /**
   * Handles user creation or update success
   * Refreshes data and reselects the user
   */
  const handleUserSuccess = async (userId) => {
    setShowUserModal(false);
    if (userId) {
      lastSelectedId.current = userId;
      await fetchAndSelectUser(userId);
    }
    loadedPages.current.clear();
    setPageNumber(1);
    await fetchUsers(1, true);
  };

  /**
   * Handles password change form submission
   * Validates passwords match before submitting
   */
  const handleSubmitPassword = async (passwordForm) => {
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setToast({ message: "Passwords do not match.", type: "error" });
      return;
    }

    try {
      setLoading(true);
      await api.post("/Auth/change-password", {
        userId: selectedRow?.id,
        currentPassword: "",
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword,
      });
      setToast({ message: "Password changed successfully.", type: "success" });
      setShowPasswordModal(false);
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to change password.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles login change form submission
   */
  const handleSubmitLogin = async (loginForm) => {
    if (!selectedRow) return;

    try {
      setLoading(true);
      await api.post("/Auth/change-login", {
        userId: selectedRow.id,
        currentPassword: "",
        newLogin: loginForm.newLogin,
      });
      setToast({ message: "Login changed successfully.", type: "success" });
      setShowLoginModal(false);
    } catch (err) {
      console.error(err);
      setToast({
        message: err.response?.data?.message || "Failed to change login.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // === RENDER ===
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
        <BaseListPage
          title="Users"
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          selectedRow={selectedRow}
          onSelectRow={handleRowSelect}
          detailsData={selectedUserDetails}
          detailsConfig={userDetailsConfig}
          onAdd={openCreateModal}
          onEdit={openEditModal}
          onDelete={handleStatusToggle}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          onSearchChange={handleSearchChange}
          searchValue={searchQuery}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          deleteButtonLabel={
            !selectedRow || selectedRow._isActive ? "Deactivate" : "Activate"
          }
          deleteButtonClass={
            !selectedRow || selectedRow._isActive ? "btn-confirm-negative" : "btn-confirm-positive"
          }
          deleteButtonIcon={
            !selectedRow || selectedRow._isActive ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <path fill="none" stroke="currentColor" strokeWidth="2" d="M18 6L6 18M6 6l12 12"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <path fill="none" stroke="currentColor" strokeWidth="2" d="M20 6L9 17l-5-5"/>
              </svg>
            )
          }
          onChangePassword={handleOpenPasswordModal}
          changePasswordDisabled={!selectedRow || !canChangeAnyPassword}
          changePasswordButtonClass="btn-edit"
          onChangeLogin={handleOpenLoginModal}
          changeLoginDisabled={!selectedRow || !canChangeAnyPassword}
          changeLoginButtonClass="btn-edit"
          disableAdd={disableManageActions}
          disableEdit={disableManageActions}
          disableDelete={disableManageActions}
        />

        {showFilters && (
          <div className="filters-panel" ref={filtersRef}>
            <h4>Filters</h4>

            <select
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
            >
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
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
        show={showUserModal}
        mode={userFormMode}
        user={formUserData}
        address={formAddressData}
        roles={roles}
        roleLimit={currentUser?.role}
        onClose={() => setShowUserModal(false)}
        onSuccess={handleUserSuccess}
      />

      <StatusConfirmDialog
        user={actionableUser}
        onConfirm={confirmStatusChange}
        onCancel={() => {
          setShowConfirm(false);
          setActionableUser(null);
        }}
      />

      <ChangePasswordModal
        show={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handleSubmitPassword}
      />

      <ChangeLoginModal
        show={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSubmit={handleSubmitLogin}
      />

      {toast && (
        <MessageBox
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
          className="centered"
        />
      )}
    </div>
  );
}
