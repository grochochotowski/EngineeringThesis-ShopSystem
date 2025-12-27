# Sales Documents Page Documentation

**Generated:** 2025-12-26 (Updated)
**Component Location:** `/src/frontend/src/pages/Sales/Documents.jsx`
**Route Path:** `/sales/documents`
**Required Role:** ShopAssistant (minimum)
**Page Type:** Custom List View with Modal Details

---

## 1. Overview

The **Sales Documents** page is a comprehensive list view that displays all sales documents (receipts, invoices) created in the system. It provides users with the ability to browse, filter, search, and view detailed information about sales transactions through a modal dialog interface.

### Purpose and Functionality

- **Primary Purpose**: Centralized repository for viewing all sales documents generated from point-of-sale transactions
- **Target Users**: Shop assistants, cashiers, managers, and administrative staff who need to review sales transactions
- **Key Capabilities**:
  - Browse paginated list of all sales documents with infinite scroll
  - Search by document number or description
  - Filter by document type, client, payment method, date range, and amount range
  - View comprehensive document details in a modal dialog (items and payments)
  - Sort by multiple columns (ID, type, document number, date, total, product count, payment type)
  - Placeholder print functionality (browser alert)
  - Row selection highlighting without automatic details loading

### Location in Application

- **URL Route**: `/sales/documents`
- **Navigation**: Accessible from the main navigation menu under "Sales" section
- **Access Control**: Protected by `<ProtectedRoute>` requiring minimum role of `ShopAssistant`
- **Lazy Loading**: Component is lazy-loaded with `React.lazy()` and wrapped in `<Suspense>`

### Recent Architectural Changes (December 2025)

**Major Refactor**: The page has been completely redesigned with the following changes:

1. **Removed BaseListPage Component**: Replaced with custom layout similar to warehouse products pages
2. **Removed Details Panel**: Eliminated right-side details panel from sidebar layout
3. **Changed Row Selection Behavior**: Row clicks now only highlight the selected row; details are NOT loaded automatically
4. **Added View Details Modal**: New modal dialog for displaying document details (triggered by "View Details" button)
5. **Updated Print Button**: Now shows browser `alert("printing")` as placeholder for future functionality
6. **Updated Button Styling**: Action buttons now use `btn-action` class matching warehouse products page styling
7. **Custom Two-Column Layout**: Left sidebar with search/filters/actions + main content area with table (no right panel)

---

## 2. Component API

### Route Configuration

```javascript
// From main.jsx
const SalesDocuments = lazy(() => import('./pages/Sales/Documents.jsx'));

{
  path: '/sales/documents',
  element: (
    <PrivateRoute>
      <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
        <SalesDocuments />
      </ProtectedRoute>
    </PrivateRoute>
  )
}
```

### Context Dependencies

- **GlobalState Context**: Accessed indirectly through `localStorage` for user authentication data
- **User Data**: Retrieved from `localStorage.getItem("user")` for header display
- **Authentication Tokens**: JWT tokens managed by `apiClient.js` for API requests

### Query Parameters

The component supports URL state management via `useSearchParams`:

- **`search`**: Pre-populated search query (auto-applied on component mount, then cleared from URL)

**Example**: `/sales/documents?search=INV-2025-001` will automatically search for that document number.

### Props

This page component does not accept props; it's a standalone route component.

---

## 3. Data Flow

### API Endpoints Consumed

#### Primary Endpoint: GET `/api/SalesDocument`

**Purpose**: Fetch paginated, filtered, and sorted list of sales documents

**HTTP Method**: `GET`

**Query Parameters**:
- `PageNumber` (int, default: 1) - Current page number for pagination
- `PageSize` (int, default: 50) - Number of items per page
- `q` (string, optional) - Search query for document number or description
- `type` (int, optional) - Filter by `SalesDocumentType` enum (0=Unspecified, 1=Receipt, 2=InvoicePersonal, 3=InvoiceCompany)
- `clientId` (int, optional) - Filter by specific client ID
- `from` (DateTimeOffset, optional) - Filter documents issued on or after this date
- `to` (DateTimeOffset, optional) - Filter documents issued on or before this date
- `paymentType` (string, optional) - Filter by payment option (e.g., "Card", "Cash", "BankTransfer")
- `minAmount` (decimal, optional) - Filter documents with total gross amount >= this value
- `maxAmount` (decimal, optional) - Filter documents with total gross amount <= this value
- `orderBy` (string, optional) - Column to sort by (e.g., "id", "documentType", "documentNumber", "issueDate", "totalGross", "numberOfProducts", "paymentType")
- `sortDirection` (string, optional) - Sort direction: "asc" or "desc"

**Response Structure**:
```json
{
  "items": [
    {
      "id": 1,
      "documentType": 1,
      "documentNumber": "RCP-2025-0001",
      "issueDate": "2025-12-26T14:30:00Z",
      "clientId": 5,
      "totalNet": 100.00,
      "totalTax": 23.00,
      "totalGross": 123.00,
      "numberOfProducts": 3,
      "paymentType": "Card"
    }
  ],
  "totalPages": 5,
  "pageNumber": 1,
  "pageSize": 50,
  "totalCount": 245
}
```

**Implementation**:
```javascript
const { items, totalPages } = await api.get("/SalesDocument", {
  params: {
    PageNumber: page,
    PageSize: 50,
    ...(currentSearchQuery && { q: currentSearchQuery }),
    ...(currentFilters.documentType !== "" && { type: currentFilters.documentType }),
    ...(currentFilters.clientId && { clientId: currentFilters.clientId }),
    ...(currentFilters.from && { from: currentFilters.from }),
    ...(currentFilters.to && { to: currentFilters.to }),
    ...(currentFilters.paymentType && { paymentType: currentFilters.paymentType }),
    ...(currentFilters.minAmount && { minAmount: currentFilters.minAmount }),
    ...(currentFilters.maxAmount && { maxAmount: currentFilters.maxAmount }),
    ...(currentSortColumn && { orderBy: currentSortColumn }),
    ...(currentSortDirection && { sortDirection: currentSortDirection }),
  },
});
```

