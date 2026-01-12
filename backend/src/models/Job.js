const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Job = sequelize.define(
  "Job",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    deviceId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "device_id",
      references: {
        model: "whatsapp_sessions",
        key: "device_id",
      },
    },
    type: {
      type: DataTypes.ENUM("send-text", "send-media"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "queued",
        "processing",
        "completed",
        "failed",
        "paused",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "queued",
    },
    data: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: "Payload containing message content and original request data",
    },
    progress: {
      type: DataTypes.JSON, // { total: 0, sent: 0, failed: 0 }
      allowNull: false,
      defaultValue: { total: 0, sent: 0, failed: 0 },
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "jobs",
    timestamps: true,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["device_id"],
      },
      {
        fields: ["status"], // Critical for recovery
      },
      {
        fields: ["created_at"],
      },
    ],
  }
);

module.exports = Job;
