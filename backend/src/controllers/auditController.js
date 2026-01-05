const { AdminActionLog, User } = require("../models");
const logger = require("../utils/logger");

/**
 * Audit Controller
 * Handles retrieving and creating audit logs.
 */

/**
 * List audit logs (Admin only)
 * GET /api/admin/logs
 */
const listLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, adminId, action, targetType, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (adminId) {
      whereClause.adminId = parseInt(adminId);
    }

    if (action) {
      whereClause.action = action;
    }

    if (targetType) {
      whereClause.targetType = targetType;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[require("sequelize").Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[require("sequelize").Op.lte] = new Date(endDate);
      }
    }

    const { count, rows: logs } = await AdminActionLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "admin",
          attributes: ["id", "username", "email", "fullName"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        logs: logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalLogs: count,
          hasNext: offset + logs.length < count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Admin list logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list logs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Internal helper to log an action
 * @param {Object} params
 * @param {number} params.adminId
 * @param {string} params.action
 * @param {string} [params.targetType]
 * @param {string|number} [params.targetId]
 * @param {Object} [params.details]
 * @param {Object} [req] - Express request object to extract IP/UA
 */
const logAction = async ({ adminId, action, targetType, targetId, details }, req = null) => {
  try {
    const logData = {
      adminId,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      details,
    };

    if (req) {
      logData.ipAddress = req.ip || req.connection.remoteAddress;
      logData.userAgent = req.get("User-Agent");
    }

    await AdminActionLog.create(logData);
    logger.info(`Audit Log: Admin ${adminId} performed ${action} on ${targetType}:${targetId}`);
  } catch (error) {
    logger.error("Failed to create audit log:", error);
    // Don't throw, we don't want to break the main flow if logging fails
  }
};

module.exports = {
  listLogs,
  logAction,
};
