const logger = require("../utils/logger");
const whatsappService = require("./whatsappService");
const { ScheduledMessage, WhatsAppSession } = require("../models");
const { Op } = require("sequelize");

/**
 * Scheduled Message Service (Persistent)
 * 
 * Manages scheduled messages using setTimeout backed by Database
 */
class ScheduledMessageService {
  constructor() {
    // Keep in-memory map for active timeouts only
    this.activeTimeouts = new Map(); // scheduledMessageIdString -> timeout object
    this.isInitialized = false;
  }

  /**
   * Initialize service: Load pending messages from DB
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      logger.info("🔄 Initializing ScheduledMessageService...");
      
      const pendingMessages = await ScheduledMessage.findAll({
        where: { status: "pending" },
        include: [
          {
            model: WhatsAppSession,
            as: "session",
            attributes: ["deviceId"], // We need deviceId for execution
          }
        ]
      });

      logger.info(`📅 Found ${pendingMessages.length} pending scheduled messages in DB`);

      for (const msg of pendingMessages) {
        if (msg.session && msg.session.deviceId) {
          this.scheduleTimeout(msg, msg.session.deviceId);
        } else {
          logger.warn(`⚠️ Scheduled message ${msg.id} has no valid session/device, marking failed.`);
          msg.status = "failed";
          msg.errorMessage = "Device session not found on restart";
          await msg.save();
        }
      }

      this.isInitialized = true;
      logger.info("✅ ScheduledMessageService initialized successfully");
    } catch (error) {
      logger.error("❌ Failed to initialize ScheduledMessageService:", error);
    }
  }

  /**
   * Internal method to set the actual timeout
   */
  scheduleTimeout(scheduledMsg, deviceId) {
    const now = new Date();
    const scheduleDate = new Date(scheduledMsg.scheduleTime);
    const scheduledMessageId = scheduledMsg.scheduledMessageId;

    // Check if time has passed
    if (scheduleDate <= now) {
      const diffMs = now.getTime() - scheduleDate.getTime();
      
      // If within 1 hour, execute immediately
      if (diffMs < 60 * 60 * 1000) {
        logger.info(`⏰ Scheduled message ${scheduledMessageId} is past due (${diffMs}ms), executing immediately...`);
        this.executeMessage(scheduledMsg.id, deviceId, scheduledMsg.targetNumber, scheduledMsg.message);
      } else {
        // Too old, mark failed
        logger.warn(`⚠️ Scheduled message ${scheduledMessageId} is too old (>1h), marking failed.`);
        scheduledMsg.status = "failed";
        scheduledMsg.errorMessage = "Expired during server downtime";
        scheduledMsg.save();
      }
      return;
    }

    const delayMs = scheduleDate.getTime() - now.getTime();

    // Set timeout
    const timeout = setTimeout(() => {
      this.executeMessage(scheduledMsg.id, deviceId, scheduledMsg.targetNumber, scheduledMsg.message);
    }, delayMs);

    this.activeTimeouts.set(scheduledMessageId, timeout);
    logger.info(`📅 Re-scheduled ${scheduledMessageId} for ${scheduleDate.toISOString()}`);
  }

  async executeMessage(dbId, deviceId, phoneNumber, message) {
    let scheduledMsg;
    try {
      // Reload fresh record
      scheduledMsg = await ScheduledMessage.findByPk(dbId);
      if (!scheduledMsg || scheduledMsg.status !== "pending") return;

      logger.info(`⏰ Executing scheduled message ${scheduledMsg.scheduledMessageId} to ${phoneNumber}`);
      
      // Send message
      await whatsappService.sendMessageForDevice(deviceId, phoneNumber, message, "text");
      
      // Update DB
      scheduledMsg.status = "sent";
      await scheduledMsg.save();
      
      logger.info(`✅ Scheduled message ${scheduledMsg.scheduledMessageId} sent successfully`);
    } catch (error) {
      logger.error(`❌ Failed to execute scheduled message ${dbId}:`, error);
      
      if (scheduledMsg) {
        scheduledMsg.status = "failed";
        scheduledMsg.errorMessage = error.message;
        await scheduledMsg.save();
      }
    } finally {
      if (scheduledMsg) {
        this.activeTimeouts.delete(scheduledMsg.scheduledMessageId);
      }
    }
  }

