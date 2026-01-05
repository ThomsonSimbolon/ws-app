const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const AdminActionLog = sequelize.define("AdminActionLog", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "users",
      key: "id",
    },
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  targetType: {
    type: DataTypes.STRING,
    allowNull: true, // e.g., 'user', 'device', 'job'
  },
  targetId: {
    type: DataTypes.STRING, // String to accommodate UUIDs or other non-integer IDs if needed
    allowNull: true,
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "admin_action_logs",
  timestamps: false, // Only createdAt needed
});

module.exports = AdminActionLog;
