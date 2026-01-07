/**
 * Device Bot Configuration Model
 * Stores per-device bot settings including business hours and handoff keywords
 */

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const DeviceBotConfig = sequelize.define(
  "DeviceBotConfig",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    deviceId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "device_id",
      comment: "Device ID this config belongs to",
    },
    botEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "bot_enabled",
      comment: "Whether bot is enabled for this device",
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "UTC",
      comment: "Timezone for business hours (e.g., Asia/Jakarta)",
    },
    businessHours: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "business_hours",
      comment: "Array of day schedules [{day: 1, start: '09:00', end: '17:00'}]",
    },
    offHoursMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "off_hours_message",
      comment: "Message to send outside business hours",
    },
    offHoursEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "off_hours_enabled",
      comment: "Whether to send off-hours message",
    },
    handoffKeywords: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ["agent", "human", "operator", "bantuan", "cs"],
      field: "handoff_keywords",
      comment: "Keywords that trigger human handoff",
    },
    resumeKeywords: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ["bot", "menu", "help", "mulai"],
      field: "resume_keywords",
      comment: "Keywords that resume bot after handoff",
    },
    welcomeMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "welcome_message",
      comment: "Optional welcome message for first contact",
    },
    handoffMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "Menghubungkan Anda dengan tim kami. Mohon tunggu.",
      field: "handoff_message",
      comment: "Message sent when initiating handoff",
    },
    resumeMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "Bot aktif kembali. Ketik 'menu' untuk melihat opsi.",
      field: "resume_message",
      comment: "Message sent when bot resumes from handoff",
    },
    ignoreGroups: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "ignore_groups",
      comment: "Whether to ignore group messages",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Additional configuration metadata",
    },
  },
  {
    tableName: "device_bot_configs",
    indexes: [
      {
        fields: ["device_id"],
        unique: true,
      },
      {
        fields: ["bot_enabled"],
      },
    ],
  }
);

module.exports = DeviceBotConfig;
