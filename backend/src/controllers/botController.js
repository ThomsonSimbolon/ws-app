/**
 * Bot Controller
 * Handles API endpoints for bot configuration, rules, and handoffs
 */

const {
  AutoReplyRule,
  DeviceBotConfig,
  BotActionLog,
  WhatsAppSession,
} = require("../models");
const handoffService = require("../services/handoffService");
const conversationStateService = require("../services/conversationStateService");
const businessHoursService = require("../services/businessHoursService");
const autoReplyService = require("../services/autoReplyService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

// ==================== DEVICE BOT CONFIG ====================

/**
 * Get bot configuration for a device
 */
const getBotConfig = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Verify device ownership
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
    });

    if (!device) {
      return errorResponse(res, "Device not found", 404);
    }

    if (!isAdmin && device.userId !== userId) {
      return errorResponse(res, "Access denied", 403);
    }

    // Get or create config
    let config = await DeviceBotConfig.findOne({
      where: { deviceId },
    });

    if (!config) {
      // Return default config (not created yet)
      config = {
        deviceId,
        botEnabled: false,
        timezone: "Asia/Jakarta",
        businessHours: null,
        offHoursMessage: null,
        offHoursEnabled: false,
        handoffKeywords: ["agent", "human", "operator", "bantuan", "cs"],
        resumeKeywords: ["bot", "menu", "help", "mulai"],
        ignoreGroups: true,
      };
    }

    return successResponse(res, "Bot config retrieved", config);
  } catch (error) {
    logger.error("❌ Error getting bot config:", error);
    return errorResponse(res, "Failed to get bot config", 500);
  }
};

/**
 * Update bot configuration for a device
 */
const updateBotConfig = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Verify device ownership
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
    });

    if (!device) {
      return errorResponse(res, "Device not found", 404);
    }

    if (!isAdmin && device.userId !== userId) {
      return errorResponse(res, "Access denied", 403);
    }

    const {
      botEnabled,
      timezone,
      businessHours,
      offHoursMessage,
      offHoursEnabled,
      handoffKeywords,
      resumeKeywords,
      welcomeMessage,
      handoffMessage,
      resumeMessage,
      ignoreGroups,
    } = req.body;

    // Validate business hours if provided
    if (businessHours) {
      const validation = businessHoursService.validateBusinessHours(businessHours);
      if (!validation.valid) {
        return errorResponse(res, `Invalid business hours: ${validation.errors.join(", ")}`, 400);
      }
    }

    // Upsert config
    const [config, created] = await DeviceBotConfig.upsert({
      deviceId,
      botEnabled: botEnabled ?? false,
      timezone: timezone || "Asia/Jakarta",
      businessHours: businessHours || null,
      offHoursMessage: offHoursMessage || null,
      offHoursEnabled: offHoursEnabled ?? false,
      handoffKeywords: handoffKeywords || ["agent", "human", "operator", "bantuan", "cs"],
      resumeKeywords: resumeKeywords || ["bot", "menu", "help", "mulai"],
      welcomeMessage: welcomeMessage || null,
      handoffMessage: handoffMessage || "Menghubungkan Anda dengan tim kami. Mohon tunggu.",
      resumeMessage: resumeMessage || "Bot aktif kembali. Ketik 'menu' untuk melihat opsi.",
      ignoreGroups: ignoreGroups ?? true,
    });

    logger.info(`📝 Bot config ${created ? "created" : "updated"} for device ${deviceId}`);

    return successResponse(
      res,
      `Bot config ${created ? "created" : "updated"}`,
      config
    );
  } catch (error) {
    logger.error("❌ Error updating bot config:", error);
    return errorResponse(res, "Failed to update bot config", 500);
  }
};

// ==================== AUTO REPLY RULES ====================

/**
 * List all rules for a device
 */
