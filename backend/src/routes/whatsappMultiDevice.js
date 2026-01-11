const express = require("express");
const router = express.Router();

const whatsappMultiDeviceController = require("../controllers/whatsappMultiDeviceController");
const authenticateToken = require("../middleware/auth");
const { requireUser, requireAdmin } = require("../middleware/authorize");
const { validate, schemas } = require("../utils/validation");
const { upload } = require("../middleware/upload");

// Device Management Routes (Admin Only)
router.post(
  "/devices",
  authenticateToken,
  requireAdmin,
  validate(schemas.createDeviceSchema),
  whatsappMultiDeviceController.createDevice
);

router.get(
  "/devices",
  authenticateToken,
  requireUser, // Admin & User can list their own devices
  whatsappMultiDeviceController.listDevices
);

router.get(
  "/devices/connected",
  authenticateToken,
  requireUser, // Admin & User can list their own connected devices
  whatsappMultiDeviceController.listConnectedDevices
);

// Alias for /devices/connected/detail
router.get(
  "/devices/connected/detail",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.listConnectedDevices
);

router.get(
  "/devices/:deviceId",
  authenticateToken,
  requireUser, // Admin & User can view their own devices (ownership checked in controller)
  whatsappMultiDeviceController.getDevice
);

router.get(
  "/devices/:deviceId/status",
  authenticateToken,
  requireUser, // Admin & User can view their own device status (ownership checked in controller)
  whatsappMultiDeviceController.getDeviceStatus
);

router.post(
  "/devices/:deviceId/connect",
  authenticateToken,
  requireUser, // User can connect their own devices (ownership checked in controller)
  whatsappMultiDeviceController.connectDevice
);

router.delete(
  "/devices/:deviceId/disconnect",
  authenticateToken,
  requireUser, // User can disconnect their own devices (ownership checked in controller)
  whatsappMultiDeviceController.disconnectDevice
);

router.delete(
  "/devices/:deviceId",
  authenticateToken,
  requireAdmin, // Admin only - Delete device requires admin
  whatsappMultiDeviceController.deleteDevice
);

router.post(
  "/devices/:deviceId/cancel-and-wipe",
  authenticateToken,
  requireAdmin, // Admin only - Cancel and wipe requires admin
  whatsappMultiDeviceController.cancelAndWipeDevice
);

// Alias for DELETE /devices/:deviceId/session
router.delete(
  "/devices/:deviceId/session",
  authenticateToken,
  requireAdmin,
  whatsappMultiDeviceController.cancelAndWipeDevice
);

// QR Code & Pairing Routes (User can access QR for their own devices)
router.get(
  "/devices/:deviceId/qr",
  authenticateToken,
  requireUser, // User can get QR code for their own devices (ownership checked in controller)
  whatsappMultiDeviceController.getQRCode
);

router.get(
  "/devices/:deviceId/qr-image",
  authenticateToken,
  requireUser, // User can get QR image for their own devices (ownership checked in controller)
  whatsappMultiDeviceController.getQRCodeImage
);

// Alias for /devices/:deviceId/qr-base64
router.get(
  "/devices/:deviceId/qr-base64",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.getQRCodeImage
);

router.post(
  "/devices/:deviceId/pairing-code",
  authenticateToken,
  requireAdmin, // Admin only - Pairing code requires admin
  whatsappMultiDeviceController.generatePairingCode
);

// Messaging Routes
router.post(
  "/devices/:deviceId/send-message",
  authenticateToken,
  requireUser,
  validate(schemas.sendMessageSchema),
  whatsappMultiDeviceController.sendMessage
);

router.post(
  "/devices/:deviceId/send-media",
  authenticateToken,
  requireUser,
  upload.single("file"), // Support file upload (optional)
  whatsappMultiDeviceController.sendMedia
);

// Job Management Routes (User can create jobs for their own devices)
router.post(
  "/devices/:deviceId/jobs/send-text",
  authenticateToken,
  requireUser, // User can create bulk text jobs for their own devices (ownership checked in controller)
  whatsappMultiDeviceController.createSendTextJob
);

router.post(
  "/devices/:deviceId/jobs/send-media",
  authenticateToken,
  requireUser, // User can create bulk media jobs for their own devices (ownership checked in controller)
  whatsappMultiDeviceController.createSendMediaJob
);

router.get(
  "/jobs/:jobId",
  authenticateToken,
  requireUser, // Admin & User can view their own jobs (ownership checked in controller)
  whatsappMultiDeviceController.getJobStatus
);

router.post(
  "/jobs/:jobId/cancel",
  authenticateToken,
  requireUser, // Admin & User can cancel their own jobs (ownership checked in controller)
  whatsappMultiDeviceController.cancelJob
);

