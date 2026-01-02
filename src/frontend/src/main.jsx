/* eslint-disable react-refresh/only-export-components */

// imports
import React, { useContext, Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { GlobalStateProvider, GlobalStateContext } from './GlobalState';

import './styles/style.css'

import Fallback from "./components/Fallback";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy loading pages
const Login = lazy(() => import('./pages/Login'))
const NotFound = lazy(() => import('./pages/ErrorPages/NotFound.jsx'))
const AccessDenied = lazy(() => import('./pages/ErrorPages/AccessDenied.jsx'))
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const POS = lazy(() => import('./pages/POS.jsx'));
const SalesDocuments = lazy(() => import('./pages/Sales/Documents.jsx'));
const GiftCards = lazy(() => import('./pages/Sales/GiftCards.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));

const Users = lazy(() => import("./pages/Organization/Users.jsx"));
const Clients = lazy(() => import("./pages/Organization/Clients.jsx"));
const Addresses = lazy(() => import("./pages/Organization/Addresses.jsx"));
const Categories = lazy(() => import("./pages/Organization/Categories.jsx"));
const TaxRates = lazy(() => import("./pages/Organization/TaxRates.jsx"));
const OrganizationProducts = lazy(() => import("./pages/Organization/Products.jsx"));

const StorageProducts = lazy(() => import("./pages/Storage/StorageProducts.jsx"));
const Warehouses = lazy(() => import("./pages/Storage/Warehouses.jsx"));
const InventoryReports = lazy(() => import("./pages/Storage/InventoryReports.jsx"));

const IncomingShipments = lazy(() => import("./pages/Shipments/Incoming.jsx"));
const LeavingShipments = lazy(() => import("./pages/Shipments/Leaving.jsx"));

const ClientTypes = lazy(() => import("./pages/Dictionaries/ClientTypes.jsx"));
const Countries = lazy(() => import("./pages/Dictionaries/Countries.jsx"));
const PaymentOptions = lazy(() => import("./pages/Dictionaries/PaymentOptions.jsx"));
const SalesDocumentTypes = lazy(() => import("./pages/Dictionaries/SalesDocumentTypes.jsx"));
const ShipmentStatuses = lazy(() => import("./pages/Dictionaries/ShipmentStatuses.jsx"));
const ShipmentTypes = lazy(() => import("./pages/Dictionaries/ShipmentTypes.jsx"));
const UserRoles = lazy(() => import("./pages/Dictionaries/UserRoles.jsx"));

// Protected route wrapper
const PrivateRoute = ({ children }) => {
    const { state } = useContext(GlobalStateContext);
    return state.isLoggedIn ? children : <Navigate to="/" replace/>;
};

// Helper function to get user role from localStorage user object
const getUserRole = () => {
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        return user?.role || null;
    } catch {
        return null;
    }
};

// Router definition
const router = createBrowserRouter([
    { path: '/', element: <Login />, errorElement: <NotFound /> },

    { path: '/dashboard', element:  <PrivateRoute><Dashboard /></PrivateRoute>, errorElement: <NotFound /> },

    {
        path: '/pos',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <POS />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/sales/documents',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <SalesDocuments />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/sales/giftcards',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <GiftCards />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/reports',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="Manager">
                    <Reports />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },

    {
        path: '/organization/users',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="DeputyManager">
                    <Users />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/organization/clients',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <Clients />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/organization/addresses',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <Addresses />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/organization/categories',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <Categories />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/organization/tax-rates',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <TaxRates />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/organization/products',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <OrganizationProducts />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/storage/products',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <StorageProducts />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/storage/warehouses',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <Warehouses />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/storage/inventory-reports',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <InventoryReports />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },

    {
        path: '/shipments/incoming',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <IncomingShipments />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/shipments/leaving',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <LeavingShipments />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },

    {
        path: '/dictionaries/client-types',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <ClientTypes />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/dictionaries/payment-options',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <PaymentOptions />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/dictionaries/sales-document-types',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <SalesDocumentTypes />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/dictionaries/shipment-statuses',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <ShipmentStatuses />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/dictionaries/shipment-types',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <ShipmentTypes />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/dictionaries/user-roles',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <UserRoles />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },
    {
        path: '/dictionaries/countries',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={getUserRole()} requiredRole="ShopAssistant">
                    <Countries />
                </ProtectedRoute>
            </PrivateRoute>
        ),
        errorElement: <NotFound />,
    },

    { path: '/404', element: <NotFound /> },
    { path: '/403', element: <AccessDenied /> },
    { path: '/fallback', element: <Fallback /> },
]);

// Root render
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GlobalStateProvider>
            <Suspense fallback={<Fallback />}>
                <RouterProvider router={router} />
            </Suspense>
        </GlobalStateProvider>
    </React.StrictMode>
)