  /**
   * Schedule a message
   */
  async scheduleMessage(deviceId, phoneNumber, message, scheduleTime, timezone = "Asia/Jakarta") {
    try {
      // 1. Resolve Device/Session
      const session = await WhatsAppSession.findOne({ where: { deviceId } });
      if (!session) {
        throw new Error("Device session not found");
      }

      // 2. Create DB Record
      const idStr = `sched_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      const newMsg = await ScheduledMessage.create({
        userId: session.userId,
        sessionId: session.id,
        scheduledMessageId: idStr,
        targetNumber: phoneNumber,
        message: message,
        scheduleTime: new Date(scheduleTime),
        timezone: timezone,
        status: "pending"
      });

      // 3. Schedule Timeout
      this.scheduleTimeout(newMsg, deviceId);

      return newMsg.scheduledMessageId;
    } catch (error) {
      logger.error("❌ Failed to schedule message:", error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(scheduledMessageId) { // Accepts ID string
    try {
      // Find in DB
      const msg = await ScheduledMessage.findOne({ where: { scheduledMessageId } });
      if (!msg) return false;

      // Clear timeout if active
      if (this.activeTimeouts.has(scheduledMessageId)) {
        clearTimeout(this.activeTimeouts.get(scheduledMessageId));
        this.activeTimeouts.delete(scheduledMessageId);
      }

      // Update DB
      msg.status = "cancelled";
      await msg.save();
      
      logger.info(`🚫 Cancelled scheduled message ${scheduledMessageId}`);
      return true;
    } catch (error) {
      logger.error("❌ Failed to cancel message:", error);
      return false;
    }
  }

  /**
   * Get scheduled message info
   */
  async getScheduledMessage(scheduledMessageId) {
    return await ScheduledMessage.findOne({ 
      where: { scheduledMessageId },
      include: ["session"] 
    });
  }

  /**
   * List all scheduled messages for a device
   * Supports filtering and history
   */
  async listScheduledMessages(deviceId = null) {
    try {
      const whereClause = {};
      
      if (deviceId) {
        // Need to find session ID first, or include session and filter
        const session = await WhatsAppSession.findOne({ where: { deviceId } });
        if (session) {
          whereClause.sessionId = session.id;
        } else {
          return []; // Device not found, no messages
        }
      }

      const messages = await ScheduledMessage.findAll({
        where: whereClause,
        order: [["scheduleTime", "DESC"]], // Newest first
        limit: 100 // Limit history
      });
      
      // Map to cleaner object if needed, or return DB instances
      // Providing backward compatibility structure if possible
      return messages.map(msg => ({
        id: msg.scheduledMessageId,
        deviceId: deviceId, // Might be approximate if listing all
        phoneNumber: msg.targetNumber,
        message: msg.message,
        scheduleTime: msg.scheduleTime,
        status: msg.status,
        timezone: msg.timezone,
        createdAt: msg.createdAt,
        error: msg.errorMessage
      }));
    } catch (error) {
      logger.error("Error listing scheduled messages:", error);
      throw error;
    }
  }

  /**
   * List all scheduled messages for a user (across all devices)
   * @param {number} userId - User ID from JWT
   * @param {object} options - Filter options
   * @param {string} options.status - Filter by status (pending, sent, failed, cancelled)
   * @param {string} options.search - Search in phone number or message content
   * @param {number} options.limit - Max number of results (default 50)
   * @param {number} options.offset - Pagination offset (default 0)
   */
  async listScheduledMessagesForUser(userId, options = {}) {
    try {
      const { status, search, limit = 50, offset = 0 } = options;
      
      const whereClause = { userId };
      
      // Filter by status if provided
      if (status && ["pending", "sent", "failed", "cancelled"].includes(status)) {
        whereClause.status = status;
      }
      
      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { targetNumber: { [Op.like]: `%${search}%` } },
          { message: { [Op.like]: `%${search}%` } }
        ];
      }

      const { rows: messages, count: total } = await ScheduledMessage.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: WhatsAppSession,
            as: "session",
            attributes: ["deviceId", "deviceName"],
          }
        ],
        order: [["scheduleTime", "DESC"]], // Newest first
        limit: Math.min(limit, 100), // Max 100
        offset: offset
      });
      
      return {
        messages: messages.map(msg => ({
          id: msg.scheduledMessageId,
          deviceId: msg.session?.deviceId || null,
          deviceName: msg.session?.deviceName || null,
          phoneNumber: msg.targetNumber,
          message: msg.message,
          scheduleTime: msg.scheduleTime,
          status: msg.status,
          timezone: msg.timezone,
          createdAt: msg.createdAt,
          error: msg.errorMessage
        })),
        total,
        limit: Math.min(limit, 100),
        offset
      };
    } catch (error) {
      logger.error("Error listing scheduled messages for user:", error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled message with ownership validation
   * @param {string} scheduledMessageId - The message ID to cancel
   * @param {number} userId - User ID for ownership validation
   * @returns {object} Result with success status and message
   */
  async cancelScheduledMessageWithOwnership(scheduledMessageId, userId) {
    try {
      // Find in DB with ownership check
      const msg = await ScheduledMessage.findOne({ 
        where: { 
          scheduledMessageId,
          userId // Ownership check
        } 
      });
      
      if (!msg) {
        return { success: false, error: "Message not found or access denied" };
      }

      // Can only cancel pending messages
      if (msg.status !== "pending") {
        return { 
          success: false, 
          error: `Cannot cancel message with status '${msg.status}'. Only pending messages can be cancelled.` 
        };
      }

      // Clear timeout if active
      if (this.activeTimeouts.has(scheduledMessageId)) {
        clearTimeout(this.activeTimeouts.get(scheduledMessageId));
        this.activeTimeouts.delete(scheduledMessageId);
      }

      // Update DB
      msg.status = "cancelled";
      await msg.save();
      
      logger.info(`🚫 Cancelled scheduled message ${scheduledMessageId} by user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error("❌ Failed to cancel message:", error);
      return { success: false, error: error.message };
    }
  }
}

const service = new ScheduledMessageService();

// Auto-initialize on import (or call explicitly in app.js)
setTimeout(() => service.initialize(), 5000); // Delay slightly to ensure DB connection

module.exports = service;
