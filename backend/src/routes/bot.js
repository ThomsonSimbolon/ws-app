/**
 * Bot Routes
 * API routes for WhatsApp bot configuration, rules, handoffs, and logs
 */

const express = require("express");
const router = express.Router();
const botController = require("../controllers/botController");
const authenticateToken = require("../middleware/auth");

// All routes require authentication
router.use(authenticateToken);

// ==================== DEVICE BOT CONFIG ====================

// GET /api/bot/devices/:deviceId/config - Get bot config
router.get("/devices/:deviceId/config", botController.getBotConfig);

// PUT /api/bot/devices/:deviceId/config - Update bot config
router.put("/devices/:deviceId/config", botController.updateBotConfig);

// ==================== AUTO REPLY RULES ====================

// GET /api/bot/devices/:deviceId/rules - List all rules
router.get("/devices/:deviceId/rules", botController.listRules);

// POST /api/bot/devices/:deviceId/rules - Create new rule
router.post("/devices/:deviceId/rules", botController.createRule);

// PUT /api/bot/devices/:deviceId/rules/:ruleId - Update rule
router.put("/devices/:deviceId/rules/:ruleId", botController.updateRule);

// DELETE /api/bot/devices/:deviceId/rules/:ruleId - Delete rule
router.delete("/devices/:deviceId/rules/:ruleId", botController.deleteRule);

// ==================== HANDOFFS ====================

// GET /api/bot/devices/:deviceId/handoffs - List active handoffs
router.get("/devices/:deviceId/handoffs", botController.listHandoffs);

// POST /api/bot/devices/:deviceId/handoffs/:senderJid/resume - Resume bot
router.post("/devices/:deviceId/handoffs/:senderJid/resume", botController.resumeHandoff);

// ==================== LOGS & STATS ====================

// GET /api/bot/devices/:deviceId/logs - Get bot action logs
router.get("/devices/:deviceId/logs", botController.getBotLogs);

// GET /api/bot/devices/:deviceId/stats - Get bot stats
router.get("/devices/:deviceId/stats", botController.getBotStats);

module.exports = router;
