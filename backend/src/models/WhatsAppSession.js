const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const WhatsAppSession = sequelize.define(
  "WhatsAppSession",
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
    deviceId: {
      type: DataTypes.STRING(100),
      allowNull: true, // Nullable for backward compatibility during migration
      unique: true, // Required for foreign key references from other tables
      field: "device_id",
      comment: "Unique device identifier for multi-device support",
    },
    deviceName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "device_name",
      comment: "Human-readable device name",
    },
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "session_id",
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      field: "phone_number",
    },
    sessionData: {
      type: DataTypes.TEXT("long"),
      field: "session_data",
    },
    qrCode: {
      type: DataTypes.TEXT,
      field: "qr_code",
    },
    status: {
      type: DataTypes.ENUM(
        "disconnected",
        "connecting",
        "connected",
        "qr_required"
      ),
      allowNull: false,
      defaultValue: "disconnected",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    lastSeen: {
      type: DataTypes.DATE,
      field: "last_seen",
    },
    deviceInfo: {
      type: DataTypes.JSON,
      field: "device_info",
    },
  },
  {
    tableName: "whatsapp_sessions",
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
        fields: ["device_id"],
        name: "idx_whatsapp_sessions_device_id",
      },
      {
        fields: ["user_id", "device_id"],
        unique: true,
        name: "idx_whatsapp_sessions_user_device_unique",
      },
    ],
  }
);

module.exports = WhatsAppSession;