---

#### Secondary Endpoint: GET `/api/SalesDocument/{id}`

**Purpose**: Fetch detailed information for a specific sales document (triggered by "View Details" button)

**HTTP Method**: `GET`

**URL Parameters**:
- `id` (int, required) - Sales document ID

**Response Structure**:
```json
{
  "id": 1,
  "documentType": 1,
  "documentNumber": "RCP-2025-0001",
  "issueDate": "2025-12-26T14:30:00Z",
  "clientId": 5,
  "totalNet": 100.00,
  "totalTax": 23.00,
  "totalGross": 123.00,
  "description": "POS transaction from Store #1",
  "items": [
    {
      "id": 1,
      "productId": 42,
      "productName": "Laptop Dell XPS 15",
      "quantity": 1,
      "unitPrice": 100.00,
      "taxRate": 23.00,
      "totalNet": 100.00,
      "totalTax": 23.00,
      "totalGross": 123.00
    }
  ],
  "payments": [
    {
      "id": 1,
      "paymentOption": "Card",
      "amount": 123.00,
      "transactionDate": "2025-12-26T14:30:00Z"
    }
  ]
}
```

**Implementation**:
```javascript
// Triggered by handleViewDetails button click
const full = await api.get(`/SalesDocument/${selectedDocument.id}`);
setSelectedDocumentDetails(full);
setShowDetailsModal(true);
```

**Important**: This endpoint is **NOT** called on row selection. It is only called when the user explicitly clicks the "View Details" button.

---

#### Tertiary Endpoint: GET `/api/Clients`

**Purpose**: Load client list for filter dropdown

**HTTP Method**: `GET`

**Query Parameters**:
- `pageNumber` (int, default: 1)
- `pageSize` (int, default: 1000) - Large page size to fetch all clients

**Response Structure**:
```json
{
  "items": [
    {
      "id": 5,
      "name": "John Doe",
      "taxId": "1234567890",
      "type": 1
    }
  ]
}
```

**Implementation**:
```javascript
const clientsRes = await api.get("/Clients", {
  params: {
    pageNumber: 1,
    pageSize: 1000,
  },
});
setClients(clientsRes.items || []);
```

---

### State Management

#### Local Component State (useState)

1. **List Data State**:
   - `documents` (array) - Current page of sales document list items
   - `pageNumber` (int) - Current page number for infinite scroll
   - `hasMore` (boolean) - Whether more pages are available
   - `loading` (boolean) - Loading indicator for API requests
   - `error` (string|null) - Error message display
   - `initialDataLoaded` (boolean) - Flag indicating initial data (clients) has loaded

2. **UI State**:
   - `selectedDocument` (object|null) - Currently selected row in the table (for highlighting only)
   - `selectedDocumentDetails` (object|null) - Full document details fetched from API (when View Details clicked)
   - `showDetailsModal` (boolean) - Controls visibility of the details modal dialog
   - `showFilters` (boolean) - Toggle for filter panel visibility
   - `toast` (object|null) - Toast notification state (`{ message, type }`)

3. **Search and Filter State**:
   - `searchQuery` (string) - Main search input value (searches document number/description)
   - `filters` (object) - Filter values:
     - `documentType` (string) - Selected document type ID
     - `clientId` (string) - Selected client ID
     - `from` (string) - Date filter (issue date from)
     - `to` (string) - Date filter (issue date to)
     - `paymentType` (string) - Selected payment option
     - `minAmount` (string) - Minimum total gross amount
     - `maxAmount` (string) - Maximum total gross amount

4. **Sorting State**:
   - `sortColumn` (string) - Currently sorted column key (default: "id")
   - `sortDirection` (string) - Sort direction "asc" or "desc" (default: "desc")

5. **Reference Data**:
   - `clients` (array) - List of all clients for filter dropdown

#### URL State (useSearchParams)

- `search` query parameter - Pre-populates search query on page load, then cleared

---

### Data Transformations

#### Row Formatting

Raw API data is transformed for table display:

```javascript
const rows = documents.map((d) => ({
  id: d.id,
  documentType: getDocumentTypeLabel(d.documentType),      // "Receipt" instead of 1
  documentNumber: d.documentNumber,                        // "RCP-2025-0001"
  issueDate: formatDate(d.issueDate),                     // "26/12/2025 14:30"
  client: getClientName(d.clientId),                      // "John Doe (1234567890)"
  totalGross: `$${d.totalGross.toFixed(2)}`,             // "$123.00"
  numberOfProducts: d.numberOfProducts,                    // 3
  paymentType: d.paymentType || "—",                      // "Card" or "—"
  rawDocumentType: d.documentType,                        // Original enum value
  rawClientId: d.clientId,                                // Original client ID
}));
```

#### Date Formatting

```javascript
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};
```

**Output**: `26/12/2025 14:30`

#### Enum Lookups

**Document Type**:
```javascript
const getDocumentTypeLabel = (typeId) => {
  return salesDocumentTypesData.find(t => t.id === typeId)?.value || "Unknown";
};
```

Maps enum ID to human-readable label:
- `1` → "Receipt"
- `2` → "InvoicePersonal"
- `3` → "InvoiceCompany"

**Client Name**:
```javascript
const getClientName = (clientId) => {
  if (!clientId) return "—";
  const client = clients.find(c => c.id === clientId);
  return client
    ? `${client.name}${client.taxId ? ` (${client.taxId})` : ""}`
    : `Client #${clientId}`;
};
```

**Output Examples**:
- `"John Doe (1234567890)"` (with tax ID)
- `"Jane Smith"` (without tax ID)
- `"Client #42"` (client not found in loaded list)

---

## 4. User Interactions

### Search Functionality

**Location**: Left sidebar search input

**Behavior**:
- **Input Field**: Text input with placeholder "Search documents..."
- **Debounced Search**: 500ms delay after user stops typing before API request
- **Search Scope**: Searches document number and description fields
- **Auto-population**: URL query parameter `?search=value` pre-populates the search on page load
- **State Reset**: Clears selected row when search query changes
- **No Automatic Details Loading**: Search does NOT trigger details fetch

**Implementation**:
```javascript
const handleSearchChange = (value) => {
  setSearchQuery(value);
  setSelectedDocument(null);
  setSelectedDocumentDetails(null);
};

