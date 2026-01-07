import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { get, post, put, del, ApiError } from "../../lib/api";

// Types
export interface BotConfig {
  deviceId: string;
  botEnabled: boolean;
  timezone: string;
  businessHours: any[] | null;
  offHoursMessage: string | null;
  offHoursEnabled: boolean;
  handoffKeywords: string[];
  resumeKeywords: string[];
  welcomeMessage: string | null;
  handoffMessage: string | null;
  resumeMessage: string | null;
  ignoreGroups: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutoReplyRule {
  id: number;
  deviceId: string;
  name: string;
  trigger: string;
  matchType: "exact" | "contains" | "startsWith" | "regex";
  response: string;
  priority: number;
  isActive: boolean;
  cooldownSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface Handoff {
  senderJid: string;
  phoneNumber: string;
  handoffAt: string;
  reason: string;
  lastActivity: string;
}

export interface BotLog {
  id: number;
  deviceId: string;
  senderJid: string;
  actionType: string;
  ruleId: number | null;
  incomingMessage: string | null;
  responseMessage: string | null;
  createdAt: string;
}

interface BotState {
  config: BotConfig | null;
  rules: AutoReplyRule[];
  handoffs: Handoff[];
  logs: BotLog[];
  stats: {
    botEnabled: boolean;
    activeRules: number;
    conversations: any;
  } | null;
  loading: {
    config: boolean;
    rules: boolean;
    handoffs: boolean;
    logs: boolean;
    stats: boolean;
  };
  error: string | null;
}

const initialState: BotState = {
  config: null,
  rules: [],
  handoffs: [],
  logs: [],
  stats: null,
  loading: {
    config: false,
    rules: false,
    handoffs: false,
    logs: false,
    stats: false,
  },
  error: null,
};

// Async Thunks

export const fetchBotConfig = createAsyncThunk(
  "bot/fetchConfig",
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const response = await get<BotConfig>(`/bot/devices/${deviceId}/config`);
      if (!response.success) throw new Error(response.message);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch bot config");
    }
  }
);

export const updateBotConfig = createAsyncThunk(
  "bot/updateConfig",
  async (
    { deviceId, config }: { deviceId: string; config: Partial<BotConfig> },
    { rejectWithValue }
  ) => {
    try {
      const response = await put<BotConfig>(`/bot/devices/${deviceId}/config`, config);
      if (!response.success) throw new Error(response.message);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update bot config");
    }
  }
);

export const fetchRules = createAsyncThunk(
  "bot/fetchRules",
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const response = await get<AutoReplyRule[]>(`/bot/devices/${deviceId}/rules`);
      if (!response.success) throw new Error(response.message);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch rules");
    }
  }
);

export const createRule = createAsyncThunk(
  "bot/createRule",
  async (
    { deviceId, rule }: { deviceId: string; rule: Partial<AutoReplyRule> },
    { rejectWithValue }
  ) => {
    try {
      const response = await post<AutoReplyRule>(`/bot/devices/${deviceId}/rules`, rule);
      if (!response.success) throw new Error(response.message);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create rule");
    }
  }
);

export const updateRule = createAsyncThunk(
  "bot/updateRule",
  async (
    { deviceId, ruleId, rule }: { deviceId: string; ruleId: number; rule: Partial<AutoReplyRule> },
    { rejectWithValue }
  ) => {
    try {
      const response = await put<AutoReplyRule>(
        `/bot/devices/${deviceId}/rules/${ruleId}`,
        rule
      );
      if (!response.success) throw new Error(response.message);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update rule");
    }
  }
);

export const deleteRule = createAsyncThunk(
  "bot/deleteRule",
  async ({ deviceId, ruleId }: { deviceId: string; ruleId: number }, { rejectWithValue }) => {
    try {
      const response = await del(`/bot/devices/${deviceId}/rules/${ruleId}`);
      if (!response.success) throw new Error(response.message);
      return ruleId;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete rule");
    }
  }
);

