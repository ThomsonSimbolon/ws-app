const { sequelize } = require("../config/database");

// Import models
const User = require("./User");
const WhatsAppSession = require("./WhatsAppSession");
const Message = require("./Message");
const Contact = require("./Contact");
const Group = require("./Group");
const Statistic = require("./Statistic");

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

module.exports = {
  sequelize,
  User,
  WhatsAppSession,
  Message,
  Contact,
  Group,
  Statistic,
};