// Debounced API call
useEffect(() => {
  if (searchQuery) {
    debouncedFetchDocuments();
  } else {
    immediateFetchDocuments();
  }
}, [debouncedFetchDocuments, immediateFetchDocuments, searchQuery]);
```

---

### Filter Panel

**Toggle Button**: "Filters" button in left sidebar (below search)

**Panel Location**: Appears inside the left sidebar, below the action buttons

**Panel Contents**: Dropdown overlay with filter inputs:

1. **Document Type Filter**
   - Type: Select dropdown
   - Options: "All Types", "Receipt", "InvoicePersonal", "InvoiceCompany"
   - Data Source: `salesDocumentTypesData` (excludes "Unspecified")

2. **Client Filter**
   - Type: Select dropdown
   - Options: "All Clients" + list of all clients
   - Display Format: `{clientName} ({taxId})` or `{clientName}`
   - Data Source: `clients` state (fetched from `/api/Clients`)

3. **Payment Type Filter**
   - Type: Select dropdown
   - Options: "All Payment Types", "Card", "Cash", "BankTransfer", "GiftCard", "Voucher"
   - Data Source: `paymentOptionsData` (excludes "Unspecified")

4. **Issue Date From**
   - Type: Date input
   - Purpose: Filter documents issued on or after this date

5. **Issue Date To**
   - Type: Date input
   - Purpose: Filter documents issued on or before this date

6. **Min Amount**
   - Type: Number input (step: 0.01, min: 0)
   - Purpose: Filter documents with total gross >= this value
   - Currency: Assumes USD ($)

7. **Max Amount**
   - Type: Number input (step: 0.01, min: 0)
   - Purpose: Filter documents with total gross <= this value
   - Currency: Assumes USD ($)

**Behavior**:
- **Auto-Apply**: Filters apply immediately on change (no "Apply" button)
- **Click Outside to Close**: Panel closes when clicking outside its bounds
- **State Persistence**: Filter values persist while navigating within the page
- **Positioned in Sidebar**: Uses `.filters-content` class within sidebar

**Implementation**:
```javascript
const handleFilterChange = (e) => {
  const { name, value } = e.target;
  setFilters((prev) => ({ ...prev, [name]: value }));
};

// Auto-close on outside click
useEffect(() => {
  if (!showFilters) return;
  const handleClickOutside = (event) => {
    if (filtersRef.current && !filtersRef.current.contains(event.target)) {
      setShowFilters(false);
    }
  };
  document.addEventListener("click", handleClickOutside);
  return () => document.removeEventListener("click", handleClickOutside);
}, [showFilters]);
```

---

### Column Sorting

**Sortable Columns**:
- ID (`id`)
- Type (`documentType`)
- Document # (`documentNumber`)
- Issue Date (`issueDate`)
- Total (`totalGross`)
- Products (`numberOfProducts`)
- Payment (`paymentType`)

**Non-Sortable Columns**:
- Client (column marked as `sortable: false`)

**Behavior**:
- **First Click**: Sort ascending
- **Second Click**: Sort descending
- **Third Click**: Clear sort (revert to default: ID descending)
- **Visual Indicator**: Arrow icons (▲/▼) in column headers show current sort state

**Implementation**:
```javascript
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
```

**Default Sort**: ID column, descending (newest documents first)

---

### Row Selection

**Interaction**: Click any row in the table

**Behavior** (Updated):
1. Row highlights with selected state (CSS class `selected` applied)
2. **DOES NOT** automatically fetch document details from API
3. **DOES NOT** display details in sidebar or modal
4. Only updates `selectedDocument` state to highlight the row
5. Enables action buttons ("View Details", "Print")

**Implementation**:
```javascript
const handleRowSelect = (row) => {
  if (selectedDocument && selectedDocument.id === row.id) {
    setSelectedDocument(null);  // Deselect if clicking same row
  } else {
    setSelectedDocument(row);   // Select new row
  }
};
```

**Visual Feedback**:
- Selected row has CSS class `selected` applied
- Background color changes to indicate selection
- No loading state or API call on row click

**Important Change**: This is a significant departure from the previous behavior where clicking a row would automatically load and display document details in a right-side panel.

---

### Action Buttons

#### 1. View Details Button

- **Label**: "View Details"
- **Icon**: Eye icon (SVG)
- **CSS Class**: `btn-action btn-view-details`
- **Enabled State**: Only when a row is selected
- **Disabled State**: Grayed out with `disabled` class when no row selected
- **Action**:
  1. Validates a document is selected (shows warning toast if not)
  2. Fetches full document details from API: `GET /api/SalesDocument/{id}`
  3. Opens modal dialog with document information, items table, and payments table
- **Modal Structure**: Wide modal with three sections (Document Information, Items, Payments)

**Implementation**:
```javascript
const handleViewDetails = async () => {
  if (!selectedDocument) {
    setToast({
      message: "Please select a document to view details.",
      type: "warning",
    });
    return;
  }

  try {
    const full = await api.get(`/SalesDocument/${selectedDocument.id}`);
    setSelectedDocumentDetails(full);
    setShowDetailsModal(true);
  } catch (err) {
    console.error(err);
    setToast({
      message: err.response?.data?.message || "Failed to load document details.",
      type: "error",
    });
  }
};
```

---

#### 2. Print Button

- **Label**: "Print"
- **Icon**: Printer icon (SVG)
- **CSS Class**: `btn-action btn-print`
- **Enabled State**: Only when a row is selected
- **Disabled State**: Grayed out with `disabled` class when no row selected
- **Action**: **Placeholder** - Shows browser `alert("printing")`
- **Future Purpose**: Generate printable PDF or formatted receipt/invoice

**Implementation**:
```javascript
const handlePrint = () => {
  if (!selectedDocument) {
    setToast({
      message: "Please select a document to print.",
      type: "warning",
    });
    return;
  }

  // Show web alert
  alert("printing");
};
```

**Note**: This is a placeholder for future print/PDF generation functionality.

---

### Details Modal

**Trigger**: Clicking "View Details" button with a document selected

**Modal Component**: Uses `<Modal>` component with `wide` prop for larger width

**Modal Title**: "Sales Document Details"

**Modal Sections**:

1. **Document Information** (HTML `<ul>` list):
   - ID
   - Document Type (formatted via `getDocumentTypeLabel()`)
   - Document Number
   - Issue Date (formatted via `formatDate()`)
   - Client (formatted via `getClientName()`)
   - Total Net ($)
   - Total Tax ($)
   - Total Gross ($)
   - Description (or "—" if empty)

2. **Items Table** (`<table class="items-table">`):
   - Columns: Product, Quantity, Unit Price, Total
   - Displays all `selectedDocumentDetails.items`
   - Product name or fallback: `Product #{productId}`
   - Currency formatted with 2 decimal places

