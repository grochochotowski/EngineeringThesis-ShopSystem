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

const PrivateRoute = ({ children }) => {
    const { state } = useContext(GlobalStateContext);
    return state.isLoggedIn ? children : <Navigate to="/404" />;
};

const router = createBrowserRouter([
    { path: '/', element: <Login />, errorElement: <NotFound /> },

    { path: '/404', element: <NotFound /> },
    //{ path: '/fallback', element: <Fallback /> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GlobalStateProvider>
            <RouterProvider router={router} />
        </GlobalStateProvider>
    </React.StrictMode>
)
