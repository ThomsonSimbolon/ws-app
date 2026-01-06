/**
 * Admin Service
 *
 * Service layer for admin-related API calls.
 */

import { get, post, put, del, ApiError } from "./api";

export interface GlobalStats {
  users: {
    total: number;
    active: number;
    admins: number;
    regular: number;
  };
  devices: {
    total: number;
    active: number;
    connected: number;
    statusDistribution: Array<{ status: string; count: number }>;
  };
  messages: {
    total: number;
    incoming: number;
    outgoing: number;
    statusDistribution: Array<{ status: string; count: number }>;
  };
  groups: {
    total: number;
    active: number;
  };
  contacts: {
    total: number;
  };
  activity: {
    last24Hours: {
      messages: number;
      newUsers: number;
      newDevices: number;
    };
  };
  timestamp: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: "admin" | "user";
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  stats?: {
    totalDevices: number;
    connectedDevices: number;
    totalMessages: number;
  };
  whatsappSessions?: Array<{
    id: number;
    deviceId: string;
    deviceName: string;
    phoneNumber?: string;
    status: string;
    isActive: boolean;
    lastSeen?: string;
    createdAt: string;
  }>;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: "admin" | "user";
  isActive?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  fullName?: string;
  role?: "admin" | "user";
  isActive?: boolean;
}

export interface UserDetailsResponse {
  user: User;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: "admin" | "user" | "";
  isActive?: boolean | "";
}

export interface GetDevicesParams {
  page?: number;
  limit?: number;
  userId?: number | "";
  status?: "connected" | "disconnected" | "connecting" | "qr_required" | "";
  isActive?: boolean | "";
  search?: string;
}

export interface GetMessagesParams {
  page?: number;
  limit?: number;
  userId?: number | "";
  deviceId?: string | "";
  fromNumber?: string;
  toNumber?: string;
  direction?: "incoming" | "outgoing" | "";
  status?: "pending" | "sent" | "delivered" | "read" | "failed" | "";
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

export interface Device {
  id: number;
  userId: number;
  deviceId: string;
  deviceName: string;
  phoneNumber?: string;
  status: "disconnected" | "connecting" | "connected" | "qr_required";
  isActive: boolean;
  lastSeen?: string;
  deviceInfo?: any;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    username: string;
    email: string;
    fullName?: string;
    role: "admin" | "user";
  };
}

export interface Message {
  id: number;
  userId: number;
  sessionId: number;
  messageId: string;
  fromNumber: string;
  toNumber: string;
  messageType: "text" | "image" | "video" | "audio" | "document";
  content: string;
  direction: "incoming" | "outgoing";
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  metadata?: any;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    email: string;
    fullName?: string;
  };
  session?: {
    id: number;
    deviceId: string;
    deviceName: string;
    phoneNumber?: string;
  };
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers?: number;
  totalDevices?: number;
  totalMessages?: number;
  totalLogs?: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UsersResponse {
  users: User[];
  pagination: PaginationInfo;
}

export interface DevicesResponse {
  devices: Device[];
  pagination: PaginationInfo;
}

export interface CreateDeviceRequest {
  userId: number;
  deviceName?: string;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: PaginationInfo;
}

export interface Group {
  id: number;
  groupId: string;
  deviceId: string;
  subject: string;
  description?: string;
  participants: string[];
  admins: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  device?: {
    id: number;
    deviceId: string;
    deviceName: string;
    phoneNumber?: string;
    userId: number;
    user?: {
      id: number;
      username: string;
      email: string;
      fullName?: string;
      role: "admin" | "user";
    };
  };
}

export interface Contact {
  id: number;
  userId: number;
  phoneNumber: string;
  name: string;
  email?: string;
  groups?: string[];
  tags?: string[];
  notes?: string;
  isBlocked: boolean;
  lastMessageAt?: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    username: string;
    email: string;
    fullName?: string;
    role: "admin" | "user";
  };
}

