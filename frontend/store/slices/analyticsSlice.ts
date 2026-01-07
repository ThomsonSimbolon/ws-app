import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { get } from "../../lib/api";

// Types
export interface UserStats {
  total: number;
  active: number;
  admins: number;
  regular: number;
}

export interface DeviceStats {
  total: number;
  active: number;
  connected: number;
  statusDistribution: { status: string; count: number }[];
}

export interface MessageStats {
  total: number;
  incoming: number;
  outgoing: number;
  statusDistribution: { status: string; count: number }[];
}

export interface ActivityStats {
  last24Hours: {
    messages: number;
    newUsers: number;
    newDevices: number;
  };
}

export interface GlobalStats {
  users: UserStats;
  devices: DeviceStats;
  messages: MessageStats;
  groups: { total: number; active: number };
  contacts: { total: number };
  activity: ActivityStats;
  timestamp: string;
}

export interface TrendDataPoint {
  date: string;
  incoming: number;
  outgoing: number;
  activeChats: number;
}

interface AnalyticsState {
  globalStats: GlobalStats | null;
  trendData: TrendDataPoint[];
  loading: {
    globalStats: boolean;
    trendData: boolean;
  };
  error: string | null;
}

const initialState: AnalyticsState = {
  globalStats: null,
  trendData: [],
  loading: {
    globalStats: false,
    trendData: false,
  },
  error: null,
};

// Async Thunks

export const fetchGlobalStats = createAsyncThunk(
  "analytics/fetchGlobalStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await get<GlobalStats>("/admin/stats");
      if (!response.success) throw new Error(response.message);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch global stats");
    }
  }
);

export const fetchMessageTrend = createAsyncThunk(
  "analytics/fetchMessageTrend",
  async (days: number = 7, { rejectWithValue }) => {
    try {
      // First get all devices
      const devicesRes = await get<{ devices: any[] }>("/admin/devices");
      if (!devicesRes.success || !devicesRes.data) {
        throw new Error("Failed to fetch devices");
      }

      const devices = Array.isArray(devicesRes.data)
        ? devicesRes.data
        : (devicesRes.data as any).rows || [];

      if (devices.length === 0) {
        return [];
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Fetch statistics for each device
      const statsPromises = devices.map(async (device: any) => {
        const deviceId = device.id || device.deviceId;
        try {
          const res = await get<any[]>(
            `/whatsapp-multi-device/devices/${deviceId}/statistics?startDate=${startDateStr}&endDate=${endDateStr}`
          );
          if (res.success && res.data) {
            return res.data;
          }
          return [];
        } catch {
          return [];
        }
      });

      const allStats = await Promise.all(statsPromises);

      // Aggregate by date
      const dateMap = new Map<string, TrendDataPoint>();

      allStats.flat().forEach((stat: any) => {
        const date = stat.date;
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            date,
            incoming: 0,
            outgoing: 0,
            activeChats: 0,
          });
        }
        const point = dateMap.get(date)!;
        point.incoming += stat.messagesIncoming || 0;
        point.outgoing += stat.messagesOutgoing || 0;
        point.activeChats += stat.activeChats || 0;
      });

      // Sort by date and return
      return Array.from(dateMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch message trend");
    }
  }
);

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    clearAnalytics(state) {
      state.globalStats = null;
      state.trendData = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchGlobalStats
    builder.addCase(fetchGlobalStats.pending, (state) => {
      state.loading.globalStats = true;
      state.error = null;
    });
    builder.addCase(fetchGlobalStats.fulfilled, (state, action: PayloadAction<GlobalStats | undefined>) => {
      state.loading.globalStats = false;
      state.globalStats = action.payload || null;
    });
    builder.addCase(fetchGlobalStats.rejected, (state, action) => {
      state.loading.globalStats = false;
      state.error = action.payload as string;
    });

    // fetchMessageTrend
    builder.addCase(fetchMessageTrend.pending, (state) => {
      state.loading.trendData = true;
      state.error = null;
    });
    builder.addCase(fetchMessageTrend.fulfilled, (state, action: PayloadAction<TrendDataPoint[]>) => {
      state.loading.trendData = false;
      state.trendData = action.payload;
    });
    builder.addCase(fetchMessageTrend.rejected, (state, action) => {
      state.loading.trendData = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearAnalytics } = analyticsSlice.actions;
export default analyticsSlice.reducer;
