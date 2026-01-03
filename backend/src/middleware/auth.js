const { verifyToken } = require("../utils/jwt");
const { User } = require("../models");
const logger = require("../utils/logger");

const authenticateToken = async (req, res, next) => {
  try {
    let token;

    // Try to get token from Authorization header first
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // If no token in header, try query parameter (for SSE)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const decoded = verifyToken(token);

    // Find user in database
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found",
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error("Authentication error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = authenticateToken;
