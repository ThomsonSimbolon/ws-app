/**
 * Auto Reply Service
 * Core service for processing incoming messages and executing auto-reply rules
 * 
 * Flow:
 * 1. Safety check (rate limit, loop prevention)
 * 2. Check conversation state (skip if HANDOFF)
 * 3. Check for resume keywords (if in HANDOFF)
 * 4. Check for escalation keywords
 * 5. Check business hours
 * 6. Match and execute rules
 */

const safetyGuard = require("./safetyGuard");
const conversationStateService = require("./conversationStateService");
const handoffService = require("./handoffService");
const businessHoursService = require("./businessHoursService");
const { AutoReplyRule, DeviceBotConfig, BotActionLog } = require("../models");
const logger = require("../utils/logger");

// Rule cooldowns per sender (deviceId:senderJid:ruleId → timestamp)
const ruleCooldowns = new Map();

/**
 * Process an incoming message for auto-reply
 * @param {string} deviceId - Device ID
 * @param {string} senderJid - Sender JID
 * @param {string} messageText - Message content
 * @param {string} messageId - Unique message ID
 * @param {Function} sendMessageFn - Function to send reply: (senderJid, message) => Promise
 * @returns {Promise<{processed: boolean, action: string|null}>}
 */
async function processIncoming(deviceId, senderJid, messageText, messageId, sendMessageFn) {
  const result = { processed: false, action: null };

  try {
    // 1. Get device bot config
    const config = await DeviceBotConfig.findOne({
      where: { deviceId },
    });

    // No config or bot disabled → skip silently
    if (!config || !config.botEnabled) {
      return result;
    }

    // 2. Safety check (rate limit, loop prevention, dedup)
    const safetyResult = safetyGuard.shouldProcess(
      deviceId,
      senderJid,
      messageId,
      false, // fromMe is false for incoming
      { ignoreGroups: config.ignoreGroups }
    );

    if (!safetyResult.allowed) {
      if (safetyResult.reason === "rate_limited") {
        await logAction(deviceId, senderJid, "rate_limited", null, messageText, null);
      }
      return { processed: false, action: safetyResult.reason };
    }

    // 3. Get current conversation state
    const state = await conversationStateService.getState(deviceId, senderJid);

    // 4. If in HANDOFF state, check for resume keywords
    if (state?.state === conversationStateService.ConversationStates.HANDOFF) {
      const wantsResume = await handoffService.detectResumeIntent(deviceId, messageText);
      
      if (wantsResume) {
        const resumeResult = await handoffService.resumeBot(deviceId, senderJid, "user");
        if (resumeResult.success && resumeResult.message) {
          await sendMessageFn(senderJid, resumeResult.message);
          safetyGuard.recordAutoReply(deviceId, senderJid);
        }
        return { processed: true, action: "resumed_by_user" };
      }

      // Still in handoff, skip bot processing
      return { processed: false, action: "in_handoff" };
    }

    // 5. Check for escalation keywords
    const wantsEscalation = await handoffService.detectEscalation(deviceId, messageText);
    if (wantsEscalation) {
      const handoffResult = await handoffService.initiateHandoff(
        deviceId,
        senderJid,
        "escalation_keyword"
      );
      if (handoffResult.success && handoffResult.message) {
        await sendMessageFn(senderJid, handoffResult.message);
        safetyGuard.recordAutoReply(deviceId, senderJid);
      }
      return { processed: true, action: "handoff_initiated" };
    }

    // 6. Check business hours
    const hoursCheck = await businessHoursService.checkBusinessHours(deviceId);
    if (!hoursCheck.isBusinessHours && hoursCheck.offHoursMessage) {
      await sendMessageFn(senderJid, hoursCheck.offHoursMessage);
      safetyGuard.recordAutoReply(deviceId, senderJid);
      await logAction(deviceId, senderJid, "off_hours_reply", null, messageText, hoursCheck.offHoursMessage);
      return { processed: true, action: "off_hours_reply" };
    }

    // 7. Match rules
    const matchedRule = await matchRules(deviceId, messageText, senderJid);
    
    if (matchedRule) {
      // Send response
      await sendMessageFn(senderJid, matchedRule.response);
      safetyGuard.recordAutoReply(deviceId, senderJid);

      // Update conversation state
      await conversationStateService.setState(
        deviceId,
        senderJid,
        conversationStateService.ConversationStates.ACTIVE_BOT,
        { lastMatchedRule: matchedRule.id }
      );

      // Record cooldown
      recordRuleCooldown(deviceId, senderJid, matchedRule.id);

      // Log action
      await logAction(
        deviceId,
        senderJid,
        "auto_reply",
        matchedRule.id,
        messageText,
        matchedRule.response
      );

      return { processed: true, action: "rule_matched" };
    }

    // No rule matched
    await logAction(deviceId, senderJid, "no_match", null, messageText, null);
    return { processed: false, action: "no_match" };

  } catch (error) {
    logger.error(`❌ Error processing auto-reply for device ${deviceId}:`, error);
    // Fail silently
    return result;
  }
}

