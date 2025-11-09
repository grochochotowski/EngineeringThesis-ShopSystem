/* eslint-disable react-refresh/only-export-components */

// imports
import React, { useContext, Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { GlobalStateProvider, GlobalStateContext } from './GlobalState';

import './styles/style.css'

// Lazy loading pages
const Login = lazy(() => import('./pages/Login'))
const NotFound = lazy(() => import('./pages/ErrorPages/NotFound.jsx'))
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

    { path: '/404', element: <NotFound /> },
    //{ path: '/fallback', element: <Fallback /> },
]);

// Root render
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GlobalStateProvider>
            <Suspense fallback={<div>Loading...</div>}>
                <RouterProvider router={router} />
            </Suspense>
        </GlobalStateProvider>
    </React.StrictMode>
)
