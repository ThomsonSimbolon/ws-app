/**
 * Redis Configuration
 * Provides Redis client for conversation state management and caching
 */

const Redis = require("ioredis");
const logger = require("../utils/logger");

// Redis configuration from environment
const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true, // Don't connect immediately
};

let redisClient = null;
let isConnected = false;

/**
 * Get Redis client instance (singleton)
 * @returns {Redis|null} Redis client or null if unavailable
 */
function getRedisClient() {
  if (!redisClient) {
    try {
      redisClient = new Redis(redisConfig);

      redisClient.on("connect", () => {
        isConnected = true;
        logger.info("✅ Redis connected successfully");
      });

      redisClient.on("error", (error) => {
        isConnected = false;
        logger.warn("⚠️ Redis connection error:", error.message);
      });

      redisClient.on("close", () => {
        isConnected = false;
        logger.info("🔌 Redis connection closed");
      });
    } catch (error) {
      logger.error("❌ Failed to create Redis client:", error);
      return null;
    }
  }
  return redisClient;
}

/**
 * Check if Redis is available
 * @returns {boolean}
 */
function isRedisAvailable() {
  return isConnected && redisClient !== null;
}

/**
 * Connect to Redis (call during app startup)
 */
async function connectRedis() {
  try {
    const client = getRedisClient();
    if (client) {
      await client.connect();
      logger.info("✅ Redis connection established");
      return true;
    }
    return false;
  } catch (error) {
    logger.warn("⚠️ Redis not available, using fallback storage:", error.message);
    return false;
  }
}

/**
 * Disconnect from Redis (call during app shutdown)
 */
async function disconnectRedis() {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      isConnected = false;
      logger.info("🔌 Redis disconnected");
    }
  } catch (error) {
    logger.error("❌ Error disconnecting Redis:", error);
  }
}

module.exports = {
  getRedisClient,
  isRedisAvailable,
  connectRedis,
  disconnectRedis,
};