export interface Job {
  id: string;
  type: "send-text" | "send-media";
  status: "queued" | "processing" | "completed" | "failed" | "cancelled" | "paused";
  data: {
    deviceId?: string;
    messages?: Array<{ to: string; message: string }>;
    [key: string]: any;
  };
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  result?: any;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  device?: {
    id: number;
    deviceId: string;
    deviceName: string;
    phoneNumber?: string;
    userId: number;
    user?: {
      id: number;
      username: string;
      email: string;
      fullName?: string;
    };
  };
}

export interface GetGroupsParams {
  page?: number;
  limit?: number;
  deviceId?: string | "";
  userId?: number | "";
  search?: string;
  isActive?: boolean | "";
}

export interface GetContactsParams {
  page?: number;
  limit?: number;
  userId?: number | "";
  search?: string;
  isBlocked?: boolean | "";
}

export interface GetJobsParams {
  status?: "queued" | "processing" | "completed" | "failed" | "cancelled" | "paused" | "";
  type?: "send-text" | "send-media" | "";
  limit?: number;
}

export interface GroupsResponse {
  groups: Group[];
  pagination: PaginationInfo;
}

export interface ContactsResponse {
  contacts: Contact[];
  pagination: PaginationInfo;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
}

export interface JobDetailsResponse {
  job: Job;
}

/**
 * Get global statistics
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  try {
    const response = await get<GlobalStats>("/admin/stats");

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch statistics",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get users with pagination and filters
 */
