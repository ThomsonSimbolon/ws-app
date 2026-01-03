import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "./slices/themeSlice";
import authReducer from "./slices/authSlice";
import dashboardReducer from "./slices/dashboardSlice";
import userDashboardReducer from "./slices/userDashboardSlice";
import deviceReducer from "./slices/deviceSlice";

/**
 * Redux Store Configuration
 *
 * This store manages ONLY global application state:
 * - theme: Dark/light mode toggle (global)
 * - auth: User authentication and profile (global)
 * - dashboard: Admin dashboard stats and transactions data (global)
 * - userDashboard: User dashboard data (devices, chats) (global)
 *
 * NOT stored in Redux:
 * - UI state (sidebar open/closed, dropdown states, modal visibility)
 * - Form state (local to forms)
 * - Component-specific state (pagination, filters local to component)
 *
 * These should use React local state (useState, useReducer) instead.
 */

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    dashboard: dashboardReducer,
    userDashboard: userDashboardReducer,
    device: deviceReducer,
  },
  // Redux DevTools enabled in development only
  devTools: process.env.NODE_ENV !== "production",
});

// Export types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
