import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  createDevice,
  connectDevice,
  getDeviceStatus,
  getQRCode,
  DeviceStatus,
} from "@/lib/userService";

/**
 * Device Slice
 *
 * Purpose: Manage device operations (create, connect, status, QR code)
 * Why in Redux: Device operations are shared across multiple components
 */

interface DeviceState {
  // Current device being operated on
  currentDeviceId: string | null;

  // Device status
  deviceStatus: DeviceStatus | null;

  // QR Code
  qrCode: string | null;

  // Loading states
  isCreating: boolean;
  isConnecting: boolean;
  isCheckingStatus: boolean;
  isFetchingQR: boolean;

  // Error states
  createError: string | null;
  connectError: string | null;
  statusError: string | null;
  qrError: string | null;
}

const initialState: DeviceState = {
  currentDeviceId: null,
  deviceStatus: null,
  qrCode: null,
  isCreating: false,
  isConnecting: false,
  isCheckingStatus: false,
  isFetchingQR: false,
  createError: null,
  connectError: null,
  statusError: null,
  qrError: null,
};

/**
 * Create device
 */
export const createDeviceThunk = createAsyncThunk(
  "device/createDevice",
  async (
    { deviceId, deviceName }: { deviceId: string; deviceName?: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await createDevice(deviceId, deviceName);
      return { deviceId, deviceName, result };
    } catch (error) {
      // If device already exists or user doesn't have permission (403), treat as success
      // This is because regular users can't create devices (admin only), but device might already exist
      const errorMessage =
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : String(error);

      // Check for "already exists" message
      if (errorMessage.toLowerCase().includes("sudah ada")) {
        return { deviceId, deviceName, result: { success: true } };
      }

      // Check for permission errors (403 Forbidden) - user can't create but device might exist
      const errorStatus =
        error &&
        typeof error === "object" &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : null;

      if (
        errorStatus === 403 ||
        errorMessage.toLowerCase().includes("forbidden") ||
        errorMessage.toLowerCase().includes("akses ditolak") ||
        errorMessage.toLowerCase().includes("permission denied")
      ) {
        // Treat as success - device might already exist, user just can't create new ones
        return { deviceId, deviceName, result: { success: true } };
      }

      const message =
        error instanceof Error ? error.message : "Failed to create device";
      return rejectWithValue(message);
    }
  }
);

/**
 * Connect device
 */
export const connectDeviceThunk = createAsyncThunk(
  "device/connectDevice",
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const result = await connectDevice(deviceId);
      return { deviceId, ...result };
    } catch (error) {
      // Extract error message from various error formats
      let message = "Failed to connect device";
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === "object") {
        if ("message" in error && typeof error.message === "string") {
          message = error.message;
        } else if ("error" in error && typeof error.error === "string") {
          message = error.error;
        }
      } else if (typeof error === "string") {
        message = error;
      }
      console.error("Connect device error:", { deviceId, error, extractedMessage: message });
      return rejectWithValue(message);
    }
  }
);

/**
 * Get device status
 */
export const getDeviceStatusThunk = createAsyncThunk(
  "device/getDeviceStatus",
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const status = await getDeviceStatus(deviceId);
      return { deviceId, status };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get device status";
      return rejectWithValue(message);
    }
  }
);

/**
 * Get QR code
 */
export const getQRCodeThunk = createAsyncThunk(
  "device/getQRCode",
  async (deviceId: string, { rejectWithValue }) => {
    try {
      const qrData = await getQRCode(deviceId);
      return { deviceId, qrCode: qrData.qrCode };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get QR code";
      return rejectWithValue(message);
    }
  }
);

/**
 * Get QR code as image (from /qr-image endpoint)
 */
export const getQRCodeImageThunk = createAsyncThunk(
  "device/getQRCodeImage",
  async (
    { deviceId, format = "png" }: { deviceId: string; format?: string },
    { rejectWithValue }
  ) => {
    try {
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const response = await fetch(
        `${API_BASE_URL}/whatsapp-multi-device/devices/${encodeURIComponent(
          deviceId
        )}/qr-image?format=${format}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        let errorMessage = "QR code not available yet";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const json = await response.json();
            errorMessage = json.message || json.error || errorMessage;
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const json = await response.json();

      if (json.success && json.data && json.data.qrImage) {
        return { deviceId, qrCode: json.data.qrImage };
      }

      throw new Error("QR code not available in response");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get QR code image";
      return rejectWithValue(message);
    }
  }
);

const deviceSlice = createSlice({
  name: "device",
  initialState,
  reducers: {
    clearDeviceState: (state) => {
      state.currentDeviceId = null;
      state.deviceStatus = null;
      state.qrCode = null;
      state.createError = null;
      state.connectError = null;
      state.statusError = null;
      state.qrError = null;
    },
    clearErrors: (state) => {
      state.createError = null;
      state.connectError = null;
      state.statusError = null;
      state.qrError = null;
    },
    setCurrentDevice: (state, action) => {
      state.currentDeviceId = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Create device
    builder
      .addCase(createDeviceThunk.pending, (state) => {
        state.isCreating = true;
        state.createError = null;
      })
      .addCase(createDeviceThunk.fulfilled, (state, action) => {
        state.isCreating = false;
        state.currentDeviceId = action.payload.deviceId;
      })
      .addCase(createDeviceThunk.rejected, (state, action) => {
        state.isCreating = false;
        state.createError = action.payload as string;
      });

    // Connect device
    builder
      .addCase(connectDeviceThunk.pending, (state) => {
        state.isConnecting = true;
        state.connectError = null;
      })
      .addCase(connectDeviceThunk.fulfilled, (state, action) => {
        state.isConnecting = false;
        state.currentDeviceId = action.payload.deviceId;
      })
      .addCase(connectDeviceThunk.rejected, (state, action) => {
        state.isConnecting = false;
        state.connectError = action.payload as string;
      });

    // Get device status
    builder
      .addCase(getDeviceStatusThunk.pending, (state) => {
        state.isCheckingStatus = true;
        state.statusError = null;
      })
      .addCase(getDeviceStatusThunk.fulfilled, (state, action) => {
        state.isCheckingStatus = false;
        state.deviceStatus = action.payload.status;
        state.currentDeviceId = action.payload.deviceId;
      })
      .addCase(getDeviceStatusThunk.rejected, (state, action) => {
        state.isCheckingStatus = false;
        state.statusError = action.payload as string;
      });

    // Get QR code
    builder
      .addCase(getQRCodeThunk.pending, (state) => {
        state.isFetchingQR = true;
        state.qrError = null;
      })
      .addCase(getQRCodeThunk.fulfilled, (state, action) => {
        state.isFetchingQR = false;
        state.qrCode = action.payload.qrCode;
      })
      .addCase(getQRCodeThunk.rejected, (state, action) => {
        state.isFetchingQR = false;
        state.qrError = action.payload as string;
      });

    // Get QR code image
    builder
      .addCase(getQRCodeImageThunk.pending, (state) => {
        state.isFetchingQR = true;
        state.qrError = null;
      })
      .addCase(getQRCodeImageThunk.fulfilled, (state, action) => {
        state.isFetchingQR = false;
        state.qrCode = action.payload.qrCode;
      })
      .addCase(getQRCodeImageThunk.rejected, (state, action) => {
        state.isFetchingQR = false;
        state.qrError = action.payload as string;
      });
  },
});

export const { clearDeviceState, clearErrors, setCurrentDevice } =
  deviceSlice.actions;
export default deviceSlice.reducer;
