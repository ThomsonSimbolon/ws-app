const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const whatsappService = require("../services/whatsappService");
const logger = require("../utils/logger");

// SSE-specific token validation middleware
const validateSSEToken = (req, res, next) => {
  try {
    // Get token from query parameter (since EventSource can't send headers)
    const token = req.query.token;

    if (!token) {
      logger.warn(`❌ SSE: No token provided`);
      return res.status(401).json({
        success: false,
        message: "Token required for SSE connection",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      ...decoded,
      id: decoded.userId ?? decoded.id,
    };

    logger.info(`✅ SSE: Token validated for user ${req.user.id}`);
    next();
  } catch (error) {
    logger.error(`❌ SSE: Token validation failed:`, error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please refresh and try again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// SSE endpoint for real-time updates
// Security: Use req.user.id directly from JWT, ignore any URL parameters
router.get("/", validateSSEToken, async (req, res) => {
  try {
    // Use userId directly from JWT token (req.user.id)
    // This prevents parameter manipulation attacks
    const userId = req.user.id;
    const userRole = req.user.role;

    logger.info(
      `📡 SSE connection request for user ${userId} (role: ${userRole})`
    );

    // Set SSE headers with better caching and CORS handling
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "X-Accel-Buffering": "no", // Disable nginx buffering for SSE
    });

    // Add connection to WhatsApp service
    whatsappService.addSSEConnection(userId, res);
    logger.info(`✅ SSE connection added for user ${userId}`);

    // Send initial connection confirmation
    const initialMessage = {
      type: "connected",
      message: "SSE connection established successfully",
      timestamp: new Date().toISOString(),
      userId: userId,
    };

    res.write(`data: ${JSON.stringify(initialMessage)}\n\n`);

    // Send current WhatsApp status
    const currentStatus = await whatsappService.getSessionStatus(userId);
    logger.info(
      `📊 Sending current WhatsApp status to user ${userId}:`,
      currentStatus
    );

    const statusMessage = {
      type: "whatsapp-status",
      data: currentStatus,
      timestamp: new Date().toISOString(),
    };

    res.write(`data: ${JSON.stringify(statusMessage)}\n\n`);

    // Keep connection alive with periodic heartbeat (reduced frequency)
    const heartbeat = setInterval(() => {
      try {
        const heartbeatMessage = {
          type: "heartbeat",
          timestamp: new Date().toISOString(),
        };
        res.write(`data: ${JSON.stringify(heartbeatMessage)}\n\n`);
      } catch (error) {
        logger.error(`❌ SSE heartbeat error for user ${userId}:`, error);
        clearInterval(heartbeat);
        whatsappService.removeSSEConnection(userId, res);
      }
    }, 30000); // 30 seconds

    // Enhanced cleanup on client disconnect
    const cleanup = () => {
      clearInterval(heartbeat);
      whatsappService.removeSSEConnection(userId, res);
      logger.info(`🔌 SSE connection cleaned up for user ${userId}`);
    };

    req.on("close", () => {
      logger.info(`📡 SSE connection closed for user ${userId}`);
      cleanup();
    });

    req.on("aborted", () => {
      logger.info(`📡 SSE connection aborted for user ${userId}`);
      cleanup();
    });

    // Handle response errors
    res.on("error", (error) => {
      logger.error(`❌ SSE response error for user ${userId}:`, error);
      cleanup();
    });
  } catch (error) {
    logger.error(
      `❌ SSE connection error for user ${req.user?.id || "unknown"}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
