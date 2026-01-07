/**
 * Auto Reply Rule Model
 * Stores keyword-based auto-reply rules per device
 */

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const AutoReplyRule = sequelize.define(
  "AutoReplyRule",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    deviceId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "device_id",
      comment: "Device ID this rule belongs to",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "Human-readable rule name",
    },
    trigger: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: "Keyword or pattern to match",
    },
    matchType: {
      type: DataTypes.ENUM("exact", "contains", "startsWith", "regex"),
      allowNull: false,
      defaultValue: "contains",
      field: "match_type",
      comment: "How to match the trigger",
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Response message to send",
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Higher priority rules are checked first",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    cooldownSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      field: "cooldown_seconds",
      comment: "Minimum seconds between responses to same sender for this rule",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Additional rule metadata",
    },
  },
  {
    tableName: "auto_reply_rules",
    indexes: [
      {
        fields: ["device_id"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["priority"],
      },
      {
        fields: ["device_id", "is_active"],
        name: "idx_auto_reply_rules_device_active",
      },
    ],
  }
);

module.exports = AutoReplyRule;
