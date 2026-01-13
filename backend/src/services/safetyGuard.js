/**
 * Safety Guard Service
 * Provides anti-abuse and loop prevention mechanisms for WhatsApp Bot
 * 
 * Features:
 * - Loop prevention (never reply to own messages)
 * - Rate limiting per sender (5 replies/minute default)
 * - Message deduplication
 * - Bot ignore list (status broadcasts, groups, known bots)
 * - Fail-silent operation
 */

const logger = require("../utils/logger");

class SafetyGuard {
  constructor() {
    // Track recent messages for deduplication (messageId → timestamp)
    this.recentMessages = new Map();

    // Track sender rate limits (deviceId:jid → [timestamps])
    this.senderRateLimits = new Map();

    // Configuration
    // Parse env vars with safety defaults
    const envRateLimit = parseInt(process.env.BOT_RATE_LIMIT_PER_MINUTE);
    const envWindowSec = parseInt(process.env.BOT_RATE_LIMIT_WINDOW_SEC);

    // Validate: Min 1 message, Default 5
    const maxMessages = (!isNaN(envRateLimit) && envRateLimit >= 1) ? envRateLimit : 5;
    
    // Validate: Min 10 seconds, Default 60
    const windowSec = (!isNaN(envWindowSec) && envWindowSec >= 10) ? envWindowSec : 60;

    this.config = {
      rateLimitWindow: windowSec * 1000, 
      maxMessagesPerWindow: maxMessages, 
      messageDeduplicationTTL: 300000, // 5 minutes
      cleanupInterval: 60000, // Cleanup every minute
    };

    logger.info(`🛡️ SafetyGuard Configured: ${maxMessages} msgs / ${windowSec} sec`);

    // Ignore list patterns
    this.ignorePatterns = [
      "status@broadcast", // WhatsApp status/stories
      "@broadcast", // Broadcast lists
      "@g.us", // Groups (optional, can be configured per device)
    ];

    // Known bot JIDs to never respond to
    this.knownBotJids = new Set();

    // Start cleanup interval
    this._startCleanupInterval();

    logger.info("🛡️ SafetyGuard initialized");
  }

  /**
   * Check if message should be processed by bot
   * @param {string} deviceId - Device ID
   * @param {string} senderJid - Sender JID (phone@s.whatsapp.net)
   * @param {string} messageId - Unique message ID
   * @param {boolean} fromMe - Whether message is from our own number
   * @param {Object} options - Additional options
   * @returns {{allowed: boolean, reason: string|null}}
   */
  shouldProcess(deviceId, senderJid, messageId, fromMe, options = {}) {
    try {
      // 1. CRITICAL: Never process own messages (prevents infinite loops)
      if (fromMe) {
        return { allowed: false, reason: "own_message" };
      }

      // 2. Check ignore patterns (status broadcasts, etc.)
      if (this._matchesIgnorePattern(senderJid, options)) {
        return { allowed: false, reason: "ignore_pattern" };
      }

      // 3. Check known bot JIDs
      if (this.knownBotJids.has(senderJid)) {
        return { allowed: false, reason: "known_bot" };
      }

      // 4. Check message deduplication
      if (this._isDuplicate(messageId)) {
        return { allowed: false, reason: "duplicate" };
      }

      // 5. Check rate limit
      if (this._isRateLimited(deviceId, senderJid)) {
        return { allowed: false, reason: "rate_limited" };
      }

      // All checks passed
      this._recordMessage(deviceId, senderJid, messageId);
      return { allowed: true, reason: null };
    } catch (error) {
      // Fail-silent: if safety check fails, don't process (safe default)
      logger.error("❌ SafetyGuard error:", error);
      return { allowed: false, reason: "error" };
    }
  }

  /**
   * Record a sent auto-reply (for rate limiting)
   * @param {string} deviceId - Device ID
   * @param {string} senderJid - Sender JID
   */
  recordAutoReply(deviceId, senderJid) {
    const key = `${deviceId}:${senderJid}`;
    const now = Date.now();
    const timestamps = this.senderRateLimits.get(key) || [];
    timestamps.push(now);
    this.senderRateLimits.set(key, timestamps);
  }

  /**
   * Add JID to known bot list
   * @param {string} jid - JID to ignore
   */
  addKnownBot(jid) {
    this.knownBotJids.add(jid);
    logger.info(`🤖 Added known bot to ignore list: ${jid}`);
  }

