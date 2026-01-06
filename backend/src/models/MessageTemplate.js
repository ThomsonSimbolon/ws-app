const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * MessageTemplate Model
 * 
 * Stores personal message templates for users
 * Templates support variable placeholders with {{variableName}} syntax
 */
const MessageTemplate = sequelize.define(
  "MessageTemplate",
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 2000], // Max 2000 characters
      },
    },
    // Extracted variable names from content (cached for quick access)
    variables: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    // Category for organization (e.g., 'greeting', 'follow-up', 'reminder')
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    // Track usage for sorting by popularity
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "usage_count",
    },
    // Soft delete / archive
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_archived",
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
    tableName: "message_templates",
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["user_id", "category"],
      },
      {
        unique: true,
        fields: ["user_id", "name"],
      },
    ],
    hooks: {
      // Extract variables before save
      beforeValidate: (template) => {
        if (template.content) {
          // Extract {{variableName}} patterns
          const regex = /\{\{(\w+)\}\}/g;
          const matches = [];
          let match;
          while ((match = regex.exec(template.content)) !== null) {
            if (!matches.includes(match[1])) {
              matches.push(match[1]);
            }
          }
          template.variables = matches;
        }
      },
    },
  }
);

module.exports = MessageTemplate;