/**
 * Match message against active rules for a device
 * @param {string} deviceId - Device ID
 * @param {string} messageText - Message to match
 * @param {string} senderJid - Sender JID (for cooldown check)
 * @returns {Promise<Object|null>} Matched rule or null
 */
async function matchRules(deviceId, messageText, senderJid) {
  try {
    // Get all active rules, sorted by priority (highest first)
    const rules = await AutoReplyRule.findAll({
      where: {
        deviceId,
        isActive: true,
      },
      order: [["priority", "DESC"]],
    });

    const lowerMessage = messageText.toLowerCase().trim();

    for (const rule of rules) {
      // Check cooldown
      if (isRuleOnCooldown(deviceId, senderJid, rule.id, rule.cooldownSeconds)) {
        continue;
      }

      // Match based on type
      const isMatch = matchRule(rule, lowerMessage, messageText);
      
      if (isMatch) {
        logger.info(`✅ Rule matched: "${rule.name}" (ID: ${rule.id}) for message: "${messageText.substring(0, 50)}..."`);
        return rule;
      }
    }

    return null;
  } catch (error) {
    logger.error("❌ Error matching rules:", error);
    return null;
  }
}

/**
 * Check if a single rule matches the message
 * @param {Object} rule - Rule object
 * @param {string} lowerMessage - Lowercase message
 * @param {string} originalMessage - Original message
 * @returns {boolean}
 */
function matchRule(rule, lowerMessage, originalMessage) {
  const trigger = rule.trigger.toLowerCase();

  switch (rule.matchType) {
    case "exact":
      return lowerMessage === trigger;

    case "contains":
      return lowerMessage.includes(trigger);

    case "startsWith":
      return lowerMessage.startsWith(trigger);

    case "regex":
      try {
        const regex = new RegExp(rule.trigger, "i");
        return regex.test(originalMessage);
      } catch (error) {
        logger.warn(`⚠️ Invalid regex in rule ${rule.id}: ${rule.trigger}`);
        return false;
      }

    default:
      return false;
  }
}

/**
 * Validate regex pattern (for rule creation)
 * @param {string} pattern - Regex pattern to validate
 * @returns {{valid: boolean, error: string|null}}
 */
function validateRegex(pattern) {
  try {
    // Check for ReDoS patterns (basic check)
    const dangerousPatterns = [
      /\(\?\=.*\)\*\+/, // Nested quantifiers
      /\(\.\*\)\+/,     // Greedy .* in repetition
      /\(\[.+\]\)\+\+/, // Character class with nested +
    ];

    for (const dangerous of dangerousPatterns) {
      if (dangerous.test(pattern)) {
        return { valid: false, error: "Pattern may cause performance issues" };
      }
    }

    // Try to compile
    new RegExp(pattern);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Check if rule is on cooldown for a sender
 */
function isRuleOnCooldown(deviceId, senderJid, ruleId, cooldownSeconds) {
  const key = `${deviceId}:${senderJid}:${ruleId}`;
  const lastUsed = ruleCooldowns.get(key);
  
  if (!lastUsed) return false;
  
  const elapsed = (Date.now() - lastUsed) / 1000;
  return elapsed < cooldownSeconds;
}

/**
 * Record rule usage for cooldown
 */
function recordRuleCooldown(deviceId, senderJid, ruleId) {
  const key = `${deviceId}:${senderJid}:${ruleId}`;
  ruleCooldowns.set(key, Date.now());
}

/**
 * Log bot action for audit
 */
async function logAction(deviceId, senderJid, actionType, ruleId, incomingMessage, responseMessage) {
  try {
    await BotActionLog.create({
      deviceId,
      senderJid,
      actionType,
      ruleId,
      incomingMessage: incomingMessage?.substring(0, 1000), // Truncate long messages
      responseMessage: responseMessage?.substring(0, 1000),
    });
  } catch (error) {
    logger.error("❌ Error logging bot action:", error);
  }
}

// Periodic cleanup for rule cooldowns
setInterval(() => {
  const now = Date.now();
  const maxCooldown = 3600000; // 1 hour max
  let cleaned = 0;
  
  for (const [key, timestamp] of ruleCooldowns.entries()) {
    if (now - timestamp > maxCooldown) {
      ruleCooldowns.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.debug(`🧹 Cleaned ${cleaned} expired rule cooldowns`);
  }
}, 300000); // Every 5 minutes

module.exports = {
  processIncoming,
  matchRules,
  matchRule,
  validateRegex,
};
