/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useState } from 'react';

export const GlobalStateContext = createContext();

export const GlobalStateProvider = ({ children }) => {
    const [state, setState] = useState({
        isLoggedIn: false,
        level: null,
        userId: null,
        role: null
    });

    return (
        <GlobalStateContext.Provider value={{ state, setState }}>
            {children}
        </GlobalStateContext.Provider>
    );
};