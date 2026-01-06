const { User, WhatsAppSession, Message, Contact, Group, AdminActionLog } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

/**
 * Export Controller
 * Handles data export functionality for various entity types.
 */

/**
 * Export users data as JSON
 * GET /api/admin/export/users
 */
const exportUsers = async (req, res) => {
  try {
    const { format = 'json', includeInactive = 'true' } = req.query;

    const whereClause = {};
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ["id", "username", "email", "fullName", "role", "isActive", "lastLogin", "createdAt"],
      include: [
        {
          association: "whatsappSessions",
          attributes: ["id", "deviceId", "deviceName", "status", "isActive"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Format for export
    const exportData = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      deviceCount: user.whatsappSessions?.length || 0,
      connectedDevices: user.whatsappSessions?.filter(d => d.status === 'connected').length || 0,
    }));

    if (format === 'csv') {
      const csvContent = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=users_export_${Date.now()}.csv`);
      return res.send(csvContent);
    }

    res.json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        totalRecords: exportData.length,
        records: exportData,
      },
    });
  } catch (error) {
    logger.error("Export users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Export devices data as JSON
 * GET /api/admin/export/devices
 */
const exportDevices = async (req, res) => {
  try {
    const { format = 'json', status, includeInactive = 'true' } = req.query;

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    const devices = await WhatsAppSession.findAll({
      where: whereClause,
      attributes: ["id", "deviceId", "deviceName", "phoneNumber", "status", "isActive", "lastSeen", "createdAt"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const exportData = devices.map(device => ({
      id: device.id,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      phoneNumber: device.phoneNumber,
      status: device.status,
      isActive: device.isActive,
      lastSeen: device.lastSeen,
      createdAt: device.createdAt,
      ownerUsername: device.user?.username,
      ownerEmail: device.user?.email,
    }));

    if (format === 'csv') {
      const csvContent = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=devices_export_${Date.now()}.csv`);
      return res.send(csvContent);
    }

    res.json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        totalRecords: exportData.length,
        records: exportData,
      },
    });
  } catch (error) {
    logger.error("Export devices error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export devices",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Export messages data as JSON
 * GET /api/admin/export/messages
 */
const exportMessages = async (req, res) => {
  try {
    const { format = 'json', startDate, endDate, limit = 1000 } = req.query;

    const whereClause = {};
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp[Op.gte] = new Date(startDate);
      if (endDate) whereClause.timestamp[Op.lte] = new Date(endDate);
    }

    const messages = await Message.findAll({
      where: whereClause,
      attributes: ["id", "fromNumber", "toNumber", "messageType", "status", "direction", "timestamp", "createdAt"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username"],
        },
      ],
      order: [["timestamp", "DESC"]],
      limit: parseInt(limit),
    });

    const exportData = messages.map(msg => ({
      id: msg.id,
      fromNumber: msg.fromNumber,
      toNumber: msg.toNumber,
      messageType: msg.messageType,
      status: msg.status,
      direction: msg.direction,
      timestamp: msg.timestamp,
      createdAt: msg.createdAt,
      username: msg.user?.username,
    }));

    if (format === 'csv') {
      const csvContent = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=messages_export_${Date.now()}.csv`);
      return res.send(csvContent);
    }

    res.json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        totalRecords: exportData.length,
        records: exportData,
      },
    });
  } catch (error) {
    logger.error("Export messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export messages",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Export audit logs data as JSON
 * GET /api/admin/export/logs
 */
const exportLogs = async (req, res) => {
  try {
    const { format = 'json', startDate, endDate, limit = 1000 } = req.query;

    const whereClause = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const logs = await AdminActionLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "admin",
          attributes: ["id", "username", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    const exportData = logs.map(log => ({
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      adminUsername: log.admin?.username,
      adminEmail: log.admin?.email,
      ipAddress: log.ipAddress,
      details: JSON.stringify(log.details),
      createdAt: log.createdAt,
    }));

    if (format === 'csv') {
      const csvContent = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit_logs_export_${Date.now()}.csv`);
      return res.send(csvContent);
    }

    res.json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        totalRecords: exportData.length,
        records: exportData,
      },
    });
  } catch (error) {
    logger.error("Export logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export logs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Helper function to convert array of objects to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');
  
  const rows = data.map(item => {
    return headers.map(header => {
      let value = item[header];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma or quotes
        value = value.replace(/"/g, '""');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
      }
      return value;
    }).join(',');
  });

  return [headerRow, ...rows].join('\n');
}

module.exports = {
  exportUsers,
  exportDevices,
  exportMessages,
  exportLogs,
};