3. **Payments Table** (`<table class="payments-table">`):
   - Columns: Payment Type, Amount
   - Displays all `selectedDocumentDetails.payments`
   - Payment type or fallback: "Unknown"
   - Currency formatted with 2 decimal places

**Close Behavior**: Modal closes via close button in header, clearing `showDetailsModal` state

**Implementation**:
```jsx
{showDetailsModal && selectedDocumentDetails && (
  <Modal
    title="Sales Document Details"
    onClose={() => setShowDetailsModal(false)}
    wide
  >
    <div className="document-details-modal">
      <h3>Document Information</h3>
      <ul>
        <li><strong>ID:</strong> {selectedDocumentDetails.id}</li>
        {/* ... other fields ... */}
      </ul>

      <h3>Items</h3>
      {selectedDocumentDetails.items && selectedDocumentDetails.items.length > 0 ? (
        <table className="items-table">
          {/* ... table content ... */}
        </table>
      ) : (
        <p>No items in this document.</p>
      )}

      <h3>Payments</h3>
      {selectedDocumentDetails.payments && selectedDocumentDetails.payments.length > 0 ? (
        <table className="payments-table">
          {/* ... table content ... */}
        </table>
      ) : (
        <p>No payments recorded for this document.</p>
      )}
    </div>
  </Modal>
)}
```

---

### Infinite Scroll Pagination

**Mechanism**: Intersection Observer API

**Behavior**:
- Loads 50 items per page
- Automatically loads next page when user scrolls to bottom
- Loading indicator appears during fetch ("Loading..." text centered below table)
- Stops loading when `hasMore` is false (no more pages available)

**Implementation**:
```javascript
// Observer setup
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

// Fetch next page
useEffect(() => {
  if (pageNumber > 1) {
    fetchDocumentsData(pageNumber, filters, searchQuery, sortColumn, sortDirection);
  }
}, [pageNumber]);
```

**Sentinel Element**:
```jsx
<div ref={observerRef} style={{ height: "1px" }} />
```

---

## 5. Implementation Details

### Key Hooks Used

1. **useState** (15 instances):
   - `documents`, `pageNumber`, `hasMore`, `loading`, `error`, `initialDataLoaded`
   - `selectedDocument`, `selectedDocumentDetails`, `showDetailsModal`, `showFilters`, `toast`
   - `filters`, `searchQuery`, `clients`, `sortColumn`, `sortDirection`

2. **useEffect** (6 instances):
   - Initial data loading (clients)
   - Auto-search from URL params
   - Debounced/immediate search trigger
   - Immediate filter/sort trigger
   - Infinite scroll observer
   - Next page loading
   - Outside click handler for filter panel

3. **useCallback** (2 instances):
   - `debouncedFetchDocuments`: 500ms delay for search
   - `immediateFetchDocuments`: Instant fetch for filters/sorting

4. **useRef** (2 instances):
   - `observerRef`: Intersection observer sentinel element
   - `filtersRef`: Filter panel ref for outside click detection

5. **useSearchParams**:
   - URL state management for auto-search functionality

---

### Event Handlers

#### handleSearchChange
- **Trigger**: Search input value change
- **Logic**: Updates search query state, clears selected document
- **Debouncing**: Applied via useEffect (500ms delay)
- **No Details Fetch**: Does NOT call API for details

#### handleFilterChange
- **Trigger**: Any filter input/select change
- **Logic**: Updates corresponding filter in state object
- **Auto-apply**: Triggers immediate API refetch via useEffect

#### handleSort
- **Trigger**: Column header click
- **Logic**: Cycles through asc → desc → none for sortable columns
- **Validation**: Checks if column is sortable before applying

#### handleRowSelect
- **Trigger**: Row click in table
- **Logic**: Toggles selected state (highlight row), does NOT fetch details
- **Changed Behavior**: No longer calls API or populates details panel
- **Implementation**:
  ```javascript
  const handleRowSelect = (row) => {
    if (selectedDocument && selectedDocument.id === row.id) {
      setSelectedDocument(null);  // Deselect
    } else {
      setSelectedDocument(row);   // Select
    }
  };
  ```

#### handleViewDetails
- **Trigger**: "View Details" button click
- **Logic**:
  1. Validates document selection
  2. Fetches full document details from API
  3. Opens modal with details
- **Error Handling**: Shows toast on fetch failure

#### handlePrint
- **Trigger**: "Print" button click
- **Logic**: Validates document selection, shows browser `alert("printing")`
- **Placeholder**: Future implementation for PDF generation

---

### Conditional Rendering

