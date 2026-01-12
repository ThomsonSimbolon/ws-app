const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const JobItem = sequelize.define(
  "JobItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "job_id",
      references: {
        model: "jobs",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    recipient: {
      type: DataTypes.STRING(50), // Phone number or Group ID
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "sent", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    messageId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "message_id",
      comment: "WhatsApp Message ID for tracking and idempotency",
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "processed_at",
    },
  },
  {
    tableName: "job_items",
    timestamps: true,
    indexes: [
      {
        fields: ["job_id"], // Critical for fetch
      },
      {
        fields: ["job_id", "status"], // Critical for processing loop
      },
      {
        fields: ["recipient"],
      },
    ],
  }
);

module.exports = JobItem;