export async function getUsers(
  params: GetUsersParams = {}
): Promise<UsersResponse> {
  try {
    const { page = 1, limit = 20, search, role, isActive } = params;
    
    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (search) queryParams.append("search", search);
    if (role) queryParams.append("role", role);
    if (isActive !== undefined && String(isActive) !== "") {
      queryParams.append("isActive", isActive.toString());
    }

    const response = await get<UsersResponse>(
      `/admin/users?${queryParams.toString()}`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch users",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get recent users (for backward compatibility)
 */
export async function getRecentUsers(
  limit: number = 10
): Promise<UsersResponse> {
  return getUsers({ page: 1, limit });
}

/**
 * Get devices with pagination and filters
 */
export async function getDevices(
  params: GetDevicesParams = {}
): Promise<DevicesResponse> {
  try {
    const { page = 1, limit = 20, userId, status, isActive, search } = params;
    
    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (userId) queryParams.append("userId", userId.toString());
    if (status) queryParams.append("status", status);
    if (isActive !== undefined && String(isActive) !== "") {
      queryParams.append("isActive", isActive.toString());
    }
    if (search) queryParams.append("search", search);

    const response = await get<DevicesResponse>(
      `/admin/devices?${queryParams.toString()}`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch devices",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get recent devices (for backward compatibility)
 */
export async function getRecentDevices(
  limit: number = 10
): Promise<DevicesResponse> {
  return getDevices({ page: 1, limit });
}

/**
 * Create a new device for a user (Admin only)
 */
export async function createDevice(
  data: CreateDeviceRequest
): Promise<Device> {
  try {
    const response = await post<Device>(
      '/whatsapp-multi-device/devices',
      data
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || 'Failed to create device',
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Disconnect device (Admin)
 */
export async function disconnectDevice(deviceId: string): Promise<void> {
  try {
    const response = await del<{ message?: string }>(
      `/admin/devices/${deviceId}/disconnect`
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
 * Delete device (Admin only)
 */
export async function deleteDevice(deviceId: string): Promise<void> {
  try {
    const response = await del<{ message?: string }>(
      `/admin/devices/${deviceId}`
    );

    if (!response.success) {
      throw {
        message: response.message || "Failed to delete device",
      } as ApiError;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Device health metrics interface
 */
export interface DeviceHealth {
  deviceId: string;
  deviceName: string;
  phoneNumber?: string | null;
  owner?: {
    id: number;
    username: string;
    fullName: string;
  } | null;
  health: {
    overallScore: number;
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      uptime7d: number;
      messageSuccessRate: number;
      sessionRestarts24h: number;
      stuckDuration: number | null;
      lastSeenMinutes: number | null;
    };
    current: {
      status: string;
      isActive: boolean;
      lastSeen?: string;
    };
    alerts: Array<{
      type: 'info' | 'warning' | 'danger';
      message: string;
    }>;
  };
  timestamp: string;
}

export interface DeviceHealthResponse {
  data: DeviceHealth;
}

/**
 * Get device health metrics (Admin only)
 */
export async function getDeviceHealth(deviceId: string): Promise<DeviceHealth> {
  try {
    const response = await get<DeviceHealth>(
      `/admin/devices/${deviceId}/health`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch device health",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get messages with pagination and filters
 */
export async function getMessages(
  params: GetMessagesParams = {}
): Promise<MessagesResponse> {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      deviceId,
      fromNumber,
      toNumber,
      direction,
      status,
      startDate,
      endDate,
    } = params;
    
    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (userId) queryParams.append("userId", userId.toString());
    if (deviceId) queryParams.append("deviceId", deviceId);
    if (fromNumber) queryParams.append("fromNumber", fromNumber);
    if (toNumber) queryParams.append("toNumber", toNumber);
    if (direction) queryParams.append("direction", direction);
    if (status) queryParams.append("status", status);
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);

    const response = await get<MessagesResponse>(
      `/admin/messages?${queryParams.toString()}`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch messages",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get recent messages (for backward compatibility)
 */
export async function getRecentMessages(
  limit: number = 20
): Promise<MessagesResponse> {
  return getMessages({ page: 1, limit });
}

/**
 * Get user details by ID
 */
export async function getUserDetails(userId: number): Promise<UserDetailsResponse> {
  try {
    const response = await get<UserDetailsResponse>(`/admin/users/${userId}`);

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch user details",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Create new user
 */
export async function createUser(data: CreateUserRequest): Promise<UserDetailsResponse> {
  try {
    const response = await post<UserDetailsResponse>("/admin/users", data);

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to create user",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Update user
 */
export async function updateUser(
  userId: number,
  data: UpdateUserRequest
): Promise<UserDetailsResponse> {
  try {
    const response = await put<UserDetailsResponse>(`/admin/users/${userId}`, data);

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to update user",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: number): Promise<void> {
  try {
    const response = await del<{ message?: string }>(`/admin/users/${userId}`);

    if (!response.success) {
      throw {
        message: response.message || "Failed to delete user",
      } as ApiError;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Get groups with pagination and filters
 */
export async function getGroups(
  params: GetGroupsParams = {}
): Promise<GroupsResponse> {
  try {
    const { page = 1, limit = 20, deviceId, userId, search, isActive } = params;
    
    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (deviceId) queryParams.append("deviceId", deviceId);
    if (userId) queryParams.append("userId", userId.toString());
    if (search) queryParams.append("search", search);
    if (isActive !== undefined && String(isActive) !== "") {
      queryParams.append("isActive", isActive.toString());
    }

    const response = await get<GroupsResponse>(
      `/admin/groups?${queryParams.toString()}`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch groups",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get contacts with pagination and filters
 */
export async function getContacts(
  params: GetContactsParams = {}
): Promise<ContactsResponse> {
  try {
    const { page = 1, limit = 20, userId, search, isBlocked } = params;
    
    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (userId) queryParams.append("userId", userId.toString());
    if (search) queryParams.append("search", search);
    if (isBlocked !== undefined && isBlocked !== "") {
      queryParams.append("isBlocked", isBlocked.toString());
    }

    const response = await get<ContactsResponse>(
      `/admin/contacts?${queryParams.toString()}`
    );

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

/**
 * Get jobs with filters
 */
export async function getJobs(
  params: GetJobsParams = {}
): Promise<JobsResponse> {
  try {
    const { status, type, limit = 50 } = params;
    
    // Build query string
    const queryParams = new URLSearchParams();
    if (status) queryParams.append("status", status);
    if (type) queryParams.append("type", type);
    queryParams.append("limit", limit.toString());

    const response = await get<JobsResponse>(
      `/admin/jobs?${queryParams.toString()}`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch jobs",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get job details by ID
 */
export async function getJobDetails(jobId: string): Promise<JobDetailsResponse> {
  try {
    const response = await get<JobDetailsResponse>(`/admin/jobs/${jobId}`);

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch job details",
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
    const response = await post<{ message?: string }>(`/admin/jobs/${jobId}/cancel`);

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
 * Pause job
 */
export async function pauseJob(jobId: string): Promise<void> {
  try {
    const response = await post<{ message?: string }>(`/admin/jobs/${jobId}/pause`);

    if (!response.success) {
      throw {
        message: response.message || "Failed to pause job",
      } as ApiError;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Resume job
 */
export async function resumeJob(jobId: string): Promise<void> {
  try {
    const response = await post<{ message?: string }>(`/admin/jobs/${jobId}/resume`);

    if (!response.success) {
      throw {
        message: response.message || "Failed to resume job",
      } as ApiError;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Retry job
 */
export async function retryJob(jobId: string): Promise<{ jobId: string }> {
  try {
    const response = await post<{ message?: string; data?: { jobId: string } }>(
      `/admin/jobs/${jobId}/retry`
    );

    if (!response.success) {
      throw {
        message: response.message || "Failed to retry job",
      } as ApiError;
    }

    return response.data?.data || { jobId: "" };
  } catch (error) {
    throw error;
  }
}

// --- Audit Logs ---

export interface AdminActionLog {
  id: number;
  adminId: number;
  action: string;
  targetType: string;
  targetId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  admin?: {
    id: number;
    username: string;
    email: string;
    fullName?: string;
  };
}

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  adminId?: number | "";
  action?: string;
  targetType?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AuditLogsResponse {
  logs: AdminActionLog[];
  pagination: PaginationInfo;
}

export interface LogFilters {
  actions: string[];
  targetTypes: string[];
  admins: Array<{
    id: number;
    username: string;
    fullName?: string;
  }>;
}

/**
 * Get available filter options for audit logs
 */
export async function getLogFilters(): Promise<LogFilters> {
  try {
    const response = await get<LogFilters>("/admin/logs/filters");

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch log filters",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get audit logs with pagination and filters
 */
export async function getAuditLogs(
  params: GetAuditLogsParams = {}
): Promise<AuditLogsResponse> {
  try {
    const {
      page = 1,
      limit = 20,
      adminId,
      action,
      targetType,
      targetId,
      startDate,
      endDate,
      search,
    } = params;

    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (adminId) queryParams.append("adminId", adminId.toString());
    if (action) queryParams.append("action", action);
    if (targetType) queryParams.append("targetType", targetType);
    if (targetId) queryParams.append("targetId", targetId);
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);
    if (search) queryParams.append("search", search);

    const response = await get<AuditLogsResponse>(
      `/admin/logs?${queryParams.toString()}`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch audit logs",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * User Insights interface
 */
export interface UserInsights {
  user: {
    id: number;
    username: string;
    email: string;
    fullName?: string;
    role: string;
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
  };
  insights: {
    engagementScore: number;
    devices: {
      total: number;
      connected: number;
      recent: Array<{
        id: number;
        deviceId: string;
        deviceName?: string;
        status: string;
        lastSeen?: string;
      }>;
    };
    messages: {
      total: number;
      last7Days: number;
      last30Days: number;
      outgoing: number;
      incoming: number;
      failed: number;
      successRate: number;
      recent: Array<{
        id: number;
        toNumber?: string;
        messageType: string;
        status: string;
        direction: string;
        timestamp: string;
      }>;
    };
    contacts: {
      total: number;
    };
    groups: {
      total: number;
    };
  };
  timestamp: string;
}

/**
 * Get user insights and analytics (Admin only)
 */
export async function getUserInsights(userId: number): Promise<UserInsights> {
  try {
    const response = await get<UserInsights>(
      `/admin/users/${userId}/insights`
    );

    if (!response.success || !response.data) {
      throw {
        message: response.message || "Failed to fetch user insights",
      } as ApiError;
    }

    return response.data;
  } catch (error) {
    throw error;
  }
}