1. **Filter Panel**: Shown/hidden based on `showFilters` state
   ```javascript
   {showFilters && <div className="filters-content" ref={filtersRef}>...</div>}
   ```

2. **Details Modal**: Shown only when `showDetailsModal === true` and details loaded
   ```javascript
   {showDetailsModal && selectedDocumentDetails && <Modal>...</Modal>}
   ```

3. **Loading Indicator**: Displayed during API requests
   ```javascript
   {loading && <p style={{ textAlign: "center", marginTop: 10 }}>Loading...</p>}
   ```

4. **Toast Notifications**: Shown when `toast` state is not null
   ```javascript
   {toast && <MessageBox {...toast} onClose={() => setToast(null)} />}
   ```

5. **Empty Table State**: Shows "No documents found" when no results
   ```javascript
   {rows.length === 0 && !loading ? (
     <tr><td colSpan={columns.length} className="no-data">No documents found</td></tr>
   ) : (...)}
   ```

6. **Action Button Disabled State**: Buttons disabled when no document selected
   ```javascript
   <button
     disabled={!selectedDocument}
     className={`btn-action ${!selectedDocument ? "disabled" : ""}`}
   >
   ```

---

### Error Handling

**API Request Errors**:
```javascript
catch (err) {
  if (axios.isCancel(err)) {
    return; // Ignore cancelled requests
  }
  console.error(err);
  setError("Failed to load sales documents.");
}
```

**Document Details Fetch Error**:
```javascript
catch (err) {
  console.error(err);
  setToast({
    message: err.response?.data?.message || "Failed to load document details.",
    type: "error",
  });
}
```

**Initial Data Load Error**:
```javascript
catch (err) {
  console.error("Failed to fetch initial data", err);
  setError("Failed to load initial page data.");
}
```

---

### Loading States

1. **Initial Load**: `loading` state controls "Loading..." text during first API request
2. **Pagination Load**: Additional requests during infinite scroll show "Loading..." text
3. **Details Load**: No explicit loader; modal opens when data arrives from `handleViewDetails()`
4. **Filter Changes**: Immediate refetch with loading state

---

## 6. Styling

### CSS File Location

`/src/frontend/src/styles/PagesStyles/salesDocuments.css`

### Additional CSS Files

- `/src/frontend/src/styles/PagesStyles/baseListPage.css` - Imported for base layout classes (`.base-list-wrapper`, `.sidebar`, `.main-content`, `.data-table`, etc.)

### Key CSS Classes

#### Layout Classes (from baseListPage.css)

- `.base-list-wrapper` - Outer wrapper for entire page layout
- `.base-list-container` - Container with display flex for two-column layout
- `.sidebar` - Left sidebar (search, filters, action buttons)
- `.main-content` - Right content area (table)
- `.search-panel` - Search input container
- `.action-buttons` - Container for action buttons in sidebar
- `.filters-content` - Filter panel inside sidebar
- `.table-wrapper` - Wrapper for data table
- `.data-table` - Main table styling

#### Filter Panel Styling (salesDocuments.css)

- `.filters-content` - Filter panel container
  - Margin-top: 1rem, padding-top: 1rem
  - Border-top: 1px solid #e2e8f0

- `.filter-group` - Container for each filter input/label pair
  - Flexbox column layout with 0.4rem gap
  - 0.8rem bottom margin

- `.filter-group label` - Filter labels
  - 0.85rem font size, font-weight 500
  - `var(--text-dark)` color

- `.filter-group input`, `.filter-group select` - Form controls
  - 0.5rem vertical, 0.7rem horizontal padding
  - Border radius `var(--radius-sm)`
  - Focus state: accent border color with box-shadow

#### Details Modal Styling (salesDocuments.css)

- `.document-details-modal` - Container for modal content
  - Padding: 0.5rem 0

- `.document-details-modal h3` - Section headings
  - Font-size: 1.1rem, margin-top: 1.5rem
  - Border-bottom: 2px solid #e2e8f0

- `.document-details-modal ul` - Document info list
  - Grid layout: auto-fit columns, minmax(250px, 1fr)
  - Gap: 0.8rem, no list bullets

- `.items-table`, `.payments-table` - Tables in modal
  - Width: 100%, border-collapse: collapse
  - Font-size: 0.9rem

- `.items-table th`, `.payments-table th` - Table headers
  - Background: #f8fafc, padding: 0.7rem 1rem
  - Font-weight: 600, border-bottom: 2px solid #e2e8f0

- `.items-table td`, `.payments-table td` - Table cells
  - Padding: 0.7rem 1rem
  - Border-bottom: 1px solid #e2e8f0

- `.items-table td:last-child`, `.payments-table td:last-child` - Total/Amount columns
  - Font-weight: 600, color: `var(--accent-main)`

#### Action Button Styling

- `.btn-action` - Base class for action buttons (inherited from baseListPage.css)
  - Display: flex, align-items: center, gap for icon spacing
  - Padding: 0.6rem 1rem
  - Border-radius: var(--radius-sm)
  - Transition: background, transform, box-shadow

- `.btn-view-details` - View Details button (uses default accent color from baseListPage.css)
  - Background: `var(--accent-main)` (blue)
  - White text

- `.btn-print` - Print button (salesDocuments.css override)
  - Background: #10b981 (green)
  - Color: white
  - Hover: background #059669 (darker green)

- `.btn-action.disabled` - Disabled state
  - Opacity reduced, cursor: not-allowed
  - No hover effects

### Responsive Design

**Mobile (<768px)** (salesDocuments.css):
- `.document-details-modal ul` - Grid switches to single column
- `.items-table`, `.payments-table` - Font-size reduced to 0.85rem
- `.items-table th/td`, `.payments-table th/td` - Padding reduced to 0.5rem × 0.7rem

---

## 7. Related Components/Pages

### Components Imported

1. **Header** (`/src/components/Header.jsx`)
   - Purpose: Top navigation bar with user info and logout
   - Props: `user`, `onLogout`

