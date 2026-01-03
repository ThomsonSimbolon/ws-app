const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authenticateToken = require("../middleware/auth");
const { validate, schemas } = require("../utils/validation");
const { registerSchema, loginSchema } = schemas;

// Public routes
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh-token", authController.refreshToken);

// Protected routes
router.get("/profile", authenticateToken, authController.getProfile);
router.put("/profile", authenticateToken, authController.updateProfile);

module.exports = router;
