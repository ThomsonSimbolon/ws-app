const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ScheduledMessage = sequelize.define(
  "ScheduledMessage",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    // We store deviceId string directly or sessionId? 
    // WhatsAppSession usually has deviceId. 
    // Let's store sessionId FK for consistency with Message model.
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Must allow NULL for ON DELETE SET NULL
      field: "session_id",
      references: {
        model: "whatsapp_sessions",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    // Store deviceId string as well for quick lookups if needed, 
    // or just rely on join. Message model doesn't store deviceId string.
    // However, ScheduledMessageService uses deviceId string heavily.
    // Let's rely on sessionId join, BUT we need to resolve it during creation.
    
    scheduledMessageId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "scheduled_message_id",
    },
    targetNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "target_number",
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    scheduleTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "schedule_time",
    },
    status: {
      type: DataTypes.ENUM("pending", "sent", "failed", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    timezone: {
      type: DataTypes.STRING(50),
      defaultValue: "Asia/Jakarta",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      field: "error_message",
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at",
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "scheduled_messages",
    timestamps: true,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["session_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["schedule_time"],
      },
    ],
  }
);

module.exports = ScheduledMessage;
