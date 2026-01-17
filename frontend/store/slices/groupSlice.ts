import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { groupService, Group } from "@/lib/groupService";

/**
 * Group Slice
 *
 * Purpose: Manage group operations for user
 */

interface GroupState {
  groups: Group[];
  total: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: GroupState = {
  groups: [],
  total: 0,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

/**
 * Get groups for device
 */
export const getGroupsThunk = createAsyncThunk(
  "group/getGroups",
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const result = await groupService.getGroups(deviceId);
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch groups";
      return rejectWithValue(message);
    }
  }
);

const groupSlice = createSlice({
  name: "group",
  initialState,
  reducers: {
    clearGroupState: (state) => {
      state.groups = [];
      state.total = 0;
      state.isLoading = false;
      state.error = null;
      state.lastUpdated = null;
    },
  },
  extraReducers: (builder) => {
    // Get groups
    builder
      .addCase(getGroupsThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getGroupsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.groups = action.payload.groups;
        state.total = action.payload.total;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(getGroupsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearGroupState } = groupSlice.actions;
export default groupSlice.reducer;
