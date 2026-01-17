const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const auditController = require("../controllers/auditController");
const exportController = require("../controllers/exportController");
const authenticateToken = require("../middleware/auth");
const { requireAdmin } = require("../middleware/authorize");

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// User Management Routes
router.get("/users", adminController.listUsers);
router.post("/users", adminController.createUser);
router.get("/users/:userId", adminController.getUserDetails);
router.get("/users/:userId/insights", adminController.getUserInsights);
router.put("/users/:userId", adminController.updateUser);
router.delete("/users/:userId", adminController.deleteUser);

// Device Management Routes
router.get("/devices", adminController.listDevices);
router.get("/devices/:deviceId/health", adminController.getDeviceHealth);
router.delete("/devices/:deviceId/disconnect", adminController.disconnectDevice);
router.delete("/devices/:deviceId", adminController.deleteDevice);

// Message Management Routes
router.get("/messages", adminController.listMessages);

// Groups Management Routes
router.get("/groups", adminController.listGroups);

// Contacts Management Routes
router.get("/contacts", adminController.listContacts);

// Job Queue Management Routes
router.get("/jobs", adminController.listJobs);
router.get("/jobs/:jobId", adminController.getJobDetails);
router.post("/jobs/:jobId/cancel", adminController.cancelJob);
router.post("/jobs/:jobId/pause", adminController.pauseJob);
router.post("/jobs/:jobId/resume", adminController.resumeJob);
router.post("/jobs/:jobId/retry", adminController.retryJob);

// Statistics Routes
router.get("/stats", adminController.getStats);

// Audit Log Routes
router.get("/logs/filters", auditController.getLogFilters);
router.get("/logs", auditController.listLogs);

// Data Export Routes
router.get("/export/users", exportController.exportUsers);
router.get("/export/devices", exportController.exportDevices);
router.get("/export/messages", exportController.exportMessages);
router.get("/export/logs", exportController.exportLogs);

module.exports = router;



