# Frontend Information

This document provides a summary of the frontend application, including its structure, components, and pages.

## Project Structure

The frontend is a React application built with Vite. The main source code is located in the `src/` directory.

-   `main.jsx`: The entry point of the application where the React DOM is initialized.
-   `GlobalState.jsx`: Manages the global state of the application, likely using React's Context API.

### `api/`

This directory contains the logic for making requests to the backend API.

-   `apiClient.js`: A client for making HTTP requests to the backend.

### `assets/`

This directory holds static assets used in the application.

-   `bg-login.svg`: Background image for the login page.
-   `bg-main.svg`: Main background image.

### `components/`

This directory contains reusable UI components.

-   `ConfirmDialog.jsx`: A dialog for confirming user actions.
-   `Fallback.jsx`: A fallback component to display while loading or on error.
-   `Header.jsx`: The main header of the application.
-   `MessageBox.jsx`: A component to display messages to the user.
-   `Modal.jsx`: A general-purpose modal component.
-   `ProtectedRoute.jsx`: A component to protect routes that require authentication.
-   `Forms/ProductForm.jsx`: A form for creating and editing products.

### `pages/`

This directory contains the main pages of the application.

-   `BaseListPage.jsx`: A base component for pages that display a list of items.
-   `Dashboard.jsx`: The main dashboard page.
-   `Login.jsx`: The login page.
-   `ErrorPages/`: Contains pages for displaying errors.
    -   `AccessDenied.jsx`: Page shown when a user tries to access a restricted page.
    -   `NotFound.jsx`: Page shown for 404 errors.
-   `Organization/`: Contains pages related to organization management.
    -   `Users.jsx`: Page for managing users.
-   `Storage/`: Contains pages related to storage and inventory.
    -   `Products.jsx`: Page for managing products.

### `styles/`

This directory contains the CSS stylesheets for the application.

-   `style.css`: Global styles.
-   `error.css`: Styles for error pages.
-   `ComponentsStyles/`: Styles for specific components.
    -   `confirmDialog.css`
    -   `fallback.css`
    -   `header.css`
    -   `messageBox.css`
    -   `modal.css`
-   `PagesStyles/`: Styles for specific pages.
    -   `baseListPage.css`
    -   `dashboard.css`
    -   `login.css`
