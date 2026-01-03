const express = require("express");
const router = express.Router();

const whatsappController = require("../controllers/whatsappController");
const authenticateToken = require("../middleware/auth");
const { requireUser } = require("../middleware/authorize");
const { validate, schemas } = require("../utils/validation");
const { sendMessageSchema } = schemas;

// WhatsApp session management
router.get(
  "/status",
  authenticateToken,
  requireUser,
  whatsappController.getStatus
);
router.post(
  "/connect",
  authenticateToken,
  requireUser,
  whatsappController.connect
);
router.post(
  "/regenerate-qr",
  authenticateToken,
  requireUser,
  whatsappController.regenerateQR
);
router.post(
  "/disconnect",
  authenticateToken,
  requireUser,
  whatsappController.disconnect
);

// Message management
router.post(
  "/send-message",
  authenticateToken,
  requireUser,
  validate(sendMessageSchema),
  whatsappController.sendMessage
);
router.get(
  "/messages",
  authenticateToken,
  requireUser,
  whatsappController.getMessages
);

// Contacts
router.get(
  "/contacts",
  authenticateToken,
  requireUser,
  whatsappController.getContacts
);

module.exports = router;
