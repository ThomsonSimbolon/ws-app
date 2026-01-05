/**
 * User Service
 *
 * Service layer for user-specific API calls (non-admin endpoints)
 */

import { get, post, put, del, ApiError } from "./api";

// Type Definitions
export interface Device {
  id: number;
  userId: number;
  deviceId: string;
  deviceName: string;
  phoneNumber?: string;
  status: "disconnected" | "connecting" | "connected" | "qr_required";
  isActive: boolean;
  lastSeen?: string;
  deviceInfo?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceStatus {
  deviceId: string;
  status: "disconnected" | "connecting" | "connected" | "qr_required";
  isActive: boolean;
  phoneNumber?: string;
  lastSeen?: string;
  deviceInfo?: Record<string, unknown>;
}

export interface SendMessageRequest {
  phone: string;
  message: string;
  type?: "text" | "image" | "video" | "audio" | "document";
}

export interface SendMessageResponse {
  messageId: string;
  to: string;
  message: string;
  type: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
  type: string;
  direction: "incoming" | "outgoing";
  status?: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  jid: string;
  deviceId: string;
  total: number;
}

export interface DailyChat {
  jid: string;
  name?: string;
  phoneNumber?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isGroup?: boolean;
}

export interface DailyChatListResponse {
  chats: DailyChat[];
  deviceId: string;
  date: string;
}

export interface Job {
  id: string;
  type: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  data: Record<string, unknown>;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface JobStatusResponse {
  job: Job;
}

export interface Profile {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  fullName?: string;
  password?: string;
}

export interface ProfileResponse {
  user: Profile;
}

export interface Contact {
  id?: string;
  name?: string;
  phoneNumber: string;
  jid: string;
  profilePicture?: string;
}

export interface ContactsResponse {
  contacts: Contact[];
  deviceId: string;
  total: number;
}

/**
 * Get user's devices
 */
export async function getMyDevices(): Promise<Device[]> {
  try {
    const response = await get<{ devices: Device[]; count: number }>(
      "/whatsapp-multi-device/devices"
    );

    if (!response.success) {
      throw {
        message: response.message || "Failed to fetch devices",
      } as ApiError;
    }

    // Backend returns { devices: [...], count: ... }
    if (!response.data) {
      return [];
    }

    // Handle different response structures
    if (Array.isArray(response.data)) {
      // Direct array response (shouldn't happen but handle it)
      return response.data;
    }

    // Normal structure: { devices: [...], count: ... }
    if (response.data.devices && Array.isArray(response.data.devices)) {
      return response.data.devices;
    }

    // Fallback: return empty array if structure is unexpected
    return [];
  } catch (error) {
    console.error("[getMyDevices] Error:", error);
    throw error;
  }
}

/**
 * Create device
 */
export interface CreateDeviceRequest {
  deviceId: string;
  deviceName?: string;
}

export interface CreateDeviceResponse {
  success: boolean;
  message?: string;
}

export async function createDevice(
  deviceId: string,
  deviceName?: string
): Promise<CreateDeviceResponse> {
  try {
    const response = await post<CreateDeviceResponse>(
      "/whatsapp-multi-device/devices",
      {
        deviceId,
        deviceName: deviceName || "Device",
      }
    );

    // If device already exists, that's okay - return success
    if (!response.success) {
      const errorMsg = response.message || "";
      if (errorMsg.toLowerCase().includes("sudah ada")) {
        return { success: true };
      }
      throw {
        message: response.message || "Failed to create device",
      } as ApiError;
    }

    return {
      success: true,
      message: response.message,
    };
  } catch (error) {
    // If error message contains "sudah ada", treat as success
    const errorMessage =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : String(error);
    if (errorMessage.toLowerCase().includes("sudah ada")) {
      return { success: true };
    }
    throw error;
  }
}

/**
 * Get connected devices
 */
export async function getConnectedDevices(): Promise<Device[]> {
  try {
    const response = await get<{ devices: Device[]; count: number }>(
      "/whatsapp-multi-device/devices/connected"
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch connected devices",
      } as ApiError;
    }

    // Backend returns { devices: [...], count: ... }
    return Array.isArray(response.data.devices) ? response.data.devices : [];
  } catch (error) {
    throw error;
  }
}

/**
 * Get device details
 */
export async function getDeviceDetails(deviceId: string): Promise<Device> {
  try {
    const response = await get<Device>(
      `/whatsapp-multi-device/devices/${deviceId}`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch device details",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get device status
 */
export async function getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
  try {
    const response = await get<DeviceStatus>(
      `/whatsapp-multi-device/devices/${deviceId}/status`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch device status",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Connect device (initiate WhatsApp connection)
 */
export async function connectDevice(
  deviceId: string
): Promise<{ status: string; message: string }> {
  try {
    const response = await post<{ status: string; message: string }>(
      `/whatsapp-multi-device/devices/${deviceId}/connect`,
      {}
    );

    if (!response.success) {
      throw {
        message: response.message || "Failed to connect device",
      } as ApiError;
    }

    return {
      status: response.data?.status || "connecting",
      message:
        response.message ||
        "Device connection initiated. Scan QR code to connect.",
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Disconnect device
 */
export async function disconnectDevice(deviceId: string): Promise<void> {
  try {
    const response = await del<{ message?: string }>(
      `/whatsapp-multi-device/devices/${deviceId}/disconnect`
    );

    if (!response.success) {
      throw {
        message: response.message || "Failed to disconnect device",
      } as ApiError;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Get QR code for device
 */
export interface QRCodeResponse {
  qrCode: string; // Base64 data URL
  status: string;
}

export async function getQRCode(deviceId: string): Promise<QRCodeResponse> {
  try {
    const response = await get<QRCodeResponse>(
      `/whatsapp-multi-device/devices/${deviceId}/qr`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch QR code",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Send message
 */
export async function sendMessage(
  deviceId: string,
  data: SendMessageRequest
): Promise<SendMessageResponse> {
  try {
    const response = await post<SendMessageResponse>(
      `/whatsapp-multi-device/devices/${deviceId}/send-message`,
      data
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to send message",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Send media
 */
export async function sendMedia(
  deviceId: string,
  data: FormData
): Promise<SendMessageResponse> {
  try {
    // For FormData, we need to use fetch directly
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const response = await fetch(
      `${API_BASE_URL}/whatsapp-multi-device/devices/${deviceId}/send-media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw {
        message: result.message || "Failed to send media",
        status: response.status,
      } as ApiError;
    }

    return result.data || result;
  } catch (error) {
    throw error;
  }
}

/**
 * Get chat history
 */
export async function getChatHistory(
  deviceId: string,
  jid: string,
  limit: number = 50,
  before?: string
): Promise<ChatHistoryResponse> {
  try {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (before) params.append("before", before);

    const queryString = params.toString();
    const endpoint = `/whatsapp-multi-device/devices/${deviceId}/chat-history/${jid}${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await get<ChatHistoryResponse>(endpoint);

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch chat history",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get group chat history
 */
export async function getGroupChatHistory(
  deviceId: string,
  groupId: string,
  limit: number = 50,
  before?: string
): Promise<ChatHistoryResponse> {
  try {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (before) params.append("before", before);

    const queryString = params.toString();
    const endpoint = `/whatsapp-multi-device/devices/${deviceId}/group-chat-history/${groupId}${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await get<ChatHistoryResponse>(endpoint);

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch group chat history",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get daily chat list
 */
export async function getDailyChatList(
  deviceId: string,
  date?: string
): Promise<DailyChatListResponse> {
  try {
    const params = new URLSearchParams();
    if (date) params.append("date", date);

    const queryString = params.toString();
    const endpoint = `/whatsapp-multi-device/devices/${deviceId}/daily-chat-list${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await get<DailyChatListResponse>(endpoint);

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch daily chat list",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  try {
    const response = await get<JobStatusResponse>(
      `/whatsapp-multi-device/jobs/${jobId}`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch job status",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Cancel job
 */
export async function cancelJob(jobId: string): Promise<void> {
  try {
    const response = await post<{ message?: string }>(
      `/whatsapp-multi-device/jobs/${jobId}/cancel`
    );

    if (!response.success) {
      throw {
        message: response.message || "Failed to cancel job",
      } as ApiError;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Get user profile
 */
export async function getProfile(): Promise<ProfileResponse> {
  try {
    const response = await get<ProfileResponse>("/auth/profile");

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch profile",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  data: UpdateProfileRequest
): Promise<ProfileResponse> {
  try {
    const response = await put<ProfileResponse>("/auth/profile", data);

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to update profile",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get contacts for a device
 */
export async function getContacts(
  deviceId: string,
  search?: string
): Promise<ContactsResponse> {
  try {
    const params = new URLSearchParams();
    if (search) params.append("search", search);

    const queryString = params.toString();
    const endpoint = `/whatsapp-multi-device/devices/${deviceId}/contacts${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await get<ContactsResponse>(endpoint);

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch contacts",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

// ============================================
// Scheduled Message Types & Functions
// ============================================

export interface ScheduleMessageRequest {
  to: string;
  message: string;
  scheduleTime: string; // ISO 8601 format
  timezone?: string;
}

export interface ScheduleMessageResponse {
  scheduledMessageId: string;
  scheduleTime: string;
  timezone: string;
  delaySeconds: number;
}

export interface MultiTargetScheduleResult {
  phone: string;
  success: boolean;
  scheduledMessageId?: string;
  error?: string;
}

/**
 * Schedule a message to a single phone number
 */
export async function scheduleMessage(
  deviceId: string,
  data: ScheduleMessageRequest
): Promise<ScheduleMessageResponse> {
  try {
    const response = await post<ScheduleMessageResponse>(
      `/whatsapp-multi-device/devices/${deviceId}/schedule-message`,
      data
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to schedule message",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

export interface ScheduledMessage {
  id: string;
  deviceId: string;
  phoneNumber: string;
  message: string;
  scheduleTime: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  timezone: string;
  createdAt: string;
  error?: string;
}

/**
 * Get scheduled message history
 */
export async function getScheduledMessages(
  deviceId: string
): Promise<ScheduledMessage[]> {
  try {
    const response = await get<{ messages: ScheduledMessage[]; count: number }>(
      `/whatsapp-multi-device/devices/${deviceId}/scheduled-messages`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch scheduled messages",
      } as ApiError;
    }

    return response.data.messages || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Cancel a scheduled message
 */
export async function cancelScheduledMessage(
  deviceId: string,
  messageId: string
): Promise<void> {
  try {
    const response = await post<{ message?: string; success: boolean }>(
      `/whatsapp-multi-device/devices/${deviceId}/scheduled-messages/${messageId}/cancel`,
      {}
    );

    if (!response.success) {
      throw {
        message: response.message || "Failed to cancel scheduled message",
      } as ApiError;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Normalize phone number to Indonesian format (62xxxxxxxxx)
 * Supports: +62, 62, 0 prefixes
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== "string") {
    return null;
  }

  let cleaned = phone.trim();

  // Handle +62 format
  if (cleaned.startsWith("+62")) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith("62")) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // Remove all non-digit characters
  cleaned = cleaned.replace(/\D/g, "");

  // Validate: should be 8-13 digits after normalization
  if (cleaned.length < 8 || cleaned.length > 13) {
    return null;
  }

  return "62" + cleaned;
}

/**
 * Parse multiple phone numbers from text input
 * Returns { valid: string[], invalid: string[], duplicates: string[] }
 */
export function parsePhoneNumbers(input: string): {
  valid: string[];
  invalid: string[];
  duplicates: string[];
  normalized: Map<string, string>;
} {
  const lines = input
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const valid: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  const normalized = new Map<string, string>();
  const seen = new Set<string>();

  for (const line of lines) {
    const norm = normalizePhoneNumber(line);
    if (!norm) {
      invalid.push(line);
    } else if (seen.has(norm)) {
      duplicates.push(line);
    } else {
      seen.add(norm);
      valid.push(line);
      normalized.set(line, norm);
    }
  }

  return { valid, invalid, duplicates, normalized };
}

