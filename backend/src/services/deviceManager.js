const { WhatsAppSession } = require("../models");
const logger = require("../utils/logger");

/**
 * Device Manager Service
 *
 * Manages device lifecycle for multi-device support:
 * - Create new devices
 * - Get device information
 * - List devices for a user
 * - Delete devices
 * - Get device status
 */
class DeviceManager {
  constructor() {
    // Cache for device info (optional, for performance)
    this.deviceCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Create a new device for a user
   * @param {number} userId - User ID
   * @param {string} deviceId - Device ID (required)
   * @param {string} deviceName - Device name (optional)
   * @returns {Promise<Object>} Device object
   */
  async createDevice(userId, deviceId, deviceName = null) {
    try {
      logger.info(`🔧 Creating new device ${deviceId} for user ${userId}...`);

      // Check if deviceId already exists
      const existingDevice = await WhatsAppSession.findOne({
        where: { deviceId: deviceId },
      });

      if (existingDevice) {
        throw new Error("Device ID sudah digunakan");
      }

      // Default device name if not provided
      if (!deviceName) {
        // Count existing devices for this user to suggest name
        const existingDevices = await this.listDevices(userId);
        deviceName = `Device ${existingDevices.length + 1}`;
      }

      // Create device record in database
      const device = await WhatsAppSession.create({
        userId: userId,
        deviceId: deviceId,
        deviceName: deviceName,
        sessionId: `session_${deviceId}_${Date.now()}`,
        status: "disconnected",
        isActive: true,
      });

      logger.info(
        `✅ Device created: ${deviceId} (${deviceName}) for user ${userId}`
      );

      // Clear cache for this user (cache key is "list_${userId}")
      const cacheKey = `list_${userId}`;
      this.deviceCache.delete(cacheKey);

      // Also clear any device-specific cache entries
      this.deviceCache.forEach((value, key) => {
        if (key.startsWith(`list_${userId}`)) {
          this.deviceCache.delete(key);
        }
      });

      return {
        id: device.id,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        userId: device.userId,
        status: device.status,
        isActive: device.isActive,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      };
    } catch (error) {
      logger.error(`❌ Error creating device for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Validate device ownership
   * @param {string} deviceId - Device ID
   * @param {number} userId - User ID to validate against
   * @param {string} userRole - User role (optional, for admin bypass)
   * @returns {Promise<Object>} { isValid: boolean, device: Object|null, error: string|null }
   */
  async validateDeviceOwnership(deviceId, userId, userRole = null) {
    try {
      const device = await this.getDevice(deviceId);

      if (!device) {
        return {
          isValid: false,
          device: null,
          error: "Device not found",
        };
      }

      // Admin can access any device
      if (userRole === "admin") {
        return {
          isValid: true,
          device: device,
          error: null,
        };
      }

      // Regular user can only access their own devices
      if (device.userId !== userId) {
        return {
          isValid: false,
          device: device,
          error: "Access denied: Device does not belong to user",
        };
      }

      return {
        isValid: true,
        device: device,
        error: null,
      };
    } catch (error) {
      logger.error(
        `❌ Error validating device ownership for ${deviceId}:`,
        error
      );
      return {
        isValid: false,
        device: null,
        error: error.message,
      };
    }
  }

  /**
   * Get device by deviceId
   * @param {string} deviceId - Device ID
   * @returns {Promise<Object|null>} Device object or null
   */
  async getDevice(deviceId) {
    try {
      const device = await WhatsAppSession.findOne({
        where: { deviceId: deviceId },
        attributes: [
          "id",
          "userId",
          "deviceId",
          "deviceName",
          "phoneNumber",
          "status",
          "isActive",
          "lastSeen",
          "deviceInfo",
          "createdAt",
          "updatedAt",
        ],
      });

      if (!device) {
        return null;
      }

      return {
        id: device.id,
        userId: device.userId,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        phoneNumber: device.phoneNumber,
        status: device.status,
        isActive: device.isActive,
        lastSeen: device.lastSeen,
        deviceInfo: device.deviceInfo,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      };
    } catch (error) {
      logger.error(`❌ Error getting device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * List all devices for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of device objects
   */
  async listDevices(userId) {
    try {
      // Check cache first
      const cacheKey = `list_${userId}`;
      const cached = this.deviceCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const devices = await WhatsAppSession.findAll({
        where: { userId: userId },
        attributes: [
          "id",
          "userId",
          "deviceId",
          "deviceName",
          "phoneNumber",
          "status",
          "isActive",
          "lastSeen",
          "deviceInfo",
          "createdAt",
          "updatedAt",
        ],
        order: [["createdAt", "ASC"]],
      });

      const deviceList = devices.map((device) => ({
        id: device.id,
        userId: device.userId,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        phoneNumber: device.phoneNumber,
        status: device.status,
        isActive: device.isActive,
        lastSeen: device.lastSeen,
        deviceInfo: device.deviceInfo,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      }));

      // Cache the result
      this.deviceCache.set(cacheKey, {
        data: deviceList,
        timestamp: Date.now(),
      });

      return deviceList;
    } catch (error) {
      logger.error(`❌ Error listing devices for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * List all connected devices for a user
   * @param {number} userId - User ID (optional, if null returns all connected)
   * @returns {Promise<Array>} Array of connected device objects
   */
  async listConnectedDevices(userId = null) {
    try {
      const whereClause = {
        status: "connected",
        isActive: true,
      };

      if (userId) {
        whereClause.userId = userId;
      }

      const devices = await WhatsAppSession.findAll({
        where: whereClause,
        attributes: [
          "id",
          "userId",
          "deviceId",
          "deviceName",
          "phoneNumber",
          "status",
          "isActive",
          "lastSeen",
          "deviceInfo",
        ],
        order: [["lastSeen", "DESC"]],
      });

      return devices.map((device) => ({
        id: device.id,
        userId: device.userId,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        status: "connected", // Force status to connected since we filtered for it
        isActive: device.isActive,
        isConnected: true,
        phoneNumber: device.phoneNumber,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
        lastActivity: device.lastSeen || device.updatedAt,
        deviceInfo: device.deviceInfo,
        connectionAttempts: 1, 
      }));
    } catch (error) {
      logger.error(`❌ Error listing connected devices:`, error);
      throw error;
    }
  }

  /**
   * Get device statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Statistics object
   */
  async getDeviceStats(userId) {
    try {
      const devices = await WhatsAppSession.findAll({
        where: { userId: userId },
        attributes: [
          "deviceId",
          "deviceName",
          "status",
          "phoneNumber",
          "createdAt",
          "lastSeen",
        ],
      });

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const stats = {
        total: devices.length,
        connected: 0,
        disconnected: 0,
        withPhoneNumber: 0,
        createdToday: 0,
      };

      devices.forEach((device) => {
        if (device.status === "connected") {
          stats.connected++;
        } else {
          stats.disconnected++;
        }

        if (device.phoneNumber) {
          stats.withPhoneNumber++;
        }

        const deviceCreatedAt = new Date(device.createdAt);
        if (deviceCreatedAt >= today) {
          stats.createdToday++;
        }
      });

      return stats;
    } catch (error) {
      logger.error(`❌ Error getting device stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Format device for response (sesuai dokumentasi)
   * @param {Object} device - Device object from database
   * @returns {Object} Formatted device object
   */
  formatDeviceForResponse(device) {
    return {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      status: device.status || "disconnected",
      isConnected: device.status === "connected",
      phoneNumber: device.phoneNumber || null,
      createdAt: device.createdAt
        ? new Date(device.createdAt)
            .toISOString()
            .replace("T", " ")
            .substring(0, 19)
        : null,
      lastActivity:
        device.lastSeen || device.updatedAt
          ? new Date(device.lastSeen || device.updatedAt)
              .toISOString()
              .replace("T", " ")
              .substring(0, 19)
          : null,
      connectionAttempts: 1, // TODO: Track connection attempts
    };
  }

  /**
   * List all devices for a user (formatted for response)
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of formatted device objects
   */
  async listDevicesFormatted(userId) {
    try {
      const devices = await this.listDevices(userId);
      return devices.map((device) => this.formatDeviceForResponse(device));
    } catch (error) {
      logger.error(
        `❌ Error listing formatted devices for user ${userId}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Delete a device
   * @param {string} deviceId - Device ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteDevice(deviceId) {
    try {
      logger.info(`🗑️  Deleting device ${deviceId}...`);

      const device = await WhatsAppSession.findOne({
        where: { deviceId: deviceId },
      });

      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Clear cache
      this.deviceCache.delete(`list_${device.userId}`);
      this.deviceCache.delete(deviceId);

      // Delete device (soft delete by setting isActive to false, or hard delete)
      // Using hard delete for now, but can be changed to soft delete if needed
      await WhatsAppSession.destroy({
        where: { deviceId: deviceId },
      });

      logger.info(`✅ Device ${deviceId} deleted successfully`);
      return true;
    } catch (error) {
      logger.error(`❌ Error deleting device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get device status
   * @param {string} deviceId - Device ID
   * @returns {Promise<Object>} Device status object
   */
  async getDeviceStatus(deviceId) {
    try {
      const device = await this.getDevice(deviceId);

      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      return {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        status: device.status,
        isActive: device.isActive,
        phoneNumber: device.phoneNumber,
        lastSeen: device.lastSeen,
        isConnected: device.status === "connected",
      };
    } catch (error) {
      logger.error(`❌ Error getting device status for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Update device status
   * @param {string} deviceId - Device ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated device
   */
  async updateDeviceStatus(deviceId, updates) {
    try {
      const device = await WhatsAppSession.findOne({
        where: { deviceId: deviceId },
      });

      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      await device.update(updates);
      await device.reload();

      // Clear cache
      this.deviceCache.delete(`list_${device.userId}`);
      this.deviceCache.delete(deviceId);

      return {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        status: device.status,
        isActive: device.isActive,
        phoneNumber: device.phoneNumber,
        lastSeen: device.lastSeen,
      };
    } catch (error) {
      logger.error(`❌ Error updating device status for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Generate a unique device ID
   * @param {number} userId - User ID
   * @returns {string} Device ID
   */
  generateDeviceId(userId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    return `device-${userId}-${timestamp}-${random}`;
  }

  /**
   * Clear cache for a user
   * @param {number} userId - User ID
   */
  clearCache(userId) {
    const keysToDelete = [];
    for (const key of this.deviceCache.keys()) {
      if (key.includes(`_${userId}`) || key.includes(`list_${userId}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.deviceCache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.deviceCache.clear();
  }
}

module.exports = new DeviceManager();