2. **Modal** (`/src/components/Modal.jsx`)
   - Purpose: Reusable modal dialog component
   - Props: `title`, `onClose`, `wide`, `children`
   - Usage: Display document details in dialog overlay

3. **MessageBox** (`/src/components/MessageBox.jsx`)
   - Purpose: Toast notification component
   - Props: `message`, `type`, `duration`, `onClose`, `className`

**Removed Components**:
- **BaseListPage** - Previously used, now replaced with custom layout

### Shared Utilities

1. **API Client** (`/src/api/apiClient.js`)
   - `api.get()` - GET requests with auto JWT refresh

2. **Data Dictionaries**:
   - `/src/data/salesDocumentTypes.js` - Document type enum mapping
   - `/src/data/paymentOptions.js` - Payment option enum mapping

### Related Pages

1. **POS Page** (`/src/pages/POS.jsx`)
   - Purpose: Point-of-sale interface for creating sales documents
   - Relationship: POS page creates the documents displayed in this list

2. **Dashboard** (`/src/pages/Dashboard.jsx`)
   - Purpose: Main application landing page
   - Relationship: May link to sales documents page for quick access

3. **Warehouse Products Pages** (`/src/pages/Storage/StorageProducts.jsx`, `/src/pages/Storage/Warehouses.jsx`)
   - Relationship: Shares similar custom layout pattern (sidebar + main content, modal for details)
   - Styling consistency: Uses same `btn-action` button classes

### Navigation Targets

- No internal navigation from this page (read-only list view)
- Users navigate via main menu or browser back button

---

## 8. Code Examples

### Usage in Routing (main.jsx)

```javascript
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Fallback from './components/Fallback';

const SalesDocuments = lazy(() => import('./pages/Sales/Documents.jsx'));

const router = createBrowserRouter([
  {
    path: '/sales/documents',
    element: (
      <PrivateRoute>
        <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
          <Suspense fallback={<Fallback />}>
            <SalesDocuments />
          </Suspense>
        </ProtectedRoute>
      </PrivateRoute>
    )
  }
]);
```

---

### API Call Examples

**Fetch Documents with Filters**:
```javascript
const response = await api.get("/SalesDocument", {
  params: {
    PageNumber: 1,
    PageSize: 50,
    q: "INV-2025",                    // Search document number/description
    type: 2,                           // InvoicePersonal
    clientId: 42,                      // Specific client
    from: "2025-12-01T00:00:00Z",     // Date range start
    to: "2025-12-31T23:59:59Z",       // Date range end
    paymentType: "Card",               // Payment method filter
    minAmount: 100.00,                 // Minimum total
    maxAmount: 1000.00,                // Maximum total
    orderBy: "issueDate",              // Sort by issue date
    sortDirection: "desc"              // Newest first
  }
});

// Response: { items: [...], totalPages: 5, pageNumber: 1, pageSize: 50, totalCount: 245 }
```

**Fetch Document Details (on View Details button click)**:
```javascript
const documentDetails = await api.get(`/SalesDocument/123`);

// Response includes:
// {
//   id, documentType, documentNumber, issueDate, clientId,
//   totalNet, totalTax, totalGross, description,
//   items: [{ productId, productName, quantity, unitPrice, ... }],
//   payments: [{ paymentOption, amount, transactionDate }]
// }
```

---

### Row Selection Example

```javascript
// Select a row (only highlights it, no details loaded)
<tr
  key={row.id}
  className={selectedDocument && selectedDocument.id === row.id ? "selected" : ""}
  onClick={() => handleRowSelect(row)}
>
  {columns.map(col => (
    <td key={col.key}>{row[col.key]}</td>
  ))}
</tr>

// Handler - toggles selection state only
const handleRowSelect = (row) => {
  if (selectedDocument && selectedDocument.id === row.id) {
    setSelectedDocument(null);  // Deselect if clicking same row
  } else {
    setSelectedDocument(row);   // Select new row
  }
};
```

---

### View Details Button Flow

```javascript
// Button in sidebar - disabled if no row selected
<button
  onClick={handleViewDetails}
  className={`btn-action btn-view-details ${!selectedDocument ? "disabled" : ""}`}
  disabled={!selectedDocument}
>
  <svg>...</svg>
  View Details
</button>

// Handler - fetches details and opens modal
const handleViewDetails = async () => {
  if (!selectedDocument) {
    setToast({ message: "Please select a document to view details.", type: "warning" });
    return;
  }

  try {
    const full = await api.get(`/SalesDocument/${selectedDocument.id}`);
    setSelectedDocumentDetails(full);
    setShowDetailsModal(true);
  } catch (err) {
    setToast({
      message: err.response?.data?.message || "Failed to load document details.",
      type: "error",
    });
  }
};
```

---

### Details Modal Structure