const listRules = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Verify device ownership
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
    });

    if (!device) {
      return errorResponse(res, "Device not found", 404);
    }

    if (!isAdmin && device.userId !== userId) {
      return errorResponse(res, "Access denied", 403);
    }

    const rules = await AutoReplyRule.findAll({
      where: { deviceId },
      order: [["priority", "DESC"], ["createdAt", "DESC"]],
    });

    return successResponse(res, "Rules retrieved", rules);
  } catch (error) {
    logger.error("❌ Error listing rules:", error);
    return errorResponse(res, "Failed to list rules", 500);
  }
};

/**
 * Create a new auto-reply rule
 */
const createRule = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Verify device ownership
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
    });

    if (!device) {
      return errorResponse(res, "Device not found", 404);
    }

    if (!isAdmin && device.userId !== userId) {
      return errorResponse(res, "Access denied", 403);
    }

    const { name, trigger, matchType, response, priority, cooldownSeconds } = req.body;

    // Validate required fields
    if (!name || !trigger || !response) {
      return errorResponse(res, "Name, trigger, and response are required", 400);
    }

    // Validate match type
    const validMatchTypes = ["exact", "contains", "startsWith", "regex"];
    if (matchType && !validMatchTypes.includes(matchType)) {
      return errorResponse(res, `Invalid match type. Use: ${validMatchTypes.join(", ")}`, 400);
    }

    // Validate regex if match type is regex
    if (matchType === "regex") {
      const validation = autoReplyService.validateRegex(trigger);
      if (!validation.valid) {
        return errorResponse(res, `Invalid regex: ${validation.error}`, 400);
      }
    }

    const rule = await AutoReplyRule.create({
      deviceId,
      name,
      trigger,
      matchType: matchType || "contains",
      response,
      priority: priority ?? 0,
      cooldownSeconds: cooldownSeconds ?? 60,
      isActive: true,
    });

    logger.info(`📝 Rule created: "${name}" for device ${deviceId}`);

    return successResponse(res, "Rule created", rule, 201);
  } catch (error) {
    logger.error("❌ Error creating rule:", error);
    return errorResponse(res, "Failed to create rule", 500);
  }
};

/**
 * Update an auto-reply rule
 */
const updateRule = async (req, res) => {
  try {
    const { deviceId, ruleId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Verify device ownership
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
    });

    if (!device) {
      return errorResponse(res, "Device not found", 404);
    }

    if (!isAdmin && device.userId !== userId) {
      return errorResponse(res, "Access denied", 403);
    }

    const rule = await AutoReplyRule.findOne({
      where: { id: ruleId, deviceId },
    });

    if (!rule) {
      return errorResponse(res, "Rule not found", 404);
    }

    const { name, trigger, matchType, response, priority, cooldownSeconds, isActive } = req.body;

    // Validate regex if updating to regex type
    if (matchType === "regex" && trigger) {
      const validation = autoReplyService.validateRegex(trigger);
      if (!validation.valid) {
        return errorResponse(res, `Invalid regex: ${validation.error}`, 400);
      }
    }

    await rule.update({
      name: name ?? rule.name,
      trigger: trigger ?? rule.trigger,
      matchType: matchType ?? rule.matchType,
      response: response ?? rule.response,
      priority: priority ?? rule.priority,
      cooldownSeconds: cooldownSeconds ?? rule.cooldownSeconds,
      isActive: isActive ?? rule.isActive,
    });

    logger.info(`📝 Rule updated: "${rule.name}" (ID: ${ruleId})`);

    return successResponse(res, "Rule updated", rule);
  } catch (error) {
    logger.error("❌ Error updating rule:", error);
    return errorResponse(res, "Failed to update rule", 500);
  }
};

/**
 * Delete an auto-reply rule
 */
