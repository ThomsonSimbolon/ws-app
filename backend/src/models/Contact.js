const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Contact = sequelize.define(
  "Contact",
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
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "phone_number",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      validate: {
        isEmail: true,
      },
    },
    groups: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    notes: {
      type: DataTypes.TEXT,
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_blocked",
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      field: "last_message_at",
    },
    profilePicture: {
      type: DataTypes.STRING(500),
      field: "profile_picture",
    },
  },
  {
    tableName: "contacts",
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["phone_number"],
      },
      {
        unique: true,
        fields: ["user_id", "phone_number"],
      },
    ],
  }
);

module.exports = Contact;
