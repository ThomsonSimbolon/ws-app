import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getGlobalStats,
  getRecentUsers,
  getRecentDevices,
  getRecentMessages,
  GlobalStats,
  User,
  Device,
  Message,
} from "@/lib/adminService";

/**
 * Dashboard Slice - GLOBAL State
 *
 * Purpose: Manage dashboard data (stats, users, devices, messages)
 * Why in Redux: Dashboard data is global, shared across dashboard pages
 */

export interface Stat {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down";
  icon?: React.ReactNode;
}

interface DashboardState {
  // Global stats
  globalStats: GlobalStats | null;

  // Recent data
  recentUsers: User[];
  recentDevices: Device[];
  recentMessages: Message[];

  // Legacy stats (for compatibility with existing components)
  stats: Stat[];

  // Loading states
  isLoading: boolean;
  isLoadingStats: boolean;
  isLoadingUsers: boolean;
  isLoadingDevices: boolean;
  isLoadingMessages: boolean;

  // Error states
  error: string | null;
  statsError: string | null;
  usersError: string | null;
  devicesError: string | null;
  messagesError: string | null;
}

const initialState: DashboardState = {
  globalStats: null,
  recentUsers: [],
  recentDevices: [],
  recentMessages: [],
  stats: [],
  isLoading: false,
  isLoadingStats: false,
  isLoadingUsers: false,
  isLoadingDevices: false,
  isLoadingMessages: false,
  error: null,
  statsError: null,
  usersError: null,
  devicesError: null,
  messagesError: null,
};

/**
 * Fetch global statistics
 */
export const fetchGlobalStats = createAsyncThunk(
  "dashboard/fetchGlobalStats",
  async (_, { rejectWithValue }) => {
    try {
      const stats = await getGlobalStats();
      return stats;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch statistics";
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch recent users
 */
export const fetchRecentUsers = createAsyncThunk(
  "dashboard/fetchRecentUsers",
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const response = await getRecentUsers(limit);
      return response.users;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch users";
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch recent devices
 */
export const fetchRecentDevices = createAsyncThunk(
  "dashboard/fetchRecentDevices",
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const response = await getRecentDevices(limit);
      return response.devices;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch devices";
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch recent messages
 */
export const fetchRecentMessages = createAsyncThunk(
  "dashboard/fetchRecentMessages",
  async (limit: number = 20, { rejectWithValue }) => {
    try {
      const response = await getRecentMessages(limit);
      return response.messages;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch messages";
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch all dashboard data
 */
export const fetchDashboardData = createAsyncThunk(
  "dashboard/fetchDashboardData",
  async (_, { dispatch }) => {
    await Promise.all([
      dispatch(fetchGlobalStats()),
      dispatch(fetchRecentUsers(10)),
      dispatch(fetchRecentDevices(10)),
      dispatch(fetchRecentMessages(20)),
    ]);
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.statsError = null;
      state.usersError = null;
      state.devicesError = null;
      state.messagesError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch global stats
    builder
      .addCase(fetchGlobalStats.pending, (state) => {
        state.isLoadingStats = true;
        state.statsError = null;
      })
      .addCase(fetchGlobalStats.fulfilled, (state, action) => {
        state.isLoadingStats = false;
        state.globalStats = action.payload;
        state.statsError = null;

        // Transform global stats to legacy stats format for compatibility
        if (action.payload) {
          state.stats = [
            {
              id: "users",
              label: "Total Users",
              value: action.payload.users.total,
              change: `${action.payload.activity.last24Hours.newUsers} new`,
              trend:
                action.payload.activity.last24Hours.newUsers > 0
                  ? "up"
                  : undefined,
            },
            {
              id: "devices",
              label: "Total Devices",
              value: action.payload.devices.total,
              change: `${action.payload.devices.connected} connected`,
            },
            {
              id: "messages",
              label: "Total Messages",
              value: action.payload.messages.total,
              change: `${action.payload.activity.last24Hours.messages} last 24h`,
            },
            {
              id: "groups",
              label: "Total Groups",
              value: action.payload.groups.total,
              change: `${action.payload.groups.active} active`,
            },
          ];
        }
      })
      .addCase(fetchGlobalStats.rejected, (state, action) => {
        state.isLoadingStats = false;
        state.statsError = action.payload as string;
      });

    // Fetch recent users
    builder
      .addCase(fetchRecentUsers.pending, (state) => {
        state.isLoadingUsers = true;
        state.usersError = null;
      })
      .addCase(fetchRecentUsers.fulfilled, (state, action) => {
        state.isLoadingUsers = false;
        state.recentUsers = action.payload;
        state.usersError = null;
      })
      .addCase(fetchRecentUsers.rejected, (state, action) => {
        state.isLoadingUsers = false;
        state.usersError = action.payload as string;
      });

    // Fetch recent devices
    builder
      .addCase(fetchRecentDevices.pending, (state) => {
        state.isLoadingDevices = true;
        state.devicesError = null;
      })
      .addCase(fetchRecentDevices.fulfilled, (state, action) => {
        state.isLoadingDevices = false;
        state.recentDevices = action.payload;
        state.devicesError = null;
      })
      .addCase(fetchRecentDevices.rejected, (state, action) => {
        state.isLoadingDevices = false;
        state.devicesError = action.payload as string;
      });

    // Fetch recent messages
    builder
      .addCase(fetchRecentMessages.pending, (state) => {
        state.isLoadingMessages = true;
        state.messagesError = null;
      })
      .addCase(fetchRecentMessages.fulfilled, (state, action) => {
        state.isLoadingMessages = false;
        state.recentMessages = action.payload;
        state.messagesError = null;
      })
      .addCase(fetchRecentMessages.rejected, (state, action) => {
        state.isLoadingMessages = false;
        state.messagesError = action.payload as string;
      });

    // Fetch all dashboard data
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch dashboard data";
      });
  },
});

export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
