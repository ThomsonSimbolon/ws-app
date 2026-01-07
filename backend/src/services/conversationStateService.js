/**
 * Conversation State Service
 * Manages per-device, per-sender conversation states with Redis primary storage
 * 
 * States:
 * - IDLE: No active conversation, bot will respond to triggers
 * - ACTIVE_BOT: Bot is actively handling conversation
 * - HANDOFF: Human operator is handling, bot paused
 * 
 * Redis Key Structure:
 * - conv:{deviceId}:{senderJid} → JSON state object
 * - TTL: 24 hours (auto-expires inactive conversations)
 */

const { getRedisClient, isRedisAvailable } = require("../config/redis");
const logger = require("../utils/logger");

// Conversation states
const ConversationStates = {
  IDLE: "IDLE",
  ACTIVE_BOT: "ACTIVE_BOT",
  HANDOFF: "HANDOFF",
};

// Configuration
const config = {
  keyPrefix: "conv:",
  defaultTTL: 86400, // 24 hours in seconds
  handoffTTL: 172800, // 48 hours for handoff states
};

// In-memory fallback storage (when Redis unavailable)
const fallbackStorage = new Map();
const fallbackTimestamps = new Map();

/**
 * Generate Redis key for conversation state
 * @param {string} deviceId
 * @param {string} senderJid
 * @returns {string}
 */
function getKey(deviceId, senderJid) {
  return `${config.keyPrefix}${deviceId}:${senderJid}`;
}

/**
 * Get conversation state for a sender on a device
 * @param {string} deviceId - Device ID
 * @param {string} senderJid - Sender JID
 * @returns {Promise<Object|null>} State object or null if not found
 */
async function getState(deviceId, senderJid) {
  try {
    const key = getKey(deviceId, senderJid);

    // Try Redis first
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      const data = await redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    }

    // Fallback to in-memory
    return _getFallbackState(key);
  } catch (error) {
    logger.error("❌ Error getting conversation state:", error);
    return null;
  }
}

/**
 * Set conversation state for a sender on a device
 * @param {string} deviceId - Device ID
 * @param {string} senderJid - Sender JID
 * @param {string} state - State (IDLE, ACTIVE_BOT, HANDOFF)
 * @param {Object} context - Additional context data
 * @param {string} handoffReason - Reason for handoff (if applicable)
 * @returns {Promise<boolean>} Success status
 */
async function setState(deviceId, senderJid, state, context = {}, handoffReason = null) {
  try {
    const key = getKey(deviceId, senderJid);
    const now = new Date().toISOString();

    const stateObject = {
      deviceId,
      senderJid,
      state,
      context,
      lastActivity: now,
      handoffReason: state === ConversationStates.HANDOFF ? handoffReason : null,
      handoffAt: state === ConversationStates.HANDOFF ? now : null,
      createdAt: now,
    };

    // Determine TTL based on state
    const ttl = state === ConversationStates.HANDOFF 
      ? config.handoffTTL 
      : config.defaultTTL;

    // Try Redis first
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      await redis.setex(key, ttl, JSON.stringify(stateObject));
      logger.debug(`💾 State saved to Redis: ${key} = ${state}`);
      return true;
    }

    // Fallback to in-memory
    return _setFallbackState(key, stateObject, ttl);
  } catch (error) {
    logger.error("❌ Error setting conversation state:", error);
    return false;
  }
}

/**
 * Update conversation context without changing state
 * @param {string} deviceId - Device ID
 * @param {string} senderJid - Sender JID
 * @param {Object} contextUpdate - Context updates to merge
 * @returns {Promise<boolean>}
 */
async function updateContext(deviceId, senderJid, contextUpdate) {
  try {
    const currentState = await getState(deviceId, senderJid);
    if (!currentState) return false;

    const newContext = { ...currentState.context, ...contextUpdate };
    return await setState(
      deviceId, 
      senderJid, 
      currentState.state, 
      newContext,
      currentState.handoffReason
    );
  } catch (error) {
    logger.error("❌ Error updating conversation context:", error);
    return false;
  }
}

