const { AdminActionLog, User } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

/**
 * Audit Controller
 * Handles retrieving and creating audit logs.
 */

/**
 * List audit logs (Admin only)
 * GET /api/admin/logs
 * 
 * Query params:
 * - page, limit: pagination
 * - adminId: filter by admin user ID
 * - action: filter by action type (e.g., 'create_user', 'delete_device')
 * - targetType: filter by target type (e.g., 'user', 'device', 'job')
 * - targetId: filter by specific target ID
 * - startDate, endDate: date range filter
 * - search: search in action, targetType, targetId, and details
 */
const listLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      adminId, 
      action, 
      targetType, 
      targetId,
      startDate, 
      endDate,
      search 
    } = req.query;
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

    if (targetId) {
      whereClause.targetId = targetId;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    // Search functionality - search across action, targetType, targetId
    if (search) {
      whereClause[Op.or] = [
        { action: { [Op.like]: `%${search}%` } },
        { targetType: { [Op.like]: `%${search}%` } },
        { targetId: { [Op.like]: `%${search}%` } },
      ];
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
 * Get distinct action types and target types for filter dropdowns
 * GET /api/admin/logs/filters
 */
const getLogFilters = async (req, res) => {
  try {
    const { sequelize } = require("../config/database");

    // Get distinct actions
    const actionsData = await AdminActionLog.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("action")), "action"]],
      raw: true,
    });
    const actions = actionsData.map(a => a.action).filter(Boolean);

    // Get distinct target types
    const targetTypesData = await AdminActionLog.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("target_type")), "targetType"]],
      raw: true,
    });
    const targetTypes = targetTypesData.map(t => t.targetType).filter(Boolean);

    // Get admins who have logs (split query to avoid DISTINCT + JOIN issues)
    const distinctAdminIdsData = await AdminActionLog.findAll({
      attributes: [[sequelize.fn("DISTINCT", sequelize.col("admin_id")), "adminId"]],
      raw: true,
    });
    
    const adminIds = distinctAdminIdsData.map(a => a.adminId).filter(Boolean);
    
    let admins = [];
    if (adminIds.length > 0) {
      admins = await User.findAll({
        where: {
          id: adminIds
        },
        attributes: ["id", "username", "fullName"],
        raw: true
      });
    }

    res.json({
      success: true,
      data: {
        actions,
        targetTypes,
        admins: admins.map(admin => ({
          id: admin.id,
          username: admin.username,
          fullName: admin.fullName,
        })),
      },
    });
  } catch (error) {
    logger.error("Get log filters error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get log filters",
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
  getLogFilters,
  logAction,
};