export const fetchHandoffs = createAsyncThunk(
  "bot/fetchHandoffs",
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const response = await get<{ handoffs: Handoff[] }>(
        `/bot/devices/${deviceId}/handoffs`
      );
      if (!response.success || !response.data) throw new Error(response.message);
      return response.data.handoffs;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch handoffs");
    }
  }
);

export const resumeHandoff = createAsyncThunk(
  "bot/resumeHandoff",
  async (
    { deviceId, senderJid }: { deviceId: string; senderJid: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await post(
        `/bot/devices/${deviceId}/handoffs/${senderJid}/resume`,
        {}
      );
      if (!response.success) throw new Error(response.message);
      return senderJid;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to resume handoff");
    }
  }
);

export const fetchLogs = createAsyncThunk(
  "bot/fetchLogs",
  async (
    { deviceId, page = 1, limit = 50 }: { deviceId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const offset = (page - 1) * limit;
      const response = await get<{ logs: BotLog[]; total: number }>(
        `/bot/devices/${deviceId}/logs?limit=${limit}&offset=${offset}`
      );
      if (!response.success || !response.data) throw new Error(response.message);
      return response.data.logs;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch logs");
    }
  }
);

export const fetchStats = createAsyncThunk(
  "bot/fetchStats",
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const response = await get<any>(`/bot/devices/${deviceId}/stats`);
      if (!response.success) throw new Error(response.message);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch stats");
    }
  }
);

const botSlice = createSlice({
  name: "bot",
  initialState,
  reducers: {
    clearBotState: (state) => {
      state.config = null;
      state.rules = [];
      state.handoffs = [];
      state.logs = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Config
    builder
      .addCase(fetchBotConfig.pending, (state) => {
        state.loading.config = true;
        state.error = null;
      })
      .addCase(fetchBotConfig.fulfilled, (state, action) => {
        state.loading.config = false;
        if (action.payload) {
          state.config = action.payload;
        }
      })
      .addCase(fetchBotConfig.rejected, (state, action) => {
        state.loading.config = false;
        state.error = action.payload as string;
      })
      .addCase(updateBotConfig.fulfilled, (state, action) => {
        if (action.payload) {
          state.config = action.payload;
        }
      });

    // Rules
    builder
      .addCase(fetchRules.pending, (state) => {
        state.loading.rules = true;
      })
      .addCase(fetchRules.fulfilled, (state, action) => {
        state.loading.rules = false;
        if (action.payload) {
          state.rules = action.payload;
        }
      })
      .addCase(fetchRules.rejected, (state, action) => {
        state.loading.rules = false;
        state.error = action.payload as string;
      })
      .addCase(createRule.fulfilled, (state, action) => {
        if (action.payload) {
          state.rules.unshift(action.payload);
        }
      })
      .addCase(updateRule.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.rules.findIndex((r) => r.id === action.payload.id);
          if (index !== -1) {
            state.rules[index] = action.payload;
          }
        }
      })
      .addCase(deleteRule.fulfilled, (state, action) => {
        if (action.payload) {
          state.rules = state.rules.filter((r) => r.id !== action.payload);
        }
      });

    // Handoffs
    builder
      .addCase(fetchHandoffs.pending, (state) => {
        state.loading.handoffs = true;
      })
      .addCase(fetchHandoffs.fulfilled, (state, action) => {
        state.loading.handoffs = false;
        state.handoffs = action.payload;
      })
      .addCase(resumeHandoff.fulfilled, (state, action) => {
        state.handoffs = state.handoffs.filter((h) => h.senderJid !== action.payload);
      });

    // Logs
    builder
      .addCase(fetchLogs.pending, (state) => {
        state.loading.logs = true;
      })
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.loading.logs = false;
        state.logs = action.payload;
      });

    // Stats
    builder
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { clearBotState } = botSlice.actions;
export default botSlice.reducer;
