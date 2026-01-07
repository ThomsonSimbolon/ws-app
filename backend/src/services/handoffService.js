/**
 * Handoff Service
 * Manages human handoff for conversations
 */

const conversationStateService = require("./conversationStateService");
const { DeviceBotConfig, BotActionLog } = require("../models");
const logger = require("../utils/logger");

/**
 * Detect if message indicates escalation intent
 * @param {string} deviceId - Device ID
 * @param {string} messageText - Incoming message text
 * @returns {Promise<boolean>}
 */
async function detectEscalation(deviceId, messageText) {
  try {
    const config = await DeviceBotConfig.findOne({
      where: { deviceId },
    });

    if (!config || !config.handoffKeywords) {
      return false;
    }

    const lowerMessage = messageText.toLowerCase().trim();
    
    for (const keyword of config.handoffKeywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        logger.info(`🔄 Escalation keyword detected: "${keyword}" in message`);
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error("❌ Error detecting escalation:", error);
    return false;
  }
}

/**
 * Detect if message indicates intent to resume bot
 * @param {string} deviceId - Device ID
 * @param {string} messageText - Incoming message text
 * @returns {Promise<boolean>}
 */
async function detectResumeIntent(deviceId, messageText) {
  try {
    const config = await DeviceBotConfig.findOne({
      where: { deviceId },
    });

    if (!config || !config.resumeKeywords) {
      return false;
    }

    const lowerMessage = messageText.toLowerCase().trim();
    
    for (const keyword of config.resumeKeywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        logger.info(`🔄 Resume keyword detected: "${keyword}" in message`);
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error("❌ Error detecting resume intent:", error);
    return false;
  }
}

/**
 * Initiate human handoff for a conversation
 * @param {string} deviceId - Device ID
 * @param {string} senderJid - Sender JID
 * @param {string} reason - Reason for handoff
 * @returns {Promise<{success: boolean, message: string|null}>}
 */
async function initiateHandoff(deviceId, senderJid, reason = "keyword") {
  try {
    // Set conversation state to HANDOFF
    await conversationStateService.setState(
      deviceId,
      senderJid,
      conversationStateService.ConversationStates.HANDOFF,
      {},
      reason
    );

    // Get handoff message from config
    const config = await DeviceBotConfig.findOne({
      where: { deviceId },
    });

    const handoffMessage = config?.handoffMessage || 
      "Menghubungkan Anda dengan tim kami. Mohon tunggu.";

    // Log the action
    await BotActionLog.create({
      deviceId,
      senderJid,
      actionType: "handoff_initiated",
      metadata: { reason },
    });

    logger.info(`🤝 Handoff initiated for ${senderJid} on device ${deviceId} (${reason})`);

    return { success: true, message: handoffMessage };
  } catch (error) {
    logger.error("❌ Error initiating handoff:", error);
    return { success: false, message: null };
  }
}

/**
 * Resume bot control for a conversation
 * @param {string} deviceId - Device ID
 * @param {string} senderJid - Sender JID
 * @param {string} resumedBy - Who resumed ('user' or 'admin')
 * @returns {Promise<{success: boolean, message: string|null}>}
 */
async function resumeBot(deviceId, senderJid, resumedBy = "admin") {
  try {
    // Set conversation state to IDLE
    await conversationStateService.setState(
      deviceId,
      senderJid,
      conversationStateService.ConversationStates.IDLE,
      {}
    );

    // Get resume message from config
    const config = await DeviceBotConfig.findOne({
      where: { deviceId },
    });

    const resumeMessage = config?.resumeMessage || 
      "Bot aktif kembali. Ketik 'menu' untuk melihat opsi.";

    // Log the action
    await BotActionLog.create({
      deviceId,
      senderJid,
      actionType: "handoff_resumed",
      metadata: { resumedBy },
    });

    logger.info(`🤖 Bot resumed for ${senderJid} on device ${deviceId} by ${resumedBy}`);

    return { success: true, message: resumeMessage };
  } catch (error) {
    logger.error("❌ Error resuming bot:", error);
    return { success: false, message: null };
  }
}

/**
 * Get all active handoffs for a device
 * @param {string} deviceId - Device ID
 * @returns {Promise<Array>}
 */
async function getActiveHandoffs(deviceId) {
  try {
    const handoffs = await conversationStateService.getActiveHandoffs(deviceId);
    
    // Enrich with additional info
    return handoffs.map((h) => ({
      senderJid: h.senderJid,
      phoneNumber: h.senderJid.split("@")[0],
      handoffAt: h.handoffAt,
      reason: h.handoffReason,
      lastActivity: h.lastActivity,
    }));
  } catch (error) {
    logger.error("❌ Error getting active handoffs:", error);
    return [];
  }
}

/**
 * Get handoff count for a device (for UI badge)
 * @param {string} deviceId - Device ID
 * @returns {Promise<number>}
 */
async function getHandoffCount(deviceId) {
  try {
    const stats = await conversationStateService.getDeviceStats(deviceId);
    return stats.handoff;
  } catch (error) {
    logger.error("❌ Error getting handoff count:", error);
    return 0;
  }
}

module.exports = {
  detectEscalation,
  detectResumeIntent,
  initiateHandoff,
  resumeBot,
  getActiveHandoffs,
  getHandoffCount,
};
