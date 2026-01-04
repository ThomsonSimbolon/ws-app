import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getMyDevices,
  getConnectedDevices,
  getDailyChatList,
  Device,
  DailyChat,
} from '@/lib/userService';

/**
 * User Dashboard Slice
 * 
 * Purpose: Manage user dashboard data (devices, stats, recent chats)
 * Why in Redux: Dashboard data is global, shared across user dashboard pages
 */

interface UserDashboardState {
  // Devices
  devices: Device[];
  connectedDevices: Device[];
  
  // Recent chats (from first connected device)
  recentChats: DailyChat[];
  
  // Stats
  totalDevices: number;
  connectedDevicesCount: number;
  messagesToday: number;
  
  // Loading states
  isLoading: boolean;
  isLoadingDevices: boolean;
  isLoadingChats: boolean;
  
  // Error states
  error: string | null;
  devicesError: string | null;
  chatsError: string | null;
}

const initialState: UserDashboardState = {
  devices: [],
  connectedDevices: [],
  recentChats: [],
  totalDevices: 0,
  connectedDevicesCount: 0,
  messagesToday: 0,
  isLoading: false,
  isLoadingDevices: false,
  isLoadingChats: false,
  error: null,
  devicesError: null,
  chatsError: null,
};

/**
 * Fetch user devices
 */
export const fetchUserDevices = createAsyncThunk(
  'userDashboard/fetchDevices',
  async (_, { rejectWithValue }) => {
    try {
      const devices = await getMyDevices();
      return devices;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch devices';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch connected devices
 */
export const fetchConnectedDevices = createAsyncThunk(
  'userDashboard/fetchConnectedDevices',
  async (_, { rejectWithValue }) => {
    try {
      const devices = await getConnectedDevices();
      return devices;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch connected devices';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch recent chats from first connected device
 */
export const fetchRecentChats = createAsyncThunk(
  'userDashboard/fetchRecentChats',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { userDashboard: UserDashboardState };
      const connectedDevices = state.userDashboard.connectedDevices;
      
      if (connectedDevices.length === 0) {
        return [];
      }
      
      // Get chats from first connected device
      const firstDevice = connectedDevices[0];
      const today = new Date().toISOString().split('T')[0];
      const chatList = await getDailyChatList(firstDevice.deviceId, today);
      
      // Return top 10 chats (with null check to prevent slice error)
      const chats = chatList?.chats || [];
      return chats.slice(0, 10);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch recent chats';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch all dashboard data
 */
export const fetchUserDashboardData = createAsyncThunk(
  'userDashboard/fetchAll',
  async (_, { dispatch }) => {
    await Promise.all([
      dispatch(fetchUserDevices()),
      dispatch(fetchConnectedDevices()),
    ]);
    // Fetch chats after devices are loaded
    await dispatch(fetchRecentChats());
  }
);

const userDashboardSlice = createSlice({
  name: 'userDashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.devicesError = null;
      state.chatsError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch devices
    builder
      .addCase(fetchUserDevices.pending, (state) => {
        state.isLoadingDevices = true;
        state.devicesError = null;
      })
      .addCase(fetchUserDevices.fulfilled, (state, action) => {
        state.isLoadingDevices = false;
        state.devices = action.payload;
        state.totalDevices = action.payload.length;
      })
      .addCase(fetchUserDevices.rejected, (state, action) => {
        state.isLoadingDevices = false;
        state.devicesError = action.payload as string;
      });

    // Fetch connected devices
    builder
      .addCase(fetchConnectedDevices.pending, (state) => {
        state.isLoadingDevices = true;
      })
      .addCase(fetchConnectedDevices.fulfilled, (state, action) => {
        state.connectedDevices = action.payload;
        state.connectedDevicesCount = action.payload.length;
        state.isLoadingDevices = false;
      })
      .addCase(fetchConnectedDevices.rejected, (state) => {
        state.isLoadingDevices = false;
      });

    // Fetch recent chats
    builder
      .addCase(fetchRecentChats.pending, (state) => {
        state.isLoadingChats = true;
        state.chatsError = null;
      })
      .addCase(fetchRecentChats.fulfilled, (state, action) => {
        state.isLoadingChats = false;
        state.recentChats = action.payload;
      })
      .addCase(fetchRecentChats.rejected, (state, action) => {
        state.isLoadingChats = false;
        state.chatsError = action.payload as string;
      });

    // Fetch all dashboard data
    builder
      .addCase(fetchUserDashboardData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserDashboardData.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(fetchUserDashboardData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = userDashboardSlice.actions;
export default userDashboardSlice.reducer;

