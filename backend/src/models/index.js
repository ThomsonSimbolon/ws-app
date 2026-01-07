

// Import models
const User = require("./User");
const WhatsAppSession = require("./WhatsAppSession");
const Message = require("./Message");
const Contact = require("./Contact");
const Group = require("./Group");
const Statistic = require("./Statistic");
const ScheduledMessage = require("./ScheduledMessage");
const AdminActionLog = require("./AdminActionLog");
const MessageTemplate = require("./MessageTemplate");
const AutoReplyRule = require("./AutoReplyRule");
const DeviceBotConfig = require("./DeviceBotConfig");
const BotActionLog = require("./BotActionLog");
const { sequelize } = require("../config/database");


// Define associations
User.hasMany(WhatsAppSession, {
  foreignKey: "user_id",
  as: "whatsappSessions",
});

WhatsAppSession.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(Message, {
  foreignKey: "user_id",
  as: "messages",
});

Message.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

WhatsAppSession.hasMany(Message, {
  foreignKey: "session_id",
  as: "messages",
});

Message.belongsTo(WhatsAppSession, {
  foreignKey: "session_id",
  as: "session",
});

// Scheduled Message Associations
User.hasMany(ScheduledMessage, {
  foreignKey: "user_id",
  as: "scheduledMessages",
});

ScheduledMessage.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

WhatsAppSession.hasMany(ScheduledMessage, {
  foreignKey: "session_id",
  as: "scheduledMessages",
});

ScheduledMessage.belongsTo(WhatsAppSession, {
  foreignKey: "session_id",
  as: "session",
});

User.hasMany(Contact, {
  foreignKey: "user_id",
  as: "contacts",
});

Contact.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// Group associations
WhatsAppSession.hasMany(Group, {
  foreignKey: "device_id",
  sourceKey: "deviceId",
  as: "groups",
});

Group.belongsTo(WhatsAppSession, {
  foreignKey: "device_id",
  targetKey: "deviceId",
  as: "device",
});

// Statistics associations
WhatsAppSession.hasMany(Statistic, {
  foreignKey: "device_id",
  sourceKey: "deviceId",
  as: "statistics",
});

Statistic.belongsTo(WhatsAppSession, {
  foreignKey: "device_id",
  targetKey: "deviceId",
  as: "device",
});

// Admin Action Log Associations
User.hasMany(AdminActionLog, {
  foreignKey: "adminId",
  as: "adminActions",
});

AdminActionLog.belongsTo(User, {
  foreignKey: "adminId",
  as: "admin",
});

// MessageTemplate associations
User.hasMany(MessageTemplate, {
  foreignKey: "user_id",
  as: "messageTemplates",
});

MessageTemplate.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

module.exports = {
  sequelize,
  User,
  WhatsAppSession,
  Message,
  Contact,
  Group,
  Statistic,
  ScheduledMessage,
  AdminActionLog,
  MessageTemplate,
  AutoReplyRule,
  DeviceBotConfig,
  BotActionLog,
};
