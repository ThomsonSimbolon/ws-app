const logger = require("../utils/logger");
const whatsappService = require("./whatsappService");
const { normalizePhoneNumber } = require("../utils/validation");

/**
 * Scheduled Message Service
 * 
 * Manages scheduled messages using setTimeout
 * In production, consider using node-cron or a more robust scheduler
 */
class ScheduledMessageService {
  constructor() {
    // Store scheduled messages (in-memory)
    // In production, consider using database for persistence
    this.scheduledMessages = new Map(); // scheduledMessageId -> timeout object
    this.scheduledMessageCounter = 0;
  }

  /**
   * Generate unique scheduled message ID
   */
  generateScheduledMessageId() {
    this.scheduledMessageCounter++;
    return `sched_${Date.now()}_${this.scheduledMessageCounter}`;
  }

  /**
   * Schedule a message
   * @param {string} deviceId - Device ID
   * @param {string} phoneNumber - Phone number (normalized)
   * @param {string} message - Message text
   * @param {Date} scheduleTime - Schedule time
   * @param {string} timezone - Timezone (optional, for logging)
   * @returns {string} Scheduled message ID
   */
  scheduleMessage(deviceId, phoneNumber, message, scheduleTime, timezone = "Asia/Jakarta") {
    const scheduledMessageId = this.generateScheduledMessageId();
    const now = new Date();
    const scheduleDate = new Date(scheduleTime);

    // Validate schedule time
    if (scheduleDate <= now) {
      throw new Error("Schedule time must be in the future");
    }

    // Calculate delay in milliseconds
    const delayMs = scheduleDate.getTime() - now.getTime();

    // Create timeout
    const timeout = setTimeout(async () => {
      try {
        logger.info(`⏰ Executing scheduled message ${scheduledMessageId} to ${phoneNumber}`);
        
        // Send message
        await whatsappService.sendMessageForDevice(deviceId, phoneNumber, message, "text");
        
        logger.info(`✅ Scheduled message ${scheduledMessageId} sent successfully`);
        
        // Remove from map after execution
        this.scheduledMessages.delete(scheduledMessageId);
      } catch (error) {
        logger.error(`❌ Failed to execute scheduled message ${scheduledMessageId}:`, error);
        // Remove from map even on error
        this.scheduledMessages.delete(scheduledMessageId);
      }
    }, delayMs);

    // Store scheduled message info
    this.scheduledMessages.set(scheduledMessageId, {
      id: scheduledMessageId,
      deviceId,
      phoneNumber,
      message,
      scheduleTime: scheduleDate,
      timezone,
      delayMs,
      timeout,
      createdAt: now,
    });

    logger.info(`📅 Scheduled message ${scheduledMessageId} for ${scheduleDate.toISOString()} (${delayMs}ms delay)`);

    return scheduledMessageId;
  }

  /**
   * Cancel a scheduled message
   * @param {string} scheduledMessageId - Scheduled message ID
   * @returns {boolean} True if cancelled successfully
   */
  cancelScheduledMessage(scheduledMessageId) {
    const scheduled = this.scheduledMessages.get(scheduledMessageId);
    if (!scheduled) {
      return false;
    }

    // Clear timeout
    clearTimeout(scheduled.timeout);
    
    // Remove from map
    this.scheduledMessages.delete(scheduledMessageId);

    logger.info(`🚫 Cancelled scheduled message ${scheduledMessageId}`);
    return true;
  }

  /**
   * Get scheduled message info
   * @param {string} scheduledMessageId - Scheduled message ID
   * @returns {Object|null} Scheduled message info
   */
  getScheduledMessage(scheduledMessageId) {
    return this.scheduledMessages.get(scheduledMessageId) || null;
  }

  /**
   * List all scheduled messages
   * @param {string} deviceId - Optional device ID filter
   * @returns {Array} Array of scheduled messages
   */
  listScheduledMessages(deviceId = null) {
    const messages = Array.from(this.scheduledMessages.values());
    
    if (deviceId) {
      return messages.filter(msg => msg.deviceId === deviceId);
    }
    
    return messages;
  }
}

// Export singleton instance
module.exports = new ScheduledMessageService();