const deleteRule = async (req, res) => {
  try {
    const { deviceId, ruleId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Verify device ownership
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
    });

    if (!device) {
      return errorResponse(res, "Device not found", 404);
    }

    if (!isAdmin && device.userId !== userId) {
      return errorResponse(res, "Access denied", 403);
    }

    const rule = await AutoReplyRule.findOne({
      where: { id: ruleId, deviceId },
    });

    if (!rule) {
      return errorResponse(res, "Rule not found", 404);
    }

    await rule.destroy();

    logger.info(`🗑️ Rule deleted: ID ${ruleId} from device ${deviceId}`);

    return successResponse(res, "Rule deleted");
  } catch (error) {
    logger.error("❌ Error deleting rule:", error);
    return errorResponse(res, "Failed to delete rule", 500);
  }
};

// ==================== HANDOFFS ====================

/**
 * List active handoffs for a device
 */
const listHandoffs = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Verify device ownership
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
    });

    if (!device) {
      return errorResponse(res, "Device not found", 404);
    }

    if (!isAdmin && device.userId !== userId) {
      return errorResponse(res, "Access denied", 403);
    }

    const handoffs = await handoffService.getActiveHandoffs(deviceId);

    return successResponse(res, "Handoffs retrieved", {
      count: handoffs.length,
      handoffs,
    });
  } catch (error) {
    logger.error("❌ Error listing handoffs:", error);
    return errorResponse(res, "Failed to list handoffs", 500);
  }
};

/**
 * Resume bot for a specific sender (end handoff)
 */
const resumeHandoff = async (req, res) => {
  try {
    const { deviceId, senderJid } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Verify device ownership
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
    });

    if (!device) {
      return errorResponse(res, "Device not found", 404);
    }

    if (!isAdmin && device.userId !== userId) {
      return errorResponse(res, "Access denied", 403);
    }

    const result = await handoffService.resumeBot(deviceId, senderJid, "admin");

    if (result.success) {
      return successResponse(res, "Bot resumed for sender", {
        senderJid,
        resumeMessage: result.message,
      });
    } else {
      return errorResponse(res, "Failed to resume bot", 500);
    }
  } catch (error) {
    logger.error("❌ Error resuming handoff:", error);
    return errorResponse(res, "Failed to resume handoff", 500);
  }
};

// ==================== BOT LOGS ====================

/**
 * Get bot action logs for a device
 */
const getBotLogs = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Verify device ownership
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
    });

    if (!device) {
      return errorResponse(res, "Device not found", 404);
    }

    if (!isAdmin && device.userId !== userId) {
      return errorResponse(res, "Access denied", 403);
    }

    const { limit = 50, offset = 0, actionType } = req.query;

    const where = { deviceId };
    if (actionType) {
      where.actionType = actionType;
    }

    const logs = await BotActionLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return successResponse(res, "Logs retrieved", {
      total: logs.count,
      logs: logs.rows,
    });
  } catch (error) {
    logger.error("❌ Error getting bot logs:", error);
    return errorResponse(res, "Failed to get bot logs", 500);
  }
};

// ==================== STATS ====================

/**
 * Get bot statistics for a device
 */
const getBotStats = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Verify device ownership
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
    });

    if (!device) {
      return errorResponse(res, "Device not found", 404);
    }

    if (!isAdmin && device.userId !== userId) {
      return errorResponse(res, "Access denied", 403);
    }

    // Get conversation stats
    const conversationStats = await conversationStateService.getDeviceStats(deviceId);

    // Get rule count
    const ruleCount = await AutoReplyRule.count({
      where: { deviceId, isActive: true },
    });

    // Get config status
    const config = await DeviceBotConfig.findOne({
      where: { deviceId },
    });

    return successResponse(res, "Stats retrieved", {
      botEnabled: config?.botEnabled || false,
      activeRules: ruleCount,
      conversations: conversationStats,
    });
  } catch (error) {
    logger.error("❌ Error getting bot stats:", error);
    return errorResponse(res, "Failed to get bot stats", 500);
  }
};

module.exports = {
  // Config
  getBotConfig,
  updateBotConfig,
  // Rules
  listRules,
  createRule,
  updateRule,
  deleteRule,
  // Handoffs
  listHandoffs,
  resumeHandoff,
  // Logs
  getBotLogs,
  // Stats
  getBotStats,
};
