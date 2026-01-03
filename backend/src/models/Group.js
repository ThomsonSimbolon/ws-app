const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Group = sequelize.define(
  "Group",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    groupId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "group_id",
      comment: "WhatsApp group JID (e.g., 120363123456789012@g.us)",
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
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Group name/subject",
    },
    description: {
      type: DataTypes.TEXT,
      comment: "Group description",
    },
    creationTimestamp: {
      type: DataTypes.BIGINT,
      field: "creation_timestamp",
    },
    owner: {
      type: DataTypes.STRING(100),
      comment: "Group owner JID",
    },
    participants: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Array of participant JIDs",
    },
    admins: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Array of admin JIDs",
    },
    metadata: {
      type: DataTypes.JSON,
      comment: "Additional group metadata",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    tableName: "groups",
    indexes: [
      {
        fields: ["device_id"],
      },
      {
        fields: ["group_id"],
        unique: true,
      },
      {
        fields: ["is_active"],
      },
    ],
  }
);

module.exports = Group;