```jsx
{showDetailsModal && selectedDocumentDetails && (
  <Modal
    title="Sales Document Details"
    onClose={() => setShowDetailsModal(false)}
    wide
  >
    <div className="document-details-modal">
      {/* Document Information Section */}
      <h3>Document Information</h3>
      <ul>
        <li><strong>ID:</strong> {selectedDocumentDetails.id}</li>
        <li><strong>Document Type:</strong> {getDocumentTypeLabel(selectedDocumentDetails.documentType)}</li>
        <li><strong>Document Number:</strong> {selectedDocumentDetails.documentNumber}</li>
        <li><strong>Issue Date:</strong> {formatDate(selectedDocumentDetails.issueDate)}</li>
        <li><strong>Client:</strong> {getClientName(selectedDocumentDetails.clientId)}</li>
        <li><strong>Total Net:</strong> ${selectedDocumentDetails.totalNet.toFixed(2)}</li>
        <li><strong>Total Tax:</strong> ${selectedDocumentDetails.totalTax.toFixed(2)}</li>
        <li><strong>Total Gross:</strong> ${selectedDocumentDetails.totalGross.toFixed(2)}</li>
        <li><strong>Description:</strong> {selectedDocumentDetails.description || "—"}</li>
      </ul>

      {/* Items Table Section */}
      <h3>Items</h3>
      {selectedDocumentDetails.items && selectedDocumentDetails.items.length > 0 ? (
        <table className="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {selectedDocumentDetails.items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.productName || `Product #${item.productId}`}</td>
                <td>{item.quantity}</td>
                <td>${item.unitPrice.toFixed(2)}</td>
                <td>${item.totalGross.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No items in this document.</p>
      )}

      {/* Payments Table Section */}
      <h3>Payments</h3>
      {selectedDocumentDetails.payments && selectedDocumentDetails.payments.length > 0 ? (
        <table className="payments-table">
          <thead>
            <tr>
              <th>Payment Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {selectedDocumentDetails.payments.map((payment, idx) => (
              <tr key={idx}>
                <td>{payment.paymentOption || "Unknown"}</td>
                <td>${payment.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No payments recorded for this document.</p>
      )}
    </div>
  </Modal>
)}
```

---

## 9. Special Considerations and Future Enhancements

### Current Limitations

1. **Read-Only View**: Page does not support editing or deleting documents
   - Design decision: Sales documents are immutable records once created
   - Future: May add void/refund functionality with proper audit trail

2. **Print Functionality**: Placeholder implementation with browser alert
   - Button exists but shows `alert("printing")`
   - Future: Generate PDF invoices/receipts using library like jsPDF or react-pdf

3. **Client Dropdown Performance**: Loads all clients (pageSize: 1000)
   - Works for small to medium datasets
   - Future: Implement autocomplete/searchable dropdown for larger client lists

4. **Currency Hardcoded**: All amounts display as USD ($)
   - Future: Support multi-currency based on client location or system settings

5. **No Bulk Actions**: Cannot select multiple documents for batch operations
   - Future: Add checkboxes for multi-select with export/print capabilities

6. **Modal-Only Details View**: Removed details panel from sidebar
   - Design decision: Aligns with warehouse products page pattern
   - Trade-off: Requires extra click to view details, but cleaner layout

---

### Architecture Changes Summary

**Before (Old Implementation)**:
- Used `BaseListPage` component for layout
- Right-side details panel in sidebar
- Row click automatically loaded and displayed details
- "View Details" button showed informational toast
- Print button showed "coming soon" toast

**After (Current Implementation)**:
- Custom layout with `.base-list-wrapper` and `.base-list-container`
- No right-side details panel
- Row click only highlights the row (no automatic details loading)
- "View Details" button fetches details and opens modal
- Print button shows browser `alert("printing")`
- Button styling updated to `btn-action` classes
- Layout consistent with warehouse products pages

---

### Future Enhancement Ideas

1. **Export to CSV/Excel**
   - Add button to export filtered/sorted document list to spreadsheet
   - Include items and payments in separate sheets

2. **Print/PDF Generation**
   - Replace `alert("printing")` with actual PDF generation
   - Implement proper invoice/receipt template rendering
   - Support multiple template styles (modern, classic, branded)
   - Include company logo, terms & conditions, QR codes

3. **Email Document**
   - Send invoice/receipt PDF to client's email address
   - Integrate with email service provider

4. **Refund/Void Workflow**
   - Add "Void" button for authorized users (Manager+)
   - Create linked refund document with negative amounts
   - Track void reason and authorization

5. **Advanced Analytics**
   - Revenue charts by date, client, product category
   - Payment method breakdown
   - Top clients by total sales

6. **Document Duplication**
   - "Create Similar" button to copy document template for repeat orders

7. **Audit Trail**
   - Show document creation timestamp, created by user
   - Track all modifications with changelog

8. **Related Documents**
   - Link to shipments associated with document
   - Show payment receipts/confirmations

9. **Mobile Optimization**
   - Responsive table design with horizontal scroll
   - Touch-friendly filter panel
   - Bottom sheet for details modal on mobile

10. **Real-time Updates**
    - WebSocket integration to show newly created documents without refresh
    - Live badge showing "X new documents" with refresh button

11. **Keyboard Shortcuts**
    - Arrow keys to navigate selected row
    - Enter to open details modal
    - Ctrl+P to print selected document

---

### Performance Optimization Opportunities

1. **Client List Caching**
   - Store clients in localStorage or IndexedDB to reduce API calls
   - Refresh periodically or on user-triggered action

2. **Virtual Scrolling**
   - For very long lists, implement react-window or react-virtualized
   - Render only visible rows to improve performance

3. **Request Cancellation**
   - Already partially implemented with axios CancelToken
   - Ensure all pending requests cancel on filter/search changes

4. **Memo/useMemo for Expensive Calculations**
   - Row transformation (`rows` mapping) could be memoized
   - Date formatting functions could be optimized

5. **Lazy Load Modal Content**
   - Only render modal content when `showDetailsModal === true`
   - Currently implemented correctly

---

### Accessibility Considerations

1. **Keyboard Navigation**
   - Ensure table rows are keyboard-navigable (tab, arrow keys)
   - Filter panel should trap focus when open
   - Modal should trap focus and restore on close

2. **Screen Reader Support**
   - Add ARIA labels to filter inputs
   - Announce loading states and toast messages
   - Label action buttons with descriptive text

3. **Focus Management**
   - Return focus to trigger button when closing filter panel
   - Return focus to "View Details" button when closing modal
   - Highlight selected row with focus styles

4. **Color Contrast**
   - Verify WCAG AA compliance for text and button colors
   - Don't rely solely on color for status indication

---

### Testing Recommendations

**Unit Tests** (Future - Vitest/React Testing Library):
- Test filter logic independently
- Test date formatting function with edge cases
- Test enum lookup functions (document type, payment type)
- Test row selection toggle logic

**Integration Tests** (Future):
- Test API calls with mock responses
- Test pagination and infinite scroll behavior
- Test sort state transitions
- Test modal open/close flow

**E2E Tests** (Future - Cypress/Playwright):
- Navigate to page, verify document list loads
- Apply filters, verify results update
- Click row, verify selection highlights
- Click "View Details", verify modal opens with correct data
- Test search with debouncing
- Test infinite scroll by scrolling to bottom
- Test print button shows alert

**Manual Testing Checklist**:
- [ ] Page loads with default sort (ID desc)
- [ ] Search filters documents correctly (test with document number)
- [ ] All filter options work individually and in combination
- [ ] Date range filters respect inclusive bounds
- [ ] Amount range filters work with decimal values
- [ ] Sorting cycles through asc → desc → none
- [ ] Row selection highlights row without loading details
- [ ] "View Details" button fetches and displays document in modal
- [ ] Modal displays document information, items table, and payments table
- [ ] Print button shows browser alert("printing")
- [ ] Toast notifications appear for errors and warnings
- [ ] Filter panel closes on outside click
- [ ] Infinite scroll loads next page automatically
- [ ] Loading states appear during API requests
- [ ] Error messages display on network failure
- [ ] Action buttons disabled when no row selected
- [ ] Modal closes via close button

---

## 10. Backend Integration Notes

### Controller: SalesDocumentController

**Namespace**: `Backend.Api.Api.Controllers`
**Route Prefix**: `/api/SalesDocument`
**Authentication**: Required (`[Authorize]` attribute)

### Key Backend Endpoints

1. **GET /api/SalesDocument** - List with filters
   - Pagination: `pageNumber`, `pageSize`
   - Filters: `type`, `clientId`, `from`, `to`, `paymentType`, `minAmount`, `maxAmount`
   - Sorting: `orderBy`, `sortDirection`
   - Search: `q` (document number/description)

2. **GET /api/SalesDocument/{id}** - Get by ID
   - Returns full document with items and payments
   - 404 if not found

3. **POST /api/SalesDocument** - Create (not used by this page)
4. **PUT /api/SalesDocument/{id}** - Update header (not used by this page)
5. **POST /api/SalesDocument/finalize** - POS finalization (not used by this page)

### Backend Service: SalesDocumentService

**Interface**: `ISalesDocumentService`
**Implementation**: `SalesDocumentService`

**Key Method**:
```csharp
Task<PagedResult<GetSalesDocumentListItemDto>> GetAllAsync(
    SalesDocumentType? type,
    int? clientId,
    DateTimeOffset? from,
    DateTimeOffset? to,
    string? q,
    string? paymentType,
    decimal? minAmount,
    decimal? maxAmount,
    string? orderBy,
    string? sortDirection,
    PaginationParams pagination,
    CancellationToken ct
);
```

### DTO Mapping

**List Item DTO**: `GetSalesDocumentListItemDto`
- Properties: `Id`, `DocumentType`, `DocumentNumber`, `IssueDate`, `ClientId`, `TotalNet`, `TotalTax`, `TotalGross`, `NumberOfProducts`, `PaymentType`

**Full DTO**: `GetSalesDocumentDto`
- Extends list item with: `Description`, `Items` (array), `Payments` (array)

### Database Entities

**SalesDocument**:
- Table: `SalesDocuments`
- Key: `Id` (int, auto-increment)
- Relationships:
  - Many-to-one with `Client`
  - One-to-many with `SalesDocumentItem`
  - One-to-many with `SalesPayment`

**SalesDocumentItem**:
- Table: `SalesDocumentItems`
- Junction between `SalesDocument` and `Product`
- Properties: `Quantity`, `UnitPrice`, `TaxRate`, `TotalNet`, `TotalTax`, `TotalGross`

**SalesPayment**:
- Table: `SalesPayments`
- Tracks individual payments for a document
- Properties: `PaymentOption`, `Amount`, `TransactionDate`

---

## 11. Summary

The **Sales Documents** page is a read-only list view for browsing and inspecting sales documents (receipts and invoices) created through the point-of-sale system. It has been recently refactored to use a custom layout pattern consistent with warehouse products pages, featuring a modal-based details view instead of a sidebar panel.

### Key Strengths

- Advanced filtering with 7 filter criteria
- Infinite scroll pagination for smooth UX
- Modal-based document inspection with items and payments tables
- Responsive design with mobile considerations
- Clean separation of concerns (presentation, API, state management)
- Consistent layout with warehouse products pages

### Architecture Highlights

- **Custom Layout**: Two-column layout (sidebar + main content) without BaseListPage component
- **Explicit Details Loading**: Row selection only highlights; details loaded via "View Details" button
- **Modal Interface**: Wide modal dialog for document details with structured tables
- **Placeholder Print**: Browser alert for future print/PDF functionality
- **Follows Project Conventions**: Pagination (`PageNumber`, `PageSize`), custom API client with JWT auto-refresh
- **Debounced Search**: 500ms delay for performance
- **Action Button Pattern**: Uses `btn-action` class consistent with warehouse products pages

### Integration Points

- **Backend**: `/api/SalesDocument` endpoint with comprehensive query params
- **Related Pages**: POS page (document creation), warehouse products pages (layout pattern)
- **Shared Data**: Client list from `/api/Clients`

### Critical Behavior Changes (December 2025)

1. **Row Click**: Only highlights row (no automatic details fetch)
2. **View Details Button**: Explicitly fetches details and opens modal
3. **No Details Panel**: Removed right-side sidebar panel entirely
4. **Modal Dialog**: New UI pattern for displaying document information
5. **Print Button**: Browser alert placeholder instead of toast notification

This documentation should enable developers to understand, maintain, and extend the Sales Documents page effectively, with particular attention to the recent architectural changes that align the page with the warehouse products UI pattern.

---

**Document Version**: 2.0
**Last Updated**: 2025-12-26
**Maintainer**: Engineering Team
**Related Documentation**:
- `/project-documentation/FrontEndInfo.md` - Frontend architecture overview
- `/project-documentation/BackendInfo.md` - Backend API and database schema
- `/CLAUDE.md` - Project development guidelines