  /**
   * Remove JID from known bot list
   * @param {string} jid - JID to remove
   */
  removeKnownBot(jid) {
    this.knownBotJids.delete(jid);
    logger.info(`🤖 Removed from known bot list: ${jid}`);
  }

  /**
   * Get current rate limit status for sender
   * @param {string} deviceId - Device ID
   * @param {string} senderJid - Sender JID
   * @returns {{count: number, remaining: number, resetIn: number}}
   */
  getRateLimitStatus(deviceId, senderJid) {
    const key = `${deviceId}:${senderJid}`;
    const now = Date.now();
    const window = this.config.rateLimitWindow;
    
    let timestamps = this.senderRateLimits.get(key) || [];
    timestamps = timestamps.filter((t) => now - t < window);

    const count = timestamps.length;
    const remaining = Math.max(0, this.config.maxMessagesPerWindow - count);
    const oldestInWindow = timestamps[0] || now;
    const resetIn = Math.max(0, window - (now - oldestInWindow));

    return { count, remaining, resetIn };
  }

  /**
   * Check if sender JID matches ignore patterns
   * @private
   */
  _matchesIgnorePattern(senderJid, options = {}) {
    // Always ignore status broadcasts
    if (senderJid === "status@broadcast") return true;

    // Check if group should be ignored (configurable per device)
    if (senderJid.endsWith("@g.us") && options.ignoreGroups !== false) {
      return true;
    }

    // Check other patterns
    for (const pattern of this.ignorePatterns) {
      if (senderJid.includes(pattern)) return true;
    }

    return false;
  }

  /**
   * Check if message is duplicate
   * @private
   */
  _isDuplicate(messageId) {
    if (this.recentMessages.has(messageId)) {
      return true;
    }
    return false;
  }

  /**
   * Check if sender is rate limited
   * @private
   */
  _isRateLimited(deviceId, senderJid) {
    const key = `${deviceId}:${senderJid}`;
    const now = Date.now();
    const window = this.config.rateLimitWindow;
    const maxMessages = this.config.maxMessagesPerWindow;

    let timestamps = this.senderRateLimits.get(key) || [];
    timestamps = timestamps.filter((t) => now - t < window);

    if (timestamps.length >= maxMessages) {
      logger.debug(`⚠️ Rate limit reached for ${senderJid} on device ${deviceId}`);
      return true;
    }

    return false;
  }

  /**
   * Record message for deduplication and rate limiting
   * @private
   */
  _recordMessage(deviceId, senderJid, messageId) {
    // Record for deduplication
    this.recentMessages.set(messageId, Date.now());
  }

  /**
   * Start periodic cleanup of expired entries
   * @private
   */
  _startCleanupInterval() {
    setInterval(() => {
      this._cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   * @private
   */
  _cleanup() {
    const now = Date.now();
    let cleanedMessages = 0;
    let cleanedRateLimits = 0;

    // Cleanup old messages
    for (const [messageId, timestamp] of this.recentMessages.entries()) {
      if (now - timestamp > this.config.messageDeduplicationTTL) {
        this.recentMessages.delete(messageId);
        cleanedMessages++;
      }
    }

    // Cleanup expired rate limit entries
    for (const [key, timestamps] of this.senderRateLimits.entries()) {
      const validTimestamps = timestamps.filter(
        (t) => now - t < this.config.rateLimitWindow
      );
      if (validTimestamps.length === 0) {
        this.senderRateLimits.delete(key);
        cleanedRateLimits++;
      } else if (validTimestamps.length !== timestamps.length) {
        this.senderRateLimits.set(key, validTimestamps);
      }
    }

    if (cleanedMessages > 0 || cleanedRateLimits > 0) {
      logger.debug(
        `🧹 SafetyGuard cleanup: ${cleanedMessages} messages, ${cleanedRateLimits} rate limits`
      );
    }
  }

  /**
   * Get statistics for monitoring
   * @returns {Object}
   */
  getStats() {
    return {
      trackedMessages: this.recentMessages.size,
      trackedSenders: this.senderRateLimits.size,
      knownBots: this.knownBotJids.size,
      config: this.config,
    };
  }
}

// Singleton instance
const safetyGuard = new SafetyGuard();

module.exports = safetyGuard;
