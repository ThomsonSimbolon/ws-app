/**
 * Bot Action Log Model
 * Audit log for all bot actions (auto-replies, handoffs, resumes)
 */

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const BotActionLog = sequelize.define(
  "BotActionLog",
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
    },
    senderJid: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "sender_jid",
      comment: "Sender WhatsApp JID",
    },
    actionType: {
      type: DataTypes.ENUM(
        "auto_reply",
        "handoff_initiated",
        "handoff_resumed",
        "off_hours_reply",
        "rate_limited",
        "rule_matched",
        "no_match"
      ),
      allowNull: false,
      field: "action_type",
    },
    ruleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "rule_id",
      comment: "ID of matched rule (if applicable)",
    },
    incomingMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "incoming_message",
      comment: "The message that triggered the action",
    },
    responseMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "response_message",
      comment: "The response sent (if any)",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Additional action metadata",
    },
  },
  {
    tableName: "bot_action_logs",
    indexes: [
      {
        fields: ["device_id"],
      },
      {
        fields: ["sender_jid"],
      },
      {
        fields: ["action_type"],
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["device_id", "created_at"],
        name: "idx_bot_action_logs_device_date",
      },
    ],
  }
);

module.exports = BotActionLog;
