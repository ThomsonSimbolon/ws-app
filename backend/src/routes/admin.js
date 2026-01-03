const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const authenticateToken = require("../middleware/auth");
const { requireAdmin } = require("../middleware/authorize");

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// User Management Routes
router.get("/users", adminController.listUsers);
router.post("/users", adminController.createUser);
router.get("/users/:userId", adminController.getUserDetails);
router.put("/users/:userId", adminController.updateUser);
router.delete("/users/:userId", adminController.deleteUser);

// Device Management Routes
router.get("/devices", adminController.listDevices);

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

// Statistics Routes
router.get("/stats", adminController.getStats);

module.exports = router;

