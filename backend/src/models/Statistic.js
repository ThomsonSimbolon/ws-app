const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Statistic = sequelize.define(
  "Statistic",
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
      references: {
        model: "whatsapp_sessions",
        key: "device_id",
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: "Date of statistics (YYYY-MM-DD)",
    },
    messagesIncoming: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "messages_incoming",
      comment: "Number of incoming messages",
    },
    messagesOutgoing: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "messages_outgoing",
      comment: "Number of outgoing messages",
    },
    activeChats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "active_chats",
      comment: "Number of active chats",
    },
    responseRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "response_rate",
      comment: "Response rate percentage",
    },
    averageResponseTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "average_response_time",
      comment: "Average response time in seconds",
    },
    metadata: {
      type: DataTypes.JSON,
      comment: "Additional statistics data",
    },
  },
  {
    tableName: "statistics",
    indexes: [
      {
        fields: ["device_id"],
      },
      {
        fields: ["date"],
      },
      {
        unique: true,
        fields: ["device_id", "date"],
        name: "idx_statistics_device_date_unique",
      },
    ],
  }
);

module.exports = Statistic;

