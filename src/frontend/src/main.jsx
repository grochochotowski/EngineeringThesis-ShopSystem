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

// Protected route wrapper
const PrivateRoute = ({ children }) => {
    const { state } = useContext(GlobalStateContext);
    return state.isLoggedIn ? children : <Navigate to="/" replace/>;
};

// Router definition
const router = createBrowserRouter([
    { path: '/', element: <Login />, errorElement: <NotFound /> },

    { path: '/dashboard', element:  <PrivateRoute><Dashboard /></PrivateRoute>, errorElement: <NotFound /> },

    {
        path: '/organization/users',
        element: (
            <PrivateRoute>
                <ProtectedRoute userRole={localStorage.getItem("userRole")} requiredRole="DeputyManager">
                    <Users />
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