/**
 * Clear conversation state (reset to IDLE)
 * @param {string} deviceId - Device ID
 * @param {string} senderJid - Sender JID
 * @returns {Promise<boolean>}
 */
async function clearState(deviceId, senderJid) {
  try {
    const key = getKey(deviceId, senderJid);

    if (isRedisAvailable()) {
      const redis = getRedisClient();
      await redis.del(key);
      logger.debug(`🗑️ State cleared from Redis: ${key}`);
      return true;
    }

    // Fallback
    fallbackStorage.delete(key);
    fallbackTimestamps.delete(key);
    return true;
  } catch (error) {
    logger.error("❌ Error clearing conversation state:", error);
    return false;
  }
}

/**
 * Get all active handoffs for a device
 * @param {string} deviceId - Device ID
 * @returns {Promise<Array>} List of handoff states
 */
async function getActiveHandoffs(deviceId) {
  try {
    const handoffs = [];
    const pattern = `${config.keyPrefix}${deviceId}:*`;

    if (isRedisAvailable()) {
      const redis = getRedisClient();
      const keys = await redis.keys(pattern);

      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const state = JSON.parse(data);
          if (state.state === ConversationStates.HANDOFF) {
            handoffs.push(state);
          }
        }
      }
    } else {
      // Fallback to in-memory
      for (const [key, state] of fallbackStorage.entries()) {
        if (key.startsWith(`${config.keyPrefix}${deviceId}:`) && 
            state.state === ConversationStates.HANDOFF) {
          handoffs.push(state);
        }
      }
    }

    return handoffs;
  } catch (error) {
    logger.error("❌ Error getting active handoffs:", error);
    return [];
  }
}

/**
 * Get conversation statistics for a device
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>}
 */
async function getDeviceStats(deviceId) {
  try {
    const pattern = `${config.keyPrefix}${deviceId}:*`;
    const stats = {
      total: 0,
      idle: 0,
      activeBot: 0,
      handoff: 0,
    };

    if (isRedisAvailable()) {
      const redis = getRedisClient();
      const keys = await redis.keys(pattern);
      stats.total = keys.length;

      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const state = JSON.parse(data);
          switch (state.state) {
            case ConversationStates.IDLE:
              stats.idle++;
              break;
            case ConversationStates.ACTIVE_BOT:
              stats.activeBot++;
              break;
            case ConversationStates.HANDOFF:
              stats.handoff++;
              break;
          }
        }
      }
    } else {
      // Fallback
      for (const [key, state] of fallbackStorage.entries()) {
        if (key.startsWith(`${config.keyPrefix}${deviceId}:`)) {
          stats.total++;
          switch (state.state) {
            case ConversationStates.IDLE:
              stats.idle++;
              break;
            case ConversationStates.ACTIVE_BOT:
              stats.activeBot++;
              break;
            case ConversationStates.HANDOFF:
              stats.handoff++;
              break;
          }
        }
      }
    }

    return stats;
  } catch (error) {
    logger.error("❌ Error getting device stats:", error);
    return { total: 0, idle: 0, activeBot: 0, handoff: 0 };
  }
}

// ============== Fallback Storage Helpers ==============

function _getFallbackState(key) {
  const expiresAt = fallbackTimestamps.get(key);
  if (expiresAt && Date.now() > expiresAt) {
    fallbackStorage.delete(key);
    fallbackTimestamps.delete(key);
    return null;
  }
  return fallbackStorage.get(key) || null;
}

function _setFallbackState(key, stateObject, ttlSeconds) {
  fallbackStorage.set(key, stateObject);
  fallbackTimestamps.set(key, Date.now() + ttlSeconds * 1000);
  logger.debug(`💾 State saved to fallback storage: ${key}`);
  return true;
}

// Periodic cleanup for fallback storage
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, expiresAt] of fallbackTimestamps.entries()) {
    if (now > expiresAt) {
      fallbackStorage.delete(key);
      fallbackTimestamps.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug(`🧹 Cleaned ${cleaned} expired fallback states`);
  }
}, 60000); // Every minute

module.exports = {
  ConversationStates,
  getState,
  setState,
  updateContext,
  clearState,
  getActiveHandoffs,
  getDeviceStats,
};
