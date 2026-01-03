const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Message = sequelize.define(
  "Message",
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
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "session_id",
      references: {
        model: "whatsapp_sessions",
        key: "id",
      },
    },
    messageId: {
      type: DataTypes.STRING(100),
      field: "message_id",
    },
    fromNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "from_number",
    },
    toNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "to_number",
    },
    messageType: {
      type: DataTypes.ENUM("text", "image", "document", "audio", "video"),
      allowNull: false,
      defaultValue: "text",
      field: "message_type",
    },
    content: {
      type: DataTypes.TEXT,
    },
    mediaUrl: {
      type: DataTypes.STRING(500),
      field: "media_url",
    },
    status: {
      type: DataTypes.ENUM("pending", "sent", "delivered", "read", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    direction: {
      type: DataTypes.ENUM("incoming", "outgoing"),
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    metadata: {
      type: DataTypes.JSON,
    },
  },
  {
    tableName: "messages",
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["session_id"],
      },
      {
        fields: ["from_number"],
      },
      {
        fields: ["to_number"],
      },
      {
        fields: ["timestamp"],
      },
      {
        fields: ["status"],
      },
    ],
  }
);

module.exports = Message;
