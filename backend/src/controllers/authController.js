const { User } = require("../models");
const {
  generateToken,
  generateRefreshToken,
  verifyToken,
} = require("../utils/jwt");
const logger = require("../utils/logger");

const register = async (req, res) => {
  try {
    const { username, email, password, fullName, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        $or: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Create new user
    // Security: Always default to "user" role, admin must be created by another admin
    const user = await User.create({
      username,
      email,
      password,
      fullName,
      role: "user", // Force user role - admin must be created by another admin
    });

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: user.toJSON(),
        token,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const login = async (req, res) => {
  try {
    console.log("Login attempt:", {
      email: req.body.email,
      hasPassword: !!req.body.password,
    });

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({
      where: { email },
      attributes: [
        "id",
        "email",
        "password",
        "username",
        "fullName",
        "role",
        "isActive",
      ],
    });

    console.log("User found:", user ? "Yes" : "No");
    if (user) {
      console.log("User details:", {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
        role: user.role,
      });
    }

    if (!user || !user.isActive) {
      console.log("Login failed: User not found or inactive");
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    console.log("Checking password...");
    const isPasswordValid = await user.comparePassword(password);
    console.log("Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("Login failed: Invalid password");
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: user.toJSON(),
        token,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          association: "whatsappSessions",
          attributes: ["id", "sessionId", "phoneNumber", "status", "lastSeen"],
        },
      ],
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, username } = req.body;
    const userId = req.user.id;

    // Check if username is taken by another user
    if (username) {
      const existingUser = await User.findOne({
        where: {
          username,
          id: { $ne: userId },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username already taken",
        });
      }
    }

    // Update user
    await User.update({ fullName, username }, { where: { id: userId } });

    const updatedUser = await User.findByPk(userId);

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    logger.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);

    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Generate new access token
    const newToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`Token refreshed for user: ${user.email}`);

    res.json({
      success: true,
      data: {
        token: newToken,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    logger.error("Refresh token error:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    res.status(500).json({
      success: false,
      message: "Token refresh failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  refreshToken,
};
