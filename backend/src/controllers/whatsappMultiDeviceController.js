const deviceManager = require("../services/deviceManager");
const whatsappService = require("../services/whatsappService");
const jobQueueService = require("../services/jobQueueService");
const statisticsService = require("../services/statisticsService");
const scheduledMessageService = require("../services/scheduledMessageService");
const { Group, Message, WhatsAppSession, Contact, MessageTemplate } = require("../models");
const { Op } = require("sequelize");
const fs = require("fs");
const logger = require("../utils/logger");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const { normalizePhoneNumber, validatePhoneNumber } = require("../utils/validation");

/**
 * Create a new device
 * Admin can create device for any user by providing userId in body
 * If userId not provided, device is created for the authenticated user
 */
const createDevice = async (req, res) => {
  try {
    let { deviceId, deviceName, userId: targetUserId } = req.body;
    const authenticatedUserId = req.user.id;
    const userRole = req.user.role;

    // Determine which userId to use
    // Admin can create device for any user, regular users can only create for themselves
    let userId;
    if (targetUserId && userRole === 'admin') {
      // Admin creating device for another user
      userId = targetUserId;
    } else if (targetUserId && userRole !== 'admin') {
      // Regular user trying to create device for another user - not allowed
      const { response, statusCode } = errorResponse(
        "Anda hanya dapat membuat device untuk diri sendiri",
        null,
        403
      );
      return res.status(statusCode).json(response);
    } else {
      // No userId provided, use authenticated user's ID
      userId = authenticatedUserId;
    }

    // Generate deviceId automatically if not provided
    if (!deviceId) {
      // Generate unique deviceId: device_userId_timestamp_random
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      deviceId = `device_${userId}_${timestamp}_${random}`;
      
      // Ensure it's unique by checking database
      let attempts = 0;
      const maxAttempts = 5;
      while (attempts < maxAttempts) {
        const existingDevice = await deviceManager.getDevice(deviceId);
        if (!existingDevice) {
          break; // deviceId is unique
        }
        // Regenerate if exists
        const newRandom = Math.random().toString(36).substring(2, 8);
        deviceId = `device_${userId}_${Date.now()}_${newRandom}`;
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        const { response, statusCode } = errorResponse(
          "Gagal membuat device ID unik. Silakan coba lagi.",
          null,
          500
        );
        return res.status(statusCode).json(response);
      }
    }

    const device = await deviceManager.createDevice(userId, deviceId, deviceName);

    logger.info(`Device created: ${device.deviceId} for user ${userId} by ${userRole} ${authenticatedUserId}`);

    // Format response sesuai Device interface di frontend
    const { response, statusCode } = successResponse(
      {
        id: device.id,
        userId: device.userId,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        status: device.status,
        isActive: device.isActive,
        createdAt: device.createdAt ? new Date(device.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: device.updatedAt ? new Date(device.updatedAt).toISOString() : new Date().toISOString(),
      },
      "Device berhasil dibuat",
      201
    );

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Create device error:", error);
    
    let statusCode = 500;
    let message = "Gagal membuat device";
    
    if (error.message === "Device ID sudah digunakan") {
      statusCode = 400;
      message = error.message;
    }

    const { response, statusCode: errorStatusCode } = errorResponse(
      message,
      error.message,
      statusCode
    );
    res.status(errorStatusCode).json(response);
  }
};

/**
 * List all devices for the authenticated user
 */
const listDevices = async (req, res) => {
  try {
    const userId = req.user.id;
    const devices = await deviceManager.listDevicesFormatted(userId);
    const stats = await deviceManager.getDeviceStats(userId);

    const { response, statusCode } = successResponse({
      devices: devices,
      stats: stats,
      count: devices.length,
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("List devices error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan daftar device",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * List all connected devices
 */
const listConnectedDevices = async (req, res) => {
  try {
    const userId = req.user.id;
    const devices = await deviceManager.listConnectedDevices(userId);

    const { response, statusCode } = successResponse({
      devices: devices,
      count: devices.length,
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("List connected devices error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan daftar device yang terkoneksi",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Get device information
 */
const getDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    const device = await deviceManager.getDevice(deviceId);

    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    // Verify device belongs to user
    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    const formattedDevice = deviceManager.formatDeviceForResponse(device);

    const { response, statusCode } = successResponse(formattedDevice);
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get device error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan informasi device",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Get device status
 */
const getDeviceStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    const status = await deviceManager.getDeviceStatus(deviceId);
    const sessionStatus = await whatsappService.getSessionStatusForDevice(deviceId);

    // Format response sesuai DeviceStatus interface di frontend
    // Prioritize session state (real-time) over database status
    const responseData = {
      deviceId: status.deviceId,
      status: sessionStatus.status || status.status || "disconnected",
      isActive: device.isActive !== false && sessionStatus.isActive !== false,
      phoneNumber: sessionStatus.phoneNumber || status.phoneNumber || null,
      lastSeen: sessionStatus.lastSeen || status.lastSeen || device.lastSeen ? new Date(sessionStatus.lastSeen || status.lastSeen || device.lastSeen).toISOString() : null,
      deviceInfo: device.deviceInfo || null,
    };

    const { response, statusCode } = successResponse(responseData);
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get device status error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan status device",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Connect device
 */
const connectDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    logger.info(`🔗 WhatsApp connect request for device ${deviceId} by user ${userId}`);

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      logger.warn(`❌ Device ${deviceId} not found in database`);
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        `Device dengan ID ${deviceId} tidak ada di database`,
        404
      );
      return res.status(statusCode).json(response);
    }

    logger.info(`✅ Device found: ${device.deviceId}, userId: ${device.userId}, status: ${device.status}`);

    if (device.userId !== userId && req.user.role !== "admin") {
      logger.warn(`❌ Access denied for user ${userId} to device ${deviceId} (owner: ${device.userId})`);
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Check current status
    const currentStatus = await whatsappService.getSessionStatusForDevice(deviceId);
    logger.info(`📊 Current session status for device ${deviceId}:`, {
      status: currentStatus.status,
      hasQR: !!currentStatus.qrCode,
      phoneNumber: currentStatus.phoneNumber || 'N/A'
    });

    if (currentStatus.status === "connected") {
      logger.info(`✅ Device ${deviceId} already connected`);
      const { response, statusCode } = successResponse({
        status: "connected",
        message: "Device sudah terkoneksi",
        phoneNumber: currentStatus.phoneNumber || null,
      }, "Device sudah terkoneksi");
      return res.status(statusCode).json(response);
    }

    // Create session for device
    logger.info(`🚀 Creating session for device ${deviceId}...`);
    await whatsappService.createSessionForDevice(deviceId);

    // Wait longer for QR code to be generated (2-3 seconds typically needed)
    logger.info(`⏳ Waiting for QR code generation for device ${deviceId}...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get QR code if available
    const sessionStatus = await whatsappService.getSessionStatusForDevice(deviceId);
    logger.info(`📊 Post-connection session status for device ${deviceId}:`, {
      status: sessionStatus.status,
      hasQR: !!sessionStatus.qrCode,
      qrLength: sessionStatus.qrCode ? sessionStatus.qrCode.length : 0
    });

    const responseData = {
      status: sessionStatus.status || "connecting",
      message: "Device connection initiated. Scan QR code to connect.",
    };

    if (sessionStatus.qrCode) {
      responseData.qrCode = sessionStatus.qrCode;
      responseData.message = "QR Code berhasil dibuat. Scan dengan WhatsApp untuk terhubung.";
    }

    const { response, statusCode } = successResponse(
      responseData,
      `Device ${deviceId} berhasil dikoneksikan`
    );

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error(`❌ Connect device error for ${req.params.deviceId}:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    const { response, statusCode } = errorResponse(
      "Gagal mengoneksikan device",
      error.message || "Terjadi kesalahan internal",
      500
    );
    res.status(statusCode).json(response);
  }
};


/**
 * Disconnect device
 */
const disconnectDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    await whatsappService.disconnectSessionForDevice(deviceId);

    // Update device status in database
    await deviceManager.updateDeviceStatus(deviceId, {
      status: "disconnected",
      isActive: false,
    });

    const { response, statusCode } = successResponse({
      success: true,
      message: "Device disconnected",
    }, `Device ${deviceId} berhasil diputuskan`);

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Disconnect device error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal memutuskan koneksi device",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Delete device
 */
const deleteDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Disconnect first if connected
    try {
      await whatsappService.disconnectSessionForDevice(deviceId);
    } catch (error) {
      logger.warn(`Failed to disconnect device before delete: ${error.message}`);
    }

    // Delete device
    await deviceManager.deleteDevice(deviceId);

    const { response, statusCode } = successResponse({
      success: true,
      message: `Device ${deviceId} berhasil dihapus`,
    }, `Device ${deviceId} berhasil dihapus`);
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Delete device error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal menghapus device",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Cancel and wipe device (delete session files)
 */
const cancelAndWipeDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Disconnect and remove session files
    await whatsappService.disconnectSessionForDevice(deviceId);
    whatsappService.removeSessionFilesForDevice(deviceId);

    // Update device status
    await deviceManager.updateDeviceStatus(deviceId, {
      status: "disconnected",
      isActive: false,
    });

    const { response, statusCode } = successResponse({
      success: true,
      message: "Session wiped",
    }, "Koneksi dibatalkan dan data session dihapus");

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Cancel and wipe device error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal membatalkan dan menghapus session device",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Get QR code (string)
 */
const getQRCode = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    const sessionStatus = await whatsappService.getSessionStatusForDevice(deviceId);

    if (!sessionStatus.qrCode) {
      const { response, statusCode } = errorResponse(
        "QR code tidak tersedia",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse({
      qrCode: sessionStatus.qrCode,
      status: sessionStatus.status || "qr_required",
      deviceId: deviceId,
      message: "Scan QR Code ini dengan WhatsApp untuk terhubung",
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get QR code error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan QR code",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Get QR code as image
 * Returns JSON response with base64 data URL as per API documentation
 */
const getQRCodeImage = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { format = "png" } = req.query;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    const sessionStatus = await whatsappService.getSessionStatusForDevice(deviceId);

    if (!sessionStatus.qrCode) {
      const { response, statusCode } = errorResponse(
        "QR code tidak tersedia",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    // QR code is already a data URL (base64 image)
    // Return JSON response as per API documentation
    let qrImage = sessionStatus.qrCode;
    
    // Ensure format matches requested format (png or svg)
    // If format is svg but qrCode is png, we can't convert, so return as-is
    // If format is png but qrCode is svg, return as-is (client can handle)
    // The qrCode from sessionStatus is already in correct format from Baileys
    
    const { response, statusCode } = successResponse(
      {
        deviceId: deviceId,
        qrImage: qrImage,
        format: format,
        message: "QR Code sebagai image",
      },
      "QR Code sebagai image"
    );

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get QR code image error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan QR code image",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Generate pairing code
 */
const generatePairingCode = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { phoneNumber } = req.body;
    const userId = req.user.id;

    // Validate phone number is provided
    if (!phoneNumber) {
      const { response, statusCode } = errorResponse(
        "Field 'phoneNumber' wajib diisi",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Validate and normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      const { response, statusCode } = errorResponse(
        "Format nomor telepon tidak valid. Format: +62, 62, atau 0 diikuti 8-13 digit",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Generate pairing code using WhatsAppService
    const pairingCode = await whatsappService.generatePairingCodeForDevice(deviceId, normalizedPhone);

    if (!pairingCode) {
      const { response, statusCode } = errorResponse(
        "Gagal menghasilkan pairing code. Pastikan device belum terkoneksi.",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse({
      deviceId: deviceId,
      phoneNumber: normalizedPhone,
      pairingCode: pairingCode,
      message: "Pairing code berhasil dibuat. Masukkan kode ini di WhatsApp untuk terhubung.",
    }, "Pairing code berhasil dibuat");

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Generate pairing code error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal menghasilkan pairing code",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Send message (single & bulk)
 */
const sendMessage = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { to, phone, message, messages, delay = 3, type = "text" } = req.body;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Detect bulk mode (if messages array exists)
    if (messages && Array.isArray(messages)) {
      // Bulk mode
      if (messages.length === 0) {
        const { response, statusCode } = errorResponse(
          "Array messages tidak boleh kosong",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      // Validate each message
      for (const msg of messages) {
        if (!msg.to && !msg.phone) {
          const { response, statusCode } = errorResponse(
            "Setiap pesan harus memiliki field 'to'",
            null,
            400
          );
          return res.status(statusCode).json(response);
        }
        if (!msg.message) {
          const { response, statusCode } = errorResponse(
            "Setiap pesan harus memiliki field 'message'",
            null,
            400
          );
          return res.status(statusCode).json(response);
        }
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const phoneNumber = msg.to || msg.phone;
        const cleanPhone = normalizePhoneNumber(phoneNumber);

        // Validate phone number format
        if (!cleanPhone) {
          errorCount++;
          results.push({
            to: phoneNumber,
            status: "error",
            error: "Format nomor telepon tidak valid. Format: +62, 62, atau 0 diikuti 8-13 digit",
          });
          continue;
        }

        try {
          const sentMessage = await whatsappService.sendMessageForDevice(
            deviceId,
            cleanPhone,
            msg.message,
            msg.type || type
          );

          successCount++;
          results.push({
            to: cleanPhone,
            status: "success",
            messageId: sentMessage.key.id,
            timestamp: new Date().toISOString(),
          });

          // Delay between messages (except for last message)
          if (i < messages.length - 1 && delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay * 1000));
          }
        } catch (error) {
          errorCount++;
          results.push({
            to: cleanPhone,
            status: "error",
            error: error.message,
          });
        }
      }

      const { response, statusCode } = successResponse({
        total: messages.length,
        successCount: successCount,
        errorCount: errorCount,
        results: results,
      }, `Bulk kirim selesai. ${successCount} berhasil, ${errorCount} gagal`);

      res.status(statusCode).json(response);
    } else {
      // Single mode
      const phoneNumber = to || phone;
      if (!phoneNumber) {
        const { response, statusCode } = errorResponse(
          "Field 'to' atau 'phone' wajib diisi",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      if (!message) {
        const { response, statusCode } = errorResponse(
          "Field 'message' wajib diisi",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      // Validate and normalize phone number
      const cleanPhone = normalizePhoneNumber(phoneNumber);
      if (!cleanPhone) {
        const { response, statusCode } = errorResponse(
          "Format nomor telepon tidak valid. Format: +62, 62, atau 0 diikuti 8-13 digit",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      // Validate message length
      if (message.length > 4096) {
        const { response, statusCode } = errorResponse(
          "Panjang pesan maksimal 4096 karakter",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      const sentMessage = await whatsappService.sendMessageForDevice(
        deviceId,
        cleanPhone,
        message,
        type
      );

      const { response, statusCode } = successResponse({
        messageId: sentMessage.key.id,
        to: cleanPhone,
        message: message,
        type: type,
        timestamp: new Date().toISOString(),
        deviceId: deviceId,
      }, "Pesan berhasil dikirim");

      res.status(statusCode).json(response);
    }
  } catch (error) {
    logger.error("Send message error:", error);

    let statusCode = 500;
    let errorMessage = "Gagal mengirim pesan";

    if (error.message === "WhatsApp session not found for device") {
      statusCode = 400;
      errorMessage = "Device tidak terkoneksi. Silakan koneksikan terlebih dahulu.";
    } else if (error.message === "WhatsApp not connected") {
      statusCode = 400;
      errorMessage = "Session device tidak aktif. Silakan koneksikan ulang.";
    }

    const { response, statusCode: errorStatusCode } = errorResponse(
      errorMessage,
      error.message,
      statusCode
    );
    res.status(errorStatusCode).json(response);
  }
};

/**
 * Send media (single & bulk)
 * Supports: FormData (file upload), base64, dan URL
 */
const sendMedia = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Check if bulk mode (items array exists)
    // Handle case where items might be a JSON string (from FormData)
    let items = req.body.items;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (e) {
        // Not a JSON string, treat as invalid
        items = null;
      }
    }
    const isBulk = items && Array.isArray(items);

    if (isBulk) {
      // Bulk mode
      if (items.length === 0) {
        const { response, statusCode } = errorResponse(
          "Array items tidak boleh kosong",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      // Validate each item
      for (const item of items) {
        if (!item.to && !item.phoneNumber) {
          const { response, statusCode } = errorResponse(
            "Setiap item harus memiliki field 'to'",
            null,
            400
          );
          return res.status(statusCode).json(response);
        }
        if (!item.mediaType) {
          const { response, statusCode } = errorResponse(
            "Setiap item harus memiliki field 'mediaType'",
            null,
            400
          );
          return res.status(statusCode).json(response);
        }
        if (!item.base64 && !item.url && !item.fileIndex) {
          const { response, statusCode } = errorResponse(
            "Setiap item harus memiliki 'base64', 'url', atau 'fileIndex'",
            null,
            400
          );
          return res.status(statusCode).json(response);
        }
      }

      const delay = parseInt(req.body.delay) || 3;
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const phoneNumber = item.to || item.phoneNumber;

        try {
          // Normalize phone number
          const cleanPhone = normalizePhoneNumber(phoneNumber);
          if (!cleanPhone) {
            errorCount++;
            results.push({
              to: phoneNumber,
              status: "error",
              error: "Format nomor telepon tidak valid",
            });
            continue;
          }

          // Get media data
          let mediaBuffer;
          let fileName = item.fileName || null;
          let mimetype = item.mimetype || null;

          if (item.base64) {
            // Base64 data
            const base64Data = item.base64.startsWith("data:")
              ? item.base64.split(",")[1]
              : item.base64;
            mediaBuffer = Buffer.from(base64Data, "base64");
          } else if (item.url) {
            // URL - download media
            mediaBuffer = await whatsappService.downloadMediaFromURL(item.url);
          } else if (item.fileIndex !== undefined && req.file) {
            // File from upload (single file for all items in this case)
            mediaBuffer = fs.readFileSync(req.file.path);
            fileName = req.file.originalname;
            mimetype = req.file.mimetype;
            // Clean up file after reading
            fs.unlinkSync(req.file.path);
          } else {
            errorCount++;
            results.push({
              to: cleanPhone,
              status: "error",
              error: "Media data tidak ditemukan",
            });
            continue;
          }

          // Determine MIME type from mediaType if not provided
          if (!mimetype) {
            switch (item.mediaType) {
              case "image":
                mimetype = "image/jpeg";
                break;
              case "video":
                mimetype = "video/mp4";
                break;
              case "document":
                mimetype = "application/pdf";
                break;
            }
          }

          // Send media
          const sentMessage = await whatsappService.sendMediaForDevice(
            deviceId,
            cleanPhone,
            item.mediaType,
            mediaBuffer,
            item.caption || null,
            fileName,
            mimetype
          );

          successCount++;
          results.push({
            to: cleanPhone,
            status: "success",
            messageId: sentMessage.key.id,
            timestamp: new Date().toISOString(),
          });

          // Delay between messages (except for last message)
          if (i < items.length - 1 && delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay * 1000));
          }
        } catch (error) {
          errorCount++;
          results.push({
            to: phoneNumber,
            status: "error",
            error: error.message,
          });
        }
      }

      const { response, statusCode } = successResponse(
        {
          total: items.length,
          successCount: successCount,
          errorCount: errorCount,
          results: results,
        },
        `Bulk kirim media selesai. ${successCount} berhasil, ${errorCount} gagal`
      );

      res.status(statusCode).json(response);
    } else {
      // Single mode
      const to = req.body.to || req.body.phoneNumber;
      if (!to) {
        const { response, statusCode } = errorResponse(
          "Field 'to' wajib diisi",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      const mediaType = req.body.mediaType;
      if (!mediaType) {
        const { response, statusCode } = errorResponse(
          "Field 'mediaType' wajib diisi",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      if (!["image", "video", "document"].includes(mediaType)) {
        const { response, statusCode } = errorResponse(
          "mediaType harus salah satu dari: image, video, document",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      // Normalize phone number
      const cleanPhone = normalizePhoneNumber(to);
      if (!cleanPhone) {
        const { response, statusCode } = errorResponse(
          "Format nomor telepon tidak valid. Format: +62, 62, atau 0 diikuti 8-13 digit",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      // Get media data
      let mediaBuffer;
      let fileName = req.body.fileName || null;
      let mimetype = req.body.mimetype || null;

      if (req.body.base64) {
        // Base64 data
        const base64Data = req.body.base64.startsWith("data:")
          ? req.body.base64.split(",")[1]
          : req.body.base64;
        mediaBuffer = Buffer.from(base64Data, "base64");
      } else if (req.body.url) {
        // URL - download media
        mediaBuffer = await whatsappService.downloadMediaFromURL(req.body.url);
      } else if (req.file) {
        // File from FormData upload
        mediaBuffer = fs.readFileSync(req.file.path);
        fileName = req.file.originalname;
        mimetype = req.file.mimetype;
        // Clean up file after reading
        fs.unlinkSync(req.file.path);
      } else {
        const { response, statusCode } = errorResponse(
          "Media data wajib diisi (base64, url, atau file)",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      // Determine MIME type from mediaType if not provided
      if (!mimetype) {
        switch (mediaType) {
          case "image":
            mimetype = "image/jpeg";
            break;
          case "video":
            mimetype = "video/mp4";
            break;
          case "document":
            mimetype = "application/pdf";
            break;
        }
      }

      // Send media
      const sentMessage = await whatsappService.sendMediaForDevice(
        deviceId,
        cleanPhone,
        mediaType,
        mediaBuffer,
        req.body.caption || null,
        fileName,
        mimetype
      );

      const { response, statusCode } = successResponse(
        {
          deviceId: deviceId,
          messageId: sentMessage.key.id,
          timestamp: new Date().toISOString(),
          to: cleanPhone,
        },
        "Media berhasil dikirim"
      );

      res.status(statusCode).json(response);
    }
  } catch (error) {
    logger.error("Send media error:", error);

    let statusCode = 500;
    let errorMessage = "Gagal mengirim media";

    if (error.message === "WhatsApp session not found for device") {
      statusCode = 400;
      errorMessage = "Device tidak terkoneksi. Silakan koneksikan terlebih dahulu.";
    } else if (error.message === "WhatsApp not connected") {
      statusCode = 400;
      errorMessage = "Session device tidak aktif. Silakan koneksikan ulang.";
    }

    const { response, statusCode: errorStatusCode } = errorResponse(
      errorMessage,
      error.message,
      statusCode
    );
    res.status(errorStatusCode).json(response);
  }
};

/**
 * Create send-text job (bulk messaging)
 */
const createSendTextJob = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { messages, delay = 3 } = req.body; // delay is now root level, not in options
    const userId = req.user.id;

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      const { response, statusCode } = errorResponse(
        "Array messages wajib diisi dan tidak boleh kosong",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    if (messages.length > 100) {
      const { response, statusCode } = errorResponse(
        "Maksimal 100 pesan per job",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Validate each message
    for (const msg of messages) {
      if (!msg.to || !msg.message) {
        const { response, statusCode } = errorResponse(
          "Setiap pesan harus memiliki field 'to' dan 'message'",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }
    }

    // Create send message function wrapper
    const sendMessageFn = async (deviceId, phone, message, type) => {
      return await whatsappService.sendMessageForDevice(deviceId, phone, message, type || "text");
    };

    // Create job
    const jobId = jobQueueService.createJob("send-text", {
      deviceId,
      messages,
      sendMessageFn,
    }, {
      delay: delay, // Use delay from root level
      autoStart: true,
    });

    logger.info(`📦 Created bulk messaging job ${jobId} for device ${deviceId}`);

    const { response, statusCode } = successResponse({
      jobId: jobId,
      status: "queued",
      delaySec: delay,
      total: messages.length,
    }, "Job pengiriman teks dibuat");

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Create send-text job error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal membuat job",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Create send-media job (bulk media messaging to contacts)
 */
const createSendMediaJob = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { items, delay = 3 } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      const { response, statusCode } = errorResponse(
        "Array items wajib diisi dan tidak boleh kosong",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    if (items.length > 100) {
      const { response, statusCode } = errorResponse(
        "Maksimal 100 item per job",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Validate each item
    for (const item of items) {
      if (!item.to && !item.phoneNumber) {
        const { response, statusCode } = errorResponse(
          "Setiap item harus memiliki field 'to'",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }
      if (!item.mediaType) {
        const { response, statusCode } = errorResponse(
          "Setiap item harus memiliki field 'mediaType'",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }
      if (!item.base64 && !item.url) {
        const { response, statusCode } = errorResponse(
          "Setiap item harus memiliki 'base64' atau 'url'",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }
    }

    // Create send media function wrapper
    const sendMediaFn = async (deviceId, phoneNumber, mediaType, mediaBuffer, caption, fileName, mimetype) => {
      return await whatsappService.sendMediaForDevice(
        deviceId,
        phoneNumber,
        mediaType,
        mediaBuffer,
        caption,
        fileName,
        mimetype
      );
    };

    const downloadMediaFromURLFn = async (url) => {
      return await whatsappService.downloadMediaFromURL(url);
    };

    // Create job
    const jobId = jobQueueService.createJob("send-media", {
      deviceId,
      items,
      sendMediaFn,
      downloadMediaFromURLFn,
      targetType: 'contact',
    }, {
      delay: delay,
      autoStart: true,
    });

    logger.info(`📦 Created bulk media job ${jobId} for device ${deviceId}`);

    const { response, statusCode } = successResponse({
      jobId: jobId,
      status: "queued",
      delaySec: delay,
      total: items.length,
    }, "Job pengiriman media (kontak) dibuat");

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Create send-media job error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal membuat job",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Get job status
 */
const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    const job = jobQueueService.getJob(jobId);

    if (!job) {
      const { response, statusCode } = errorResponse(
        "Job tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    // Verify job belongs to user's device
    const device = await deviceManager.getDevice(job.data.deviceId);
    if (!device || (device.userId !== userId && req.user.role !== "admin")) {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Format progress sesuai dokumentasi
    const progress = {
      total: job.progress.total || 0,
      currentIndex: job.progress.completed || 0,
      successCount: job.result?.success?.length || 0,
      errorCount: job.progress.failed || job.result?.failed?.length || 0,
    };

    // Format results sesuai dokumentasi
    let results = [];
    if (job.result) {
      if (job.result.success && Array.isArray(job.result.success)) {
        results = job.result.success.map((item) => ({
          to: item.to,
          status: "success",
          messageId: item.messageId || null,
          timestamp: item.timestamp || new Date().toISOString(),
        }));
      }
      if (job.result.failed && Array.isArray(job.result.failed)) {
        results = results.concat(
          job.result.failed.map((item) => ({
            to: item.to,
            status: "error",
            error: item.error || "Unknown error",
          }))
        );
      }
    }

    // Format options
    const options = {
      delaySec: job.options?.delay || 3,
    };

    const { response, statusCode } = successResponse({
      id: job.id,
      type: job.type,
      deviceId: job.data.deviceId,
      status: job.status,
      createdAt: job.createdAt ? new Date(job.createdAt).toISOString().replace('T', ' ').substring(0, 19) : null,
      startedAt: job.startedAt ? new Date(job.startedAt).toISOString().replace('T', ' ').substring(0, 19) : null,
      finishedAt: job.completedAt ? new Date(job.completedAt).toISOString().replace('T', ' ').substring(0, 19) : null,
      progress: progress,
      results: results,
      options: options,
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get job status error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan status job",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Cancel job
 */
const cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    const job = jobQueueService.getJob(jobId);

    if (!job) {
      const { response, statusCode } = errorResponse(
        "Job tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    // Verify job belongs to user's device
    const device = await deviceManager.getDevice(job.data.deviceId);
    if (!device || (device.userId !== userId && req.user.role !== "admin")) {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    const cancelled = jobQueueService.cancelJob(jobId);

    if (cancelled) {
      const { response, statusCode } = successResponse({
        id: jobId,
        status: "cancelled",
        cancelled: true,
      }, "Job dibatalkan");

      res.status(statusCode).json(response);
    } else {
      const { response, statusCode } = errorResponse(
        "Job tidak dapat dibatalkan (sudah selesai atau sudah dibatalkan)",
        null,
        400
      );
      res.status(statusCode).json(response);
    }
  } catch (error) {
    logger.error("Cancel job error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal membatalkan job",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * List groups for device
 */
const listGroups = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const groups = await Group.findAll({
      where: { deviceId: deviceId, isActive: true },
      attributes: ['id', 'groupId', 'subject', 'description', 'participants', 'admins', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });

    // Format groups sesuai dokumentasi
    const formattedGroups = groups.map(group => ({
      id: group.groupId,
      subject: group.subject,
      participants: group.participants || [],
      creation: group.createdAt ? Math.floor(new Date(group.createdAt).getTime() / 1000) : null,
      owner: null, // TODO: Get owner from metadata if available
    }));

    const { response, statusCode } = successResponse({
      deviceId: deviceId,
      groups: formattedGroups,
      total: formattedGroups.length,
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("List groups error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan daftar grup",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Create group
 */
const createGroup = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { subject, participants = [] } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Create group using WhatsAppService
    const groupResult = await whatsappService.createGroupForDevice(deviceId, subject, participants);

    // Get group metadata
    const groupMetadata = await whatsappService.getGroupMetadataForDevice(deviceId, groupResult);

    // Save to database
    const group = await Group.create({
      groupId: groupResult,
      deviceId: deviceId,
      subject: subject,
      description: groupMetadata.desc || null,
      creationTimestamp: groupMetadata.creation || null,
      owner: groupMetadata.owner || null,
      participants: groupMetadata.participants.map(p => p.id) || [],
      admins: groupMetadata.participants.filter(p => p.admin).map(p => p.id) || [],
      metadata: groupMetadata,
      isActive: true,
    });

    const { response, statusCode } = successResponse({
      groupId: group.groupId,
      subject: group.subject,
      participants: group.participants,
      totalParticipants: group.participants.length,
    }, "Grup berhasil dibuat");

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Create group error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal membuat grup",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Get group info
 */
const getGroupInfo = async (req, res) => {
  try {
    const { deviceId, groupId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get from database first
    let group = await Group.findOne({
      where: { groupId: groupId, deviceId: deviceId }
    });

    // Get group metadata from WhatsApp
    let groupMetadata;
    try {
      groupMetadata = await whatsappService.getGroupMetadataForDevice(deviceId, groupId);
    } catch (error) {
      logger.warn(`Failed to get group metadata from WhatsApp: ${error.message}`);
      const { response, statusCode } = errorResponse(
        "Gagal mendapatkan informasi grup",
        error.message,
        500
      );
      return res.status(statusCode).json(response);
    }

    // Format participants sesuai dokumentasi
    const formattedParticipants = groupMetadata.participants.map(p => ({
      id: p.id,
      isAdmin: p.admin || false,
      isSuperAdmin: p.admin === "superadmin" || false,
    }));

    // If not in database, return from WhatsApp only
    if (!group) {
      const { response, statusCode } = successResponse({
        id: groupMetadata.id,
        subject: groupMetadata.subject,
        creation: groupMetadata.creation || null,
        owner: groupMetadata.owner || null,
        participants: formattedParticipants,
        description: groupMetadata.desc || null,
      });

      res.status(statusCode).json(response);
      return;
    }

    // Update database with latest info
    try {
      await group.update({
        subject: groupMetadata.subject,
        description: groupMetadata.desc || null,
        participants: groupMetadata.participants.map(p => p.id) || [],
        admins: groupMetadata.participants.filter(p => p.admin).map(p => p.id) || [],
        metadata: groupMetadata,
      });

      await group.reload();
    } catch (error) {
      logger.warn(`Failed to update group info from WhatsApp: ${error.message}`);
    }

    const { response, statusCode } = successResponse({
      id: group.groupId,
      subject: groupMetadata.subject || group.subject,
      creation: groupMetadata.creation || (group.createdAt ? Math.floor(new Date(group.createdAt).getTime() / 1000) : null),
      owner: groupMetadata.owner || group.owner || null,
      participants: formattedParticipants,
      description: groupMetadata.desc || group.description || null,
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get group info error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan informasi grup",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Send mention message to group
 */
const sendGroupMentionMessage = async (req, res) => {
  try {
    const { deviceId, groupId } = req.params;
    const userId = req.user.id;
    const { message, mentions } = req.body;

    // Validate input
    if (!message) {
      const { response, statusCode } = errorResponse(
        "Field 'message' wajib diisi",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    if (!mentions || !Array.isArray(mentions) || mentions.length === 0) {
      const { response, statusCode } = errorResponse(
        "Field 'mentions' wajib diisi dan harus array yang tidak kosong",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Validate groupId format
    if (!groupId.includes("@g.us")) {
      const { response, statusCode } = errorResponse(
        "Format groupId tidak valid",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Send mention message
    const sentMessage = await whatsappService.sendGroupMentionMessageForDevice(
      deviceId,
      groupId,
      message,
      mentions
    );

    const { response, statusCode } = successResponse(
      {
        messageId: sentMessage.key.id,
        timestamp: new Date().toISOString(),
      },
      "Pesan mention grup berhasil dikirim"
    );

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Send group mention message error:", error);

    let statusCode = 500;
    let errorMessage = "Gagal mengirim pesan mention grup";

    if (error.message === "WhatsApp session not found for device") {
      statusCode = 400;
      errorMessage = "Device tidak terkoneksi. Silakan koneksikan terlebih dahulu.";
    } else if (error.message === "WhatsApp not connected") {
      statusCode = 400;
      errorMessage = "Session device tidak aktif. Silakan koneksikan ulang.";
    }

    const { response, statusCode: errorStatusCode } = errorResponse(
      errorMessage,
      error.message,
      statusCode
    );
    res.status(errorStatusCode).json(response);
  }
};

/**
 * Send group message (single & bulk)
 */
const sendGroupMessage = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { groupId, message, items, delay = 3 } = req.body;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Detect bulk mode (if items array exists)
    if (items && Array.isArray(items)) {
      // Bulk mode
      if (items.length === 0) {
        const { response, statusCode } = errorResponse(
          "Array items tidak boleh kosong",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      // Validate each item
      for (const item of items) {
        if (!item.groupId) {
          const { response, statusCode } = errorResponse(
            "Setiap item harus memiliki field 'groupId'",
            null,
            400
          );
          return res.status(statusCode).json(response);
        }
        if (!item.message) {
          const { response, statusCode } = errorResponse(
            "Setiap item harus memiliki field 'message'",
            null,
            400
          );
          return res.status(statusCode).json(response);
        }
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          const sentMessage = await whatsappService.sendGroupMessageForDevice(
            deviceId,
            item.groupId,
            item.message
          );

          successCount++;
          results.push({
            groupId: item.groupId,
            status: "success",
            messageId: sentMessage.key.id,
            timestamp: new Date().toISOString(),
          });

          // Delay between messages (except for last message)
          if (i < items.length - 1 && delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay * 1000));
          }
        } catch (error) {
          errorCount++;
          results.push({
            groupId: item.groupId,
            status: "error",
            error: error.message,
          });
        }
      }

      const { response, statusCode } = successResponse({
        total: items.length,
        successCount: successCount,
        errorCount: errorCount,
        results: results,
      }, `Bulk kirim pesan grup selesai. ${successCount} berhasil, ${errorCount} gagal`);

      res.status(statusCode).json(response);
    } else {
      // Single mode
      if (!groupId) {
        const { response, statusCode } = errorResponse(
          "Field 'groupId' wajib diisi",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      if (!message) {
        const { response, statusCode } = errorResponse(
          "Field 'message' wajib diisi",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      const sentMessage = await whatsappService.sendGroupMessageForDevice(deviceId, groupId, message);

      const { response, statusCode } = successResponse({
        groupId: groupId,
        messageId: sentMessage.key.id,
        timestamp: new Date().toISOString(),
      }, "Pesan grup berhasil dikirim");

      res.status(statusCode).json(response);
    }
  } catch (error) {
    logger.error("Send group message error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mengirim pesan grup",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Send media to group (single & bulk)
 */
const sendGroupMedia = async (req, res) => {
  try {
    const { deviceId, groupId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Validate groupId format
    if (!groupId.includes("@g.us")) {
      const { response, statusCode } = errorResponse(
        "Format groupId tidak valid",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Check if bulk mode (items array exists)
    let items = req.body.items;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (e) {
        items = null;
      }
    }
    const isBulk = items && Array.isArray(items);

    if (isBulk) {
      // Bulk mode - send to multiple groups
      if (items.length === 0) {
        const { response, statusCode } = errorResponse(
          "Array items tidak boleh kosong",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      // Validate each item
      for (const item of items) {
        if (!item.groupId) {
          const { response, statusCode } = errorResponse(
            "Setiap item harus memiliki field 'groupId'",
            null,
            400
          );
          return res.status(statusCode).json(response);
        }
        if (!item.mediaType) {
          const { response, statusCode } = errorResponse(
            "Setiap item harus memiliki field 'mediaType'",
            null,
            400
          );
          return res.status(statusCode).json(response);
        }
        if (!item.base64 && !item.url && !item.fileIndex) {
          const { response, statusCode } = errorResponse(
            "Setiap item harus memiliki 'base64', 'url', atau 'fileIndex'",
            null,
            400
          );
          return res.status(statusCode).json(response);
        }
      }

      const delay = parseInt(req.body.delay) || 3;
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        try {
          // Get media data
          let mediaBuffer;
          let fileName = item.fileName || null;
          let mimetype = item.mimetype || null;

          if (item.base64) {
            // Base64 data
            const base64Data = item.base64.startsWith("data:")
              ? item.base64.split(",")[1]
              : item.base64;
            mediaBuffer = Buffer.from(base64Data, "base64");
          } else if (item.url) {
            // URL - download media
            mediaBuffer = await whatsappService.downloadMediaFromURL(item.url);
          } else if (item.fileIndex !== undefined && req.file) {
            // File from upload
            mediaBuffer = fs.readFileSync(req.file.path);
            fileName = req.file.originalname;
            mimetype = req.file.mimetype;
          } else {
            errorCount++;
            results.push({
              groupId: item.groupId,
              status: "error",
              error: "Media data tidak ditemukan",
            });
            continue;
          }

          // Determine MIME type from mediaType if not provided
          if (!mimetype) {
            switch (item.mediaType) {
              case "image":
                mimetype = "image/jpeg";
                break;
              case "video":
                mimetype = "video/mp4";
                break;
              case "document":
                mimetype = "application/pdf";
                break;
            }
          }

          // Send media
          const sentMessage = await whatsappService.sendGroupMediaForDevice(
            deviceId,
            item.groupId,
            item.mediaType,
            mediaBuffer,
            item.caption || null,
            fileName,
            mimetype
          );

          successCount++;
          results.push({
            groupId: item.groupId,
            status: "success",
            messageId: sentMessage.key.id,
            timestamp: new Date().toISOString(),
          });

          // Delay between messages (except for last message)
          if (i < items.length - 1 && delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay * 1000));
          }
        } catch (error) {
          errorCount++;
          results.push({
            groupId: item.groupId,
            status: "error",
            error: error.message,
          });
        }
      }

      // Clean up uploaded file if exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      const { response, statusCode } = successResponse(
        {
          total: items.length,
          successCount: successCount,
          errorCount: errorCount,
          results: results,
        },
        `Bulk kirim media grup selesai. ${successCount} berhasil, ${errorCount} gagal`
      );

      res.status(statusCode).json(response);
    } else {
      // Single mode - send to single group
      const mediaType = req.body.mediaType;
      if (!mediaType) {
        const { response, statusCode } = errorResponse(
          "Field 'mediaType' wajib diisi",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      if (!["image", "video", "document"].includes(mediaType)) {
        const { response, statusCode } = errorResponse(
          "mediaType harus salah satu dari: image, video, document",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      // Get media data
      let mediaBuffer;
      let fileName = req.body.fileName || null;
      let mimetype = req.body.mimetype || null;

      if (req.body.base64) {
        // Base64 data
        const base64Data = req.body.base64.startsWith("data:")
          ? req.body.base64.split(",")[1]
          : req.body.base64;
        mediaBuffer = Buffer.from(base64Data, "base64");
      } else if (req.body.url) {
        // URL - download media
        mediaBuffer = await whatsappService.downloadMediaFromURL(req.body.url);
      } else if (req.file) {
        // File from FormData upload
        mediaBuffer = fs.readFileSync(req.file.path);
        fileName = req.file.originalname;
        mimetype = req.file.mimetype;
        // Clean up file after reading
        fs.unlinkSync(req.file.path);
      } else {
        const { response, statusCode } = errorResponse(
          "Media data wajib diisi (base64, url, atau file)",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }

      // Determine MIME type from mediaType if not provided
      if (!mimetype) {
        switch (mediaType) {
          case "image":
            mimetype = "image/jpeg";
            break;
          case "video":
            mimetype = "video/mp4";
            break;
          case "document":
            mimetype = "application/pdf";
            break;
        }
      }

      // Send media
      const sentMessage = await whatsappService.sendGroupMediaForDevice(
        deviceId,
        groupId,
        mediaType,
        mediaBuffer,
        req.body.caption || null,
        fileName,
        mimetype
      );

      const { response, statusCode } = successResponse(
        {
          deviceId: deviceId,
          groupId: groupId,
          messageId: sentMessage.key.id,
          timestamp: new Date().toISOString(),
        },
        "Media berhasil dikirim ke grup"
      );

      res.status(statusCode).json(response);
    }
  } catch (error) {
    logger.error("Send group media error:", error);

    let statusCode = 500;
    let errorMessage = "Gagal mengirim media ke grup";

    if (error.message === "WhatsApp session not found for device") {
      statusCode = 400;
      errorMessage = "Device tidak terkoneksi. Silakan koneksikan terlebih dahulu.";
    } else if (error.message === "WhatsApp not connected") {
      statusCode = 400;
      errorMessage = "Session device tidak aktif. Silakan koneksikan ulang.";
    }

    const { response, statusCode: errorStatusCode } = errorResponse(
      errorMessage,
      error.message,
      statusCode
    );
    res.status(errorStatusCode).json(response);
  }
};

/**
 * Create send-group-media job (bulk media messaging to group)
 */
const createSendGroupMediaJob = async (req, res) => {
  try {
    const { deviceId, groupId } = req.params;
    const { items, mediaType, caption, delay = 3 } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      const { response, statusCode } = errorResponse(
        "Array items wajib diisi dan tidak boleh kosong",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    if (items.length > 100) {
      const { response, statusCode } = errorResponse(
        "Maksimal 100 item per job",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    if (!mediaType) {
      const { response, statusCode } = errorResponse(
        "Field 'mediaType' wajib diisi",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Validate groupId format
    if (!groupId.includes("@g.us")) {
      const { response, statusCode } = errorResponse(
        "Format groupId tidak valid",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Validate each item has media data
    for (const item of items) {
      if (!item.base64 && !item.url && !req.file) {
        const { response, statusCode } = errorResponse(
          "Setiap item harus memiliki 'base64', 'url', atau file upload harus disediakan",
          null,
          400
        );
        return res.status(statusCode).json(response);
      }
    }

    // Prepare items with groupId and mediaType
    const processedItems = items.map(item => ({
      groupId: groupId,
      mediaType: item.mediaType || mediaType,
      caption: item.caption || caption || null,
      base64: item.base64 || null,
      url: item.url || null,
      fileName: item.fileName || null,
      mimetype: item.mimetype || null,
      filePath: req.file ? req.file.path : null, // Store file path for job processing
    }));

    // Create send group media function wrapper
    const sendGroupMediaFn = async (deviceId, groupId, mediaType, mediaBuffer, caption, fileName, mimetype) => {
      return await whatsappService.sendGroupMediaForDevice(
        deviceId,
        groupId,
        mediaType,
        mediaBuffer,
        caption,
        fileName,
        mimetype
      );
    };

    const downloadMediaFromURLFn = async (url) => {
      return await whatsappService.downloadMediaFromURL(url);
    };

    // Create job
    const jobId = jobQueueService.createJob("send-media", {
      deviceId,
      items: processedItems,
      sendGroupMediaFn,
      downloadMediaFromURLFn,
      targetType: 'group',
    }, {
      delay: delay,
      autoStart: true,
    });

    logger.info(`📦 Created bulk group media job ${jobId} for device ${deviceId}, group ${groupId}`);

    const { response, statusCode } = successResponse({
      jobId: jobId,
      status: "queued",
      delaySec: delay,
      total: items.length,
    }, "Job pengiriman media (grup) dibuat");

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Create send-group-media job error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal membuat job",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Invite participants to group
 */
const inviteParticipants = async (req, res) => {
  try {
    const { deviceId, groupId } = req.params;
    const { participants } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "participants array is required",
      });
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await whatsappService.updateGroupParticipantsForDevice(deviceId, groupId, participants, "add");

    // Update database and get added participants
    const group = await Group.findOne({ where: { groupId: groupId, deviceId: deviceId } });
    let addedParticipants = [];
    if (group) {
      const groupMetadata = await whatsappService.getGroupMetadataForDevice(deviceId, groupId);
      const newParticipants = groupMetadata.participants.map(p => p.id) || [];
      const oldParticipants = group.participants || [];
      addedParticipants = newParticipants.filter(p => !oldParticipants.includes(p));
      
      await group.update({
        participants: newParticipants,
        admins: groupMetadata.participants.filter(p => p.admin).map(p => p.id) || [],
      });
    } else {
      // If group not in DB, format participants to JID format
      addedParticipants = participants.map(p => {
        if (p.includes('@')) return p;
        return `${p.replace(/\D/g, '')}@s.whatsapp.net`;
      });
    }

    const { response, statusCode } = successResponse({
      success: true,
      added: addedParticipants,
    }, "Participants berhasil diundang");

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Invite participants error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mengundang participants",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Kick participant from group
 */
const kickParticipant = async (req, res) => {
  try {
    const { deviceId, groupId, participantJid } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await whatsappService.updateGroupParticipantsForDevice(deviceId, groupId, [participantJid], "remove");

    // Update database
    const group = await Group.findOne({ where: { groupId: groupId, deviceId: deviceId } });
    if (group) {
      const groupMetadata = await whatsappService.getGroupMetadataForDevice(deviceId, groupId);
      await group.update({
        participants: groupMetadata.participants.map(p => p.id) || [],
        admins: groupMetadata.participants.filter(p => p.admin).map(p => p.id) || [],
      });
    }

    const { response, statusCode } = successResponse({
      success: true,
      removed: participantJid,
    }, "Participant berhasil dihapus");

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Kick participant error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal menghapus participant",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Promote participant to admin (support single and batch)
 */
const promoteAdmin = async (req, res) => {
  try {
    const { deviceId, groupId } = req.params;
    const { adminJid, participants } = req.body; // Support both single (adminJid) and batch (participants)
    const userId = req.user.id;

    // Determine which format is used
    let participantJids = [];
    if (participants && Array.isArray(participants)) {
      // Batch mode
      participantJids = participants;
    } else if (adminJid) {
      // Single mode
      participantJids = [adminJid];
    } else {
      const { response, statusCode } = errorResponse(
        "Field 'adminJid' atau 'participants' wajib diisi",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    await whatsappService.updateGroupAdminsForDevice(deviceId, groupId, participantJids, "promote");

    // Update database
    const group = await Group.findOne({ where: { groupId: groupId, deviceId: deviceId } });
    if (group) {
      const groupMetadata = await whatsappService.getGroupMetadataForDevice(deviceId, groupId);
      await group.update({
        admins: groupMetadata.participants.filter(p => p.admin).map(p => p.id) || [],
      });
    }

    // Format JIDs to ensure they have @s.whatsapp.net suffix
    const promoted = participantJids.map(jid => {
      if (jid.includes('@')) return jid;
      return `${jid.replace(/\D/g, '')}@s.whatsapp.net`;
    });

    const { response, statusCode } = successResponse({
      success: true,
      promoted: promoted,
    }, "Admin berhasil ditambahkan");

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Promote admin error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal menambahkan admin",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Demote admin
 */
const demoteAdmin = async (req, res) => {
  try {
    const { deviceId, groupId, adminJid } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    await whatsappService.updateGroupAdminsForDevice(deviceId, groupId, [adminJid], "demote");

    // Update database
    const group = await Group.findOne({ where: { groupId: groupId, deviceId: deviceId } });
    if (group) {
      const groupMetadata = await whatsappService.getGroupMetadataForDevice(deviceId, groupId);
      await group.update({
        admins: groupMetadata.participants.filter(p => p.admin).map(p => p.id) || [],
      });
    }

    const { response, statusCode } = successResponse({
      success: true,
      demoted: adminJid,
    }, "Admin berhasil dihapus");

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Demote admin error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal menghapus admin",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Get chat history for a contact/jid
 */
const getChatHistory = async (req, res) => {
  try {
    const { deviceId, jid } = req.params;
    const { limit = 50, before, source = "auto", waitSeconds = 10 } = req.query;
    const userId = req.user.id;

    // Validate limit
    const limitNum = parseInt(limit);
    if (limitNum < 1 || limitNum > 100) {
      const { response, statusCode } = errorResponse(
        "Limit harus antara 1-100",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Get session ID for device
    const session = await WhatsAppSession.findOne({
      where: { deviceId: deviceId, isActive: true },
      attributes: ["id", "userId"]
    });

    if (!session) {
      const { response, statusCode } = errorResponse(
        "Session tidak ditemukan untuk device",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    // Extract phone number from JID (remove @s.whatsapp.net)
    const phoneNumber = jid.split("@")[0];
    let messages = [];
    let messageSource = source;

    // Handle source parameter
    if (source === "whatsapp" || (source === "auto" && !session)) {
      // Try to get from WhatsApp directly
      try {
        // TODO: Implement WhatsApp direct fetch
        // For now, fallback to store
        messageSource = "store";
      } catch (error) {
        logger.warn(`Failed to get chat history from WhatsApp: ${error.message}`);
        messageSource = "store";
      }
    }

    if (messageSource === "store" || messageSource === "auto") {
      // Get from database/store
      const whereClause = {
        sessionId: session.id,
        [Op.or]: [
          { fromNumber: phoneNumber },
          { toNumber: phoneNumber }
        ]
      };

      if (before) {
        whereClause.timestamp = { [Op.lt]: new Date(before) };
      }

      messages = await Message.findAll({
        where: whereClause,
        order: [["timestamp", "DESC"]],
        limit: limitNum,
        attributes: [
          "id",
          "messageId",
          "fromNumber",
          "toNumber",
          "messageType",
          "content",
          "direction",
          "status",
          "timestamp",
          "metadata"
        ]
      });

      messages = messages.reverse(); // Reverse to get chronological order
    }

    // Format messages sesuai dokumentasi
    const formattedMessages = messages.map(msg => ({
      id: msg.messageId || msg.id,
      from: msg.direction === "incoming" ? `${msg.fromNumber}@s.whatsapp.net` : jid,
      fromMe: msg.direction === "outgoing",
      messageType: msg.messageType || "conversation",
      content: typeof msg.content === "string" ? { text: msg.content } : msg.content,
      timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : null,
    }));

    const sourceMessage = messageSource === "whatsapp" 
      ? "Chat history berhasil diambil langsung dari WhatsApp"
      : "Chat history berhasil diambil dari store";

    const { response, statusCode } = successResponse({
      jid: jid,
      messages: formattedMessages,
      total: formattedMessages.length,
      hasMore: formattedMessages.length === limitNum,
    }, sourceMessage);

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get chat history error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan chat history",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Get group chat history
 */
const getGroupChatHistory = async (req, res) => {
  try {
    const { deviceId, groupId } = req.params;
    const { limit = 50, before, source = "auto", waitSeconds = 10 } = req.query;
    const userId = req.user.id;

    // Validate limit
    const limitNum = parseInt(limit);
    if (limitNum < 1 || limitNum > 100) {
      const { response, statusCode } = errorResponse(
        "Limit harus antara 1-100",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Get session ID for device
    const session = await WhatsAppSession.findOne({
      where: { deviceId: deviceId, isActive: true },
      attributes: ["id"]
    });

    if (!session) {
      const { response, statusCode } = errorResponse(
        "Session tidak ditemukan untuk device",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    let messages = [];
    let messageSource = source;

    // Handle source parameter
    if (source === "whatsapp" || (source === "auto" && !session)) {
      // Try to get from WhatsApp directly
      try {
        // TODO: Implement WhatsApp direct fetch
        // For now, fallback to store
        messageSource = "store";
      } catch (error) {
        logger.warn(`Failed to get group chat history from WhatsApp: ${error.message}`);
        messageSource = "store";
      }
    }

    if (messageSource === "store" || messageSource === "auto") {
      // Build where clause - messages to/from group
      const whereClause = {
        sessionId: session.id,
        [Op.or]: [
          { fromNumber: groupId },
          { toNumber: groupId }
        ]
      };

      if (before) {
        whereClause.timestamp = { [Op.lt]: new Date(before) };
      }

      // Get messages
      messages = await Message.findAll({
        where: whereClause,
        order: [["timestamp", "DESC"]],
        limit: limitNum,
        attributes: [
          "id",
          "messageId",
          "fromNumber",
          "toNumber",
          "messageType",
          "content",
          "direction",
          "status",
          "timestamp",
          "metadata"
        ]
      });

      messages = messages.reverse(); // Reverse to get chronological order
    }

    // Format messages sesuai dokumentasi
    const formattedMessages = messages.map(msg => ({
      id: msg.messageId || msg.id,
      from: msg.direction === "incoming" ? msg.fromNumber : groupId,
      fromMe: msg.direction === "outgoing",
      messageType: msg.messageType || "conversation",
      content: typeof msg.content === "string" ? { text: msg.content } : msg.content,
      timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : null,
    }));

    const sourceMessage = messageSource === "whatsapp" 
      ? "Chat history grup berhasil diambil langsung dari WhatsApp"
      : "Chat history grup berhasil diambil dari store";

    const { response, statusCode } = successResponse({
      groupId: groupId,
      messages: formattedMessages,
      total: formattedMessages.length,
      hasMore: formattedMessages.length === limitNum,
    }, sourceMessage);

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get group chat history error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan chat history grup",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Get contacts list for device
 */
const getContacts = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Get contacts from WhatsApp service
    const contacts = await whatsappService.getContactsForDevice(deviceId);

    const { response, statusCode } = successResponse(
      {
        deviceId: deviceId,
        contacts: contacts,
        total: contacts.length,
      },
      null
    );

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get contacts error:", error);

    let statusCode = 500;
    let errorMessage = "Gagal mendapatkan daftar kontak";

    if (error.message === "WhatsApp session not found for device") {
      statusCode = 400;
      errorMessage = "Device tidak terkoneksi. Silakan koneksikan terlebih dahulu.";
    } else if (error.message === "WhatsApp not connected") {
      statusCode = 400;
      errorMessage = "Session device tidak aktif. Silakan koneksikan ulang.";
    }

    const { response, statusCode: errorStatusCode } = errorResponse(
      errorMessage,
      error.message,
      statusCode
    );
    res.status(errorStatusCode).json(response);
  }
};

/**
 * Get user's saved contacts (from database)
 * Supports filtering by tags and search
 */
const getUserContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tags, search, limit = 50, offset = 0 } = req.query;

    const whereClause = { userId };
    
    // Tag filtering (comma-separated)
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        whereClause[Op.and] = tagList.map(tag => ({
          tags: {
            [Op.like]: `%"${tag}"%`
          }
        }));
      }
    }
    
    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { phoneNumber: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows: contacts, count: total } = await Contact.findAndCountAll({
      where: whereClause,
      order: [["name", "ASC"]],
      limit: Math.min(parseInt(limit, 10), 100),
      offset: parseInt(offset, 10)
    });

    const { response, statusCode } = successResponse({
      contacts: contacts.map(c => ({
        id: c.id,
        phoneNumber: c.phoneNumber,
        name: c.name,
        email: c.email,
        tags: c.tags || [],
        notes: c.notes,
        isBlocked: c.isBlocked,
        lastMessageAt: c.lastMessageAt,
        profilePicture: c.profilePicture,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      })),
      total,
      limit: Math.min(parseInt(limit, 10), 100),
      offset: parseInt(offset, 10)
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get user contacts error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan daftar kontak",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Save/create a contact (from database)
 */
const saveContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phoneNumber, name, email, tags = [], notes } = req.body;

    if (!phoneNumber || !name) {
      const { response, statusCode } = errorResponse(
        "Phone number dan nama wajib diisi",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      const { response, statusCode } = errorResponse(
        "Format nomor telepon tidak valid",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    if (!Array.isArray(tags) || tags.length > 10) {
      const { response, statusCode } = errorResponse(
        "Tags harus berupa array (maksimal 10)",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    const sanitizedTags = tags
      .slice(0, 10)
      .map(t => String(t).trim().slice(0, 30))
      .filter(t => t.length > 0 && /^[\w\s-]+$/.test(t));

    const [contact, created] = await Contact.findOrCreate({
      where: { userId, phoneNumber: normalizedPhone },
      defaults: { name, email: email || null, tags: sanitizedTags, notes: notes || null }
    });

    if (!created) {
      await contact.update({ name, email: email || contact.email, tags: sanitizedTags, notes: notes || contact.notes });
    }

    const { response, statusCode } = successResponse(
      { id: contact.id, phoneNumber: contact.phoneNumber, name: contact.name, tags: contact.tags || [] },
      created ? "Kontak berhasil disimpan" : "Kontak berhasil diperbarui",
      created ? 201 : 200
    );
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Save contact error:", error);
    const { response, statusCode } = errorResponse("Gagal menyimpan kontak", error.message, 500);
    res.status(statusCode).json(response);
  }
};

/**
 * Update contact tags only
 */
const updateContactTags = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags) || tags.length > 10) {
      const { response, statusCode } = errorResponse("Tags harus berupa array (maksimal 10)", null, 400);
      return res.status(statusCode).json(response);
    }

    const contact = await Contact.findOne({ where: { id: contactId, userId } });
    if (!contact) {
      const { response, statusCode } = errorResponse("Kontak tidak ditemukan", null, 404);
      return res.status(statusCode).json(response);
    }

    const sanitizedTags = tags.slice(0, 10).map(t => String(t).trim().slice(0, 30)).filter(t => t.length > 0 && /^[\w\s-]+$/.test(t));
    await contact.update({ tags: sanitizedTags });

    const { response, statusCode } = successResponse(
      { id: contact.id, phoneNumber: contact.phoneNumber, name: contact.name, tags: contact.tags || [] },
      "Tags berhasil diperbarui"
    );
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Update contact tags error:", error);
    const { response, statusCode } = errorResponse("Gagal memperbarui tags", error.message, 500);
    res.status(statusCode).json(response);
  }
};

/**
 * Get unique tags for current user (for autocomplete)
 */
const getUserTags = async (req, res) => {
  try {
    const userId = req.user.id;
    const contacts = await Contact.findAll({ where: { userId }, attributes: ['tags'] });
    
    const tagSet = new Set();
    for (const contact of contacts) {
      if (Array.isArray(contact.tags)) {
        contact.tags.forEach(tag => tagSet.add(tag));
      }
    }

    const { response, statusCode } = successResponse({ tags: Array.from(tagSet).sort(), count: tagSet.size });
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get user tags error:", error);
    const { response, statusCode } = errorResponse("Gagal mendapatkan daftar tags", error.message, 500);
    res.status(statusCode).json(response);
  }
};

/**
 * Schedule a message
 */
const scheduleMessage = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { to, message, scheduleTime, timezone = "Asia/Jakarta" } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!to) {
      const { response, statusCode } = errorResponse(
        "Field 'to' wajib diisi",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    if (!message) {
      const { response, statusCode } = errorResponse(
        "Field 'message' wajib diisi",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    if (!scheduleTime) {
      const { response, statusCode } = errorResponse(
        "Field 'scheduleTime' wajib diisi",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Normalize phone number
    const cleanPhone = normalizePhoneNumber(to);
    if (!cleanPhone) {
      const { response, statusCode } = errorResponse(
        "Format nomor telepon tidak valid. Format: +62, 62, atau 0 diikuti 8-13 digit",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Parse schedule time
    const scheduleDate = new Date(scheduleTime);
    if (isNaN(scheduleDate.getTime())) {
      const { response, statusCode } = errorResponse(
        "Format scheduleTime tidak valid. Gunakan format ISO 8601 (YYYY-MM-DD HH:mm:ss atau YYYY-MM-DDTHH:mm:ss)",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Schedule message
    const scheduledMessageId = scheduledMessageService.scheduleMessage(
      deviceId,
      cleanPhone,
      message,
      scheduleDate,
      timezone
    );

    // Calculate delay in seconds
    const now = new Date();
    const delaySeconds = Math.floor((scheduleDate.getTime() - now.getTime()) / 1000);

    const { response, statusCode } = successResponse(
      {
        scheduledMessageId: scheduledMessageId,
        scheduleTime: scheduleDate.toISOString().replace('T', ' ').substring(0, 19),
        timezone: timezone,
        delaySeconds: delaySeconds,
      },
      "Pesan berhasil dijadwalkan"
    );

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Schedule message error:", error);

    let statusCode = 500;
    let errorMessage = "Gagal menjadwalkan pesan";

    if (error.message === "Schedule time must be in the future") {
      statusCode = 400;
      errorMessage = "Waktu penjadwalan harus di masa depan";
    }

    const { response, statusCode: errorStatusCode } = errorResponse(
      errorMessage,
      error.message,
      statusCode
    );
    res.status(errorStatusCode).json(response);
  }
};

/**
 * List scheduled messages
 */
const listScheduledMessages = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    const messages = await scheduledMessageService.listScheduledMessages(deviceId);

    const { response, statusCode } = successResponse({
      deviceId: deviceId,
      messages: messages,
      count: messages.length,
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("List scheduled messages error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan daftar pesan terjadwal",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * List ALL scheduled messages for current user (across all devices)
 * Supports filtering by status and search
 */
const listAllScheduledMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, search, limit = 50, offset = 0 } = req.query;

    const result = await scheduledMessageService.listScheduledMessagesForUser(userId, {
      status,
      search,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    const { response, statusCode } = successResponse({
      messages: result.messages,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("List all scheduled messages error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan daftar pesan terjadwal",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Cancel a scheduled message
 * Only pending messages can be cancelled
 * User can only cancel their own messages (ownership enforced)
 */
const cancelScheduledMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    if (!messageId) {
      const { response, statusCode } = errorResponse(
        "Message ID wajib diisi",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    const result = await scheduledMessageService.cancelScheduledMessageWithOwnership(
      messageId,
      userId
    );

    if (!result.success) {
      const { response, statusCode } = errorResponse(
        result.error,
        null,
        result.error.includes("not found") ? 404 : 400
      );
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse(
      { messageId, cancelled: true },
      "Pesan terjadwal berhasil dibatalkan"
    );

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Cancel scheduled message error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal membatalkan pesan terjadwal",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Get daily chat list (active chats for a specific date)
 */
const getDailyChatList = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { date, includeGroups = false, limit = 100, offset = 0 } = req.query;
    const userId = req.user.id;

    // Validate date is required
    if (!date) {
      const { response, statusCode } = errorResponse(
        "Parameter 'date' wajib diisi (format: YYYY-MM-DD)",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Validate limit
    const limitNum = parseInt(limit);
    if (limitNum < 1 || limitNum > 1000) {
      const { response, statusCode } = errorResponse(
        "Limit harus antara 1-1000",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      const { response, statusCode } = errorResponse(
        "Device tidak ditemukan",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      const { response, statusCode } = errorResponse(
        "Akses ditolak",
        null,
        403
      );
      return res.status(statusCode).json(response);
    }

    // Get session ID for device
    const session = await WhatsAppSession.findOne({
      where: { deviceId: deviceId, isActive: true },
      attributes: ["id"]
    });

    if (!session) {
      const { response, statusCode } = errorResponse(
        "Session tidak ditemukan untuk device",
        null,
        404
      );
      return res.status(statusCode).json(response);
    }

    // Parse date
    const targetDate = new Date(date + "T00:00:00");
    if (isNaN(targetDate.getTime())) {
      const { response, statusCode } = errorResponse(
        "Format tanggal tidak valid. Gunakan format YYYY-MM-DD",
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build where clause
    const whereClause = {
      sessionId: session.id,
      timestamp: {
        [Op.between]: [startOfDay, endOfDay]
      }
    };

    // Get all messages for the day
    const allMessages = await Message.findAll({
      where: whereClause,
      order: [["timestamp", "ASC"]],
      attributes: [
        "id",
        "fromNumber",
        "toNumber",
        "messageType",
        "content",
        "direction",
        "timestamp",
        "status"
      ]
    });

    // Group by contact (fromNumber or toNumber depending on direction)
    const contactMap = new Map();

    allMessages.forEach(msg => {
      let contactJid;
      let isGroup = false;

      // Determine contact JID
      if (msg.direction === "incoming") {
        contactJid = msg.fromNumber.includes("@g.us") ? msg.fromNumber : `${msg.fromNumber}@s.whatsapp.net`;
        isGroup = msg.fromNumber.includes("@g.us");
      } else {
        contactJid = msg.toNumber.includes("@g.us") ? msg.toNumber : `${msg.toNumber}@s.whatsapp.net`;
        isGroup = msg.toNumber.includes("@g.us");
      }

      // Skip groups if includeGroups is false
      if (!includeGroups && isGroup) {
        return;
      }

      if (!contactMap.has(contactJid)) {
        contactMap.set(contactJid, {
          jid: contactJid,
          phoneNumber: contactJid.replace("@s.whatsapp.net", "").replace("@g.us", ""),
          name: null, // TODO: Get from contacts
          messageCount: 0,
          incomingMessages: 0,
          outgoingMessages: 0,
          unreadMessages: 0, // TODO: Implement unread tracking
          lastActivity: null,
          messages: [],
        });
      }

      const contact = contactMap.get(contactJid);
      contact.messageCount++;
      
      if (msg.direction === "incoming") {
        contact.incomingMessages++;
      } else {
        contact.outgoingMessages++;
      }

      contact.messages.push(msg);

      // Update last activity
      if (!contact.lastActivity || msg.timestamp > contact.lastActivity) {
        contact.lastActivity = msg.timestamp;
      }
    });

    // Calculate response rate for each contact
    const contacts = Array.from(contactMap.values()).map(contact => {
      // Calculate response rate (percentage of incoming messages that have outgoing response)
      let responseRate = 0;
      if (contact.incomingMessages > 0) {
        // Simple calculation: if there are outgoing messages, assume some responses
        // More accurate would require tracking actual response pairs
        const responsePairs = Math.min(contact.incomingMessages, contact.outgoingMessages);
        responseRate = Math.round((responsePairs / contact.incomingMessages) * 100);
      }

      return {
        jid: contact.jid,
        name: contact.name || contact.phoneNumber,
        phoneNumber: contact.phoneNumber,
        messageCount: contact.messageCount,
        incomingMessages: contact.incomingMessages,
        outgoingMessages: contact.outgoingMessages,
        unreadMessages: contact.unreadMessages,
        lastActivity: contact.lastActivity ? new Date(contact.lastActivity).toISOString() : null,
        responseRate: responseRate,
      };
    });

    // Sort by last activity (most recent first)
    contacts.sort((a, b) => {
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return new Date(b.lastActivity) - new Date(a.lastActivity);
    });

    // Apply pagination
    const offsetNum = parseInt(offset) || 0;
    const paginatedContacts = contacts.slice(offsetNum, offsetNum + limitNum);

    // Calculate summary
    const summary = {
      date: date,
      totalContacts: contacts.length,
      individualContacts: contacts.filter(c => !c.jid.includes("@g.us")).length,
      groupContacts: contacts.filter(c => c.jid.includes("@g.us")).length,
      totalMessages: allMessages.length,
      totalIncomingMessages: contacts.reduce((sum, c) => sum + c.incomingMessages, 0),
      totalOutgoingMessages: contacts.reduce((sum, c) => sum + c.outgoingMessages, 0),
      totalUnreadMessages: contacts.reduce((sum, c) => sum + c.unreadMessages, 0),
      averageResponseRate: contacts.length > 0 
        ? Math.round(contacts.reduce((sum, c) => sum + c.responseRate, 0) / contacts.length)
        : 0,
    };

    // Pagination info
    const pagination = {
      total: contacts.length,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + limitNum < contacts.length,
    };

    const { response, statusCode } = successResponse({
      contacts: paginatedContacts,
      summary: summary,
      pagination: pagination,
    }, "Daftar chat harian berhasil diambil langsung dari WhatsApp");

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get daily chat list error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan daftar chat harian",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

/**
 * Get statistics for device
 */
const getStatistics = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Default to last 7 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const statistics = await statisticsService.getStatistics(
      deviceId,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );

    res.json({
      success: true,
      data: {
        statistics: statistics,
        count: statistics.length,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    logger.error("Get statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get statistics",
    });
  }
};

/**
 * Get daily activity for device
 */
const getDailyActivity = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { date } = req.query;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await deviceManager.getDevice(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    if (device.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const activity = await statisticsService.getDailyActivity(deviceId, date);

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    logger.error("Get daily activity error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get daily activity",
    });
  }
};

module.exports = {
  createDevice,
  listDevices,
  listConnectedDevices,
  getDevice,
  getDeviceStatus,
  connectDevice,
  disconnectDevice,
  deleteDevice,
  cancelAndWipeDevice,
  getQRCode,
  getQRCodeImage,
  generatePairingCode,
  sendMessage,
  sendMedia,
  createSendTextJob,
  createSendMediaJob,
  getJobStatus,
  cancelJob,
  listGroups,
  createGroup,
  getGroupInfo,
  sendGroupMessage,
  sendGroupMentionMessage,
  sendGroupMedia,
  createSendGroupMediaJob,
  inviteParticipants,
  kickParticipant,
  promoteAdmin,
  demoteAdmin,
  getChatHistory,
  getGroupChatHistory,
  getDailyChatList,
  getStatistics,
  getDailyActivity,
  getContacts,
  getUserContacts,
  saveContact,
  updateContactTags,
  getUserTags,
  scheduleMessage,
  listScheduledMessages,
  listAllScheduledMessages,
  cancelScheduledMessage,
};

// Maximum templates per user
const MAX_TEMPLATES_PER_USER = 50;

/**
 * Get all templates for current user
 */
const getTemplates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, search, archived = false } = req.query;

    const whereClause = { 
      userId,
      isArchived: archived === 'true' || archived === true
    };
    
    if (category) {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const templates = await MessageTemplate.findAll({
      where: whereClause,
      order: [["usageCount", "DESC"], ["updatedAt", "DESC"]],
      limit: MAX_TEMPLATES_PER_USER
    });

    const { response, statusCode } = successResponse({
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        content: t.content,
        variables: t.variables,
        category: t.category,
        usageCount: t.usageCount,
        isArchived: t.isArchived,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      })),
      count: templates.length
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get templates error:", error);
    const { response, statusCode } = errorResponse("Gagal mendapatkan daftar template", error.message, 500);
    res.status(statusCode).json(response);
  }
};

/**
 * Create a new template
 */
const createTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, content, category } = req.body;

    if (!name || !content) {
      const { response, statusCode } = errorResponse("Nama dan content wajib diisi", null, 400);
      return res.status(statusCode).json(response);
    }

    // Check template limit
    const count = await MessageTemplate.count({ where: { userId, isArchived: false } });
    if (count >= MAX_TEMPLATES_PER_USER) {
      const { response, statusCode } = errorResponse(
        `Maksimal ${MAX_TEMPLATES_PER_USER} template per user. Hapus template lama terlebih dahulu.`,
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Sanitize content (basic XSS prevention)
    const sanitizedContent = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .slice(0, 2000);

    const template = await MessageTemplate.create({
      userId,
      name: name.slice(0, 100),
      content: sanitizedContent,
      category: category ? category.slice(0, 50) : null
    });

    const { response, statusCode } = successResponse(
      {
        id: template.id,
        name: template.name,
        content: template.content,
        variables: template.variables,
        category: template.category
      },
      "Template berhasil dibuat",
      201
    );
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Create template error:", error);
    let message = "Gagal membuat template";
    if (error.name === 'SequelizeUniqueConstraintError') {
      message = "Template dengan nama tersebut sudah ada";
    }
    const { response, statusCode } = errorResponse(message, error.message, 400);
    res.status(statusCode).json(response);
  }
};

/**
 * Update a template
 */
const updateTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId } = req.params;
    const { name, content, category } = req.body;

    const template = await MessageTemplate.findOne({ where: { id: templateId, userId } });
    if (!template) {
      const { response, statusCode } = errorResponse("Template tidak ditemukan", null, 404);
      return res.status(statusCode).json(response);
    }

    const updates = {};
    if (name) updates.name = name.slice(0, 100);
    if (content) {
      updates.content = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .slice(0, 2000);
    }
    if (category !== undefined) updates.category = category ? category.slice(0, 50) : null;

    await template.update(updates);

    const { response, statusCode } = successResponse(
      { id: template.id, name: template.name, content: template.content, variables: template.variables },
      "Template berhasil diperbarui"
    );
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Update template error:", error);
    const { response, statusCode } = errorResponse("Gagal memperbarui template", error.message, 500);
    res.status(statusCode).json(response);
  }
};

/**
 * Delete (archive) a template
 */
const deleteTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId } = req.params;

    const template = await MessageTemplate.findOne({ where: { id: templateId, userId } });
    if (!template) {
      const { response, statusCode } = errorResponse("Template tidak ditemukan", null, 404);
      return res.status(statusCode).json(response);
    }

    // Soft delete (archive)
    await template.update({ isArchived: true });

    const { response, statusCode } = successResponse({ id: template.id }, "Template berhasil dihapus");
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Delete template error:", error);
    const { response, statusCode } = errorResponse("Gagal menghapus template", error.message, 500);
    res.status(statusCode).json(response);
  }
};

/**
 * Use a template (increment usage count and return rendered content)
 */
const useTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId } = req.params;
    const { variables = {} } = req.body;

    const template = await MessageTemplate.findOne({ where: { id: templateId, userId } });
    if (!template) {
      const { response, statusCode } = errorResponse("Template tidak ditemukan", null, 404);
      return res.status(statusCode).json(response);
    }

    // Replace variables in content
    let renderedContent = template.content;
    for (const [key, value] of Object.entries(variables)) {
      // Sanitize variable values (text only)
      const safeValue = String(value).replace(/<[^>]*>/g, '').slice(0, 200);
      renderedContent = renderedContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), safeValue);
    }

    // Increment usage count
    await template.increment('usageCount');

    const { response, statusCode } = successResponse({
      templateId: template.id,
      name: template.name,
      originalContent: template.content,
      renderedContent,
      variables: template.variables
    });
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Use template error:", error);
    const { response, statusCode } = errorResponse("Gagal menggunakan template", error.message, 500);
    res.status(statusCode).json(response);
  }
};

module.exports = {
  createDevice,
  listDevices,
  listConnectedDevices,
  getDevice,
  getDeviceStatus,
  connectDevice,
  disconnectDevice,
  deleteDevice,
  cancelAndWipeDevice,
  getQRCode,
  getQRCodeImage,
  generatePairingCode,
  sendMessage,
  sendMedia,
  createSendTextJob,
  createSendMediaJob,
  getJobStatus,
  cancelJob,
  listGroups,
  createGroup,
  getGroupInfo,
  sendGroupMessage,
  sendGroupMentionMessage,
  sendGroupMedia,
  createSendGroupMediaJob,
  inviteParticipants,
  kickParticipant,
  promoteAdmin,
  demoteAdmin,
  getChatHistory,
  getGroupChatHistory,
  getDailyChatList,
  getStatistics,
  getDailyActivity,
  getContacts,
  getUserContacts,
  saveContact,
  updateContactTags,
  getUserTags,
  scheduleMessage,
  listScheduledMessages,
  listAllScheduledMessages,
  cancelScheduledMessage,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  useTemplate,
};

/**
 * Get user-level usage statistics
 * Aggregates message data for the authenticated user
 */
const getUserStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'week' } = req.query; // today, week, month

    // Determine date range
    const now = new Date();
    let startDate;
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'week':
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get total messages in period
    const totalMessages = await Message.count({
      where: {
        userId,
        direction: 'outgoing',
        timestamp: { [Op.gte]: startDate }
      }
    });

    // Get messages by status
    const messagesByStatus = await Message.findAll({
      where: {
        userId,
        direction: 'outgoing',
        timestamp: { [Op.gte]: startDate }
      },
      attributes: [
        'status',
        [Message.sequelize.fn('COUNT', Message.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Calculate success rate
    const statusCounts = {};
    messagesByStatus.forEach(row => {
      statusCounts[row.status] = parseInt(row.count, 10);
    });
    
    const sent = (statusCounts.sent || 0) + (statusCounts.delivered || 0) + (statusCounts.read || 0);
    const failed = statusCounts.failed || 0;
    const successRate = totalMessages > 0 ? Math.round((sent / totalMessages) * 100) : 0;

    // Get active devices count
    const activeDevices = await WhatsAppSession.count({
      where: { userId, status: 'connected' }
    });

    // Get daily breakdown (last 7 days)
    const dailyBreakdown = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const count = await Message.count({
        where: {
          userId,
          direction: 'outgoing',
          timestamp: { [Op.gte]: dayStart, [Op.lt]: dayEnd }
        }
      });

      dailyBreakdown.push({
        date: dayStart.toISOString().split('T')[0],
        count
      });
    }

    // Get per-device stats
    const deviceStats = await Message.findAll({
      where: {
        userId,
        direction: 'outgoing',
        timestamp: { [Op.gte]: startDate }
      },
      include: [{
        model: WhatsAppSession,
        as: 'session',
        attributes: ['deviceId', 'deviceName']
      }],
      attributes: [
        'sessionId',
        [Message.sequelize.fn('COUNT', Message.sequelize.col('Message.id')), 'messageCount']
      ],
      group: ['sessionId', 'session.id'],
      raw: true
    });

    const { response, statusCode } = successResponse({
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      summary: {
        totalMessages,
        successRate,
        sent,
        failed,
        pending: statusCounts.pending || 0,
        activeDevices
      },
      dailyBreakdown,
      deviceStats: deviceStats.map(d => ({
        deviceId: d['session.deviceId'],
        deviceName: d['session.deviceName'],
        messageCount: parseInt(d.messageCount, 10)
      }))
    });

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error("Get user statistics error:", error);
    const { response, statusCode } = errorResponse(
      "Gagal mendapatkan statistik",
      error.message,
      500
    );
    res.status(statusCode).json(response);
  }
};

module.exports = {
  createDevice,
  listDevices,
  listConnectedDevices,
  getDevice,
  getDeviceStatus,
  connectDevice,
  disconnectDevice,
  deleteDevice,
  cancelAndWipeDevice,
  getQRCode,
  getQRCodeImage,
  generatePairingCode,
  sendMessage,
  sendMedia,
  createSendTextJob,
  createSendMediaJob,
  getJobStatus,
  cancelJob,
  listGroups,
  createGroup,
  getGroupInfo,
  sendGroupMessage,
  sendGroupMentionMessage,
  sendGroupMedia,
  createSendGroupMediaJob,
  inviteParticipants,
  kickParticipant,
  promoteAdmin,
  demoteAdmin,
  getChatHistory,
  getGroupChatHistory,
  getDailyChatList,
  getStatistics,
  getDailyActivity,
  getContacts,
  getUserContacts,
  saveContact,
  updateContactTags,
  getUserTags,
  scheduleMessage,
  listScheduledMessages,
  listAllScheduledMessages,
  cancelScheduledMessage,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  useTemplate,
  getUserStatistics,
};