// User Jobs List - List all jobs for user's devices
router.get(
  "/jobs",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.listUserJobs
);

// Group Management Routes (Admin Only)
router.get(
  "/devices/:deviceId/groups",
  authenticateToken,
  requireAdmin, // Admin only - Group management requires admin
  whatsappMultiDeviceController.listGroups
);

router.post(
  "/devices/:deviceId/groups",
  authenticateToken,
  requireAdmin, // Admin only - Create group requires admin
  whatsappMultiDeviceController.createGroup
);

router.get(
  "/devices/:deviceId/groups/:groupId/info",
  authenticateToken,
  requireAdmin, // Admin only - Group info requires admin
  whatsappMultiDeviceController.getGroupInfo
);

router.post(
  "/devices/:deviceId/send-group-message",
  authenticateToken,
  requireAdmin, // Admin only - Send group message requires admin
  whatsappMultiDeviceController.sendGroupMessage
);

router.post(
  "/devices/:deviceId/groups/:groupId/mention-message",
  authenticateToken,
  requireAdmin, // Admin only - Mention message requires admin
  whatsappMultiDeviceController.sendGroupMentionMessage
);

router.post(
  "/devices/:deviceId/groups/:groupId/send-media",
  authenticateToken,
  requireAdmin, // Admin only - Send group media requires admin
  upload.single("file"), // Support file upload (optional)
  whatsappMultiDeviceController.sendGroupMedia
);

router.post(
  "/devices/:deviceId/groups/:groupId/jobs/send-media",
  authenticateToken,
  requireAdmin, // Admin only - Send group media job requires admin
  upload.single("file"), // Support file upload (optional)
  whatsappMultiDeviceController.createSendGroupMediaJob
);

router.post(
  "/devices/:deviceId/groups/:groupId/participants",
  authenticateToken,
  requireAdmin, // Admin only - Invite participants requires admin
  whatsappMultiDeviceController.inviteParticipants
);

router.delete(
  "/devices/:deviceId/groups/:groupId/participants/:participantJid",
  authenticateToken,
  requireAdmin, // Admin only - Kick participant requires admin
  whatsappMultiDeviceController.kickParticipant
);

router.post(
  "/devices/:deviceId/groups/:groupId/admins",
  authenticateToken,
  requireAdmin, // Admin only - Promote admin requires admin
  whatsappMultiDeviceController.promoteAdmin
);

router.delete(
  "/devices/:deviceId/groups/:groupId/admins/:adminJid",
  authenticateToken,
  requireAdmin, // Admin only - Demote admin requires admin
  whatsappMultiDeviceController.demoteAdmin
);

// Contacts Routes (from WhatsApp)
router.get(
  "/devices/:deviceId/contacts",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.getContacts
);

// User Contacts Routes (from Database - with tags)
router.get(
  "/contacts",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.getUserContacts
);

router.post(
  "/contacts",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.saveContact
);

router.put(
  "/contacts/:contactId/tags",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.updateContactTags
);

router.get(
  "/tags",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.getUserTags
);

// Chat History Routes
router.get(
  "/devices/:deviceId/chat-history/:jid",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.getChatHistory
);

router.get(
  "/devices/:deviceId/group-chat-history/:groupId",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.getGroupChatHistory
);

router.get(
  "/devices/:deviceId/daily-chat-list",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.getDailyChatList
);

// Scheduled Message Routes
router.post(
  "/devices/:deviceId/schedule-message",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.scheduleMessage
);

router.get(
  "/devices/:deviceId/scheduled-messages",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.listScheduledMessages
);

// Cross-device scheduled messages list (all user's devices)
router.get(
  "/scheduled-messages",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.listAllScheduledMessages
);

// Cancel a scheduled message
router.post(
  "/scheduled-messages/:messageId/cancel",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.cancelScheduledMessage
);

// Message Template Routes (User)
router.get(
  "/templates",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.getTemplates
);

router.post(
  "/templates",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.createTemplate
);

router.put(
  "/templates/:templateId",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.updateTemplate
);

router.delete(
  "/templates/:templateId",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.deleteTemplate
);

router.post(
  "/templates/:templateId/use",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.useTemplate
);

// Statistics Routes (Admin Only)
router.get(
  "/devices/:deviceId/statistics",
  authenticateToken,
  requireAdmin, // Admin only - Statistics requires admin
  whatsappMultiDeviceController.getStatistics
);

router.get(
  "/devices/:deviceId/statistics/daily",
  authenticateToken,
  requireAdmin, // Admin only - Daily statistics requires admin
  whatsappMultiDeviceController.getDailyActivity
);

// User Statistics Route (User only - personal stats)
router.get(
  "/user/statistics",
  authenticateToken,
  requireUser,
  whatsappMultiDeviceController.getUserStatistics
);

module.exports = router;
