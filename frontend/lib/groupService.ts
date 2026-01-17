import { get, ApiResponse, ApiError } from "./api";

// Helper prefix for relative paths
const API_PREFIX = "/whatsapp-multi-device";

export interface Group {
  id: string; // Group JID
  subject: string;
  creation: number | null;
  owner: string | null;
  participants: any[]; // We can refine this type if needed
  description?: string;
  size?: number;
}

export interface ListGroupsResponse {
  deviceId: string;
  groups: Group[];
  total: number;
}

/**
 * Group Service
 * Handles API calls for user group operations
 */
export const groupService = {
  /**
   * Get groups for a specific device
   */
  getGroups: async (deviceId: string): Promise<ListGroupsResponse> => {
    try {
      const response = await get<ListGroupsResponse>(
        `${API_PREFIX}/devices/${deviceId}/groups`
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
  },
};
