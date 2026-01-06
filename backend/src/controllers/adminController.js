const { User, WhatsAppSession, Message, Group, Contact } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const { logAction } = require("./auditController");
const whatsappService = require("../services/whatsappService");


/**
 * List all users (Admin only)
 * GET /api/admin/users
 */
const listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, isActive } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { fullName: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    // Get users with pagination
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "username",
        "email",
        "fullName",
        "role",
        "isActive",
        "lastLogin",
        "createdAt",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const deviceCount = await WhatsAppSession.count({
          where: { userId: user.id },
        });

        const messageCount = await Message.count({
          where: { userId: user.id },
        });

        const connectedDeviceCount = await WhatsAppSession.count({
          where: { userId: user.id, status: "connected", isActive: true },
        });

        return {
          ...user.toJSON(),
          stats: {
            totalDevices: deviceCount,
            connectedDevices: connectedDeviceCount,
            totalMessages: messageCount,
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalUsers: count,
          hasNext: offset + users.length < count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Admin list users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get user details by ID (Admin only)
 * GET /api/admin/users/:userId
 */
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "username",
        "email",
        "fullName",
        "role",
        "isActive",
        "lastLogin",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          association: "whatsappSessions",
          attributes: [
            "id",
            "deviceId",
            "deviceName",
            "phoneNumber",
            "status",
            "isActive",
            "lastSeen",
            "createdAt",
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get additional stats
    const deviceCount = await WhatsAppSession.count({
      where: { userId: user.id },
    });

    const messageCount = await Message.count({
      where: { userId: user.id },
    });

    const connectedDeviceCount = await WhatsAppSession.count({
      where: { userId: user.id, status: "connected", isActive: true },
    });

    res.json({
      success: true,
      data: {
        user: {
          ...user.toJSON(),
          stats: {
            totalDevices: deviceCount,
            connectedDevices: connectedDeviceCount,
            totalMessages: messageCount,
          },
        },
      },
    });
  } catch (error) {
    logger.error("Admin get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * List all devices (Admin only)
 * GET /api/admin/devices
 */
const listDevices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId,
      status,
      isActive,
      search,
    } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};

    if (userId) {
      whereClause.userId = parseInt(userId);
    }

    if (status) {
      whereClause.status = status;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    if (search) {
      whereClause[Op.or] = [
        { deviceName: { [Op.like]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } },
        { deviceId: { [Op.like]: `%${search}%` } },
      ];
    }

    // Get devices with pagination
    const { count, rows: devices } = await WhatsAppSession.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "userId",
        "deviceId",
        "deviceName",
        "phoneNumber",
        "status",
        "isActive",
        "lastSeen",
        "deviceInfo",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          association: "user",
          attributes: ["id", "username", "email", "fullName", "role"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        devices: devices.map((device) => device.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalDevices: count,
          hasNext: offset + devices.length < count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Admin list devices error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list devices",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * List all messages (Admin only)
 * GET /api/admin/messages
 */
const listMessages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      deviceId,
      fromNumber,
      toNumber,
      direction,
      status,
      startDate,
      endDate,
    } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};

    if (userId) {
      whereClause.userId = parseInt(userId);
    }

    if (fromNumber) {
      whereClause.fromNumber = { [Op.like]: `%${fromNumber}%` };
    }

    if (toNumber) {
      whereClause.toNumber = { [Op.like]: `%${toNumber}%` };
    }

    if (direction) {
      whereClause.direction = direction;
    }

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.timestamp[Op.lte] = new Date(endDate);
      }
    }

    // Get session ID if deviceId provided
    if (deviceId) {
      const session = await WhatsAppSession.findOne({
        where: { deviceId },
        attributes: ["id"],
      });
      if (session) {
        whereClause.sessionId = session.id;
      } else {
        // Device not found, return empty result
        return res.json({
          success: true,
          data: {
            messages: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalMessages: 0,
              hasNext: false,
              hasPrev: false,
            },
          },
        });
      }
    }

    // Get messages with pagination
    const { count, rows: messages } = await Message.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "userId",
        "sessionId",
        "messageId",
        "fromNumber",
        "toNumber",
        "messageType",
        "content",
        "direction",
        "status",
        "timestamp",
        "metadata",
        "createdAt",
      ],
      include: [
        {
          association: "user",
          attributes: ["id", "username", "email", "fullName"],
        },
        {
          association: "session",
          attributes: ["id", "deviceId", "deviceName", "phoneNumber"],
        },
      ],
      order: [["timestamp", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        messages: messages.map((message) => message.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalMessages: count,
          hasNext: offset + messages.length < count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Admin list messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list messages",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get global statistics (Admin only)
 * GET /api/admin/stats
 */
const getStats = async (req, res) => {
  try {
    // Get total counts
    const totalUsers = await User.count();
    const totalActiveUsers = await User.count({ where: { isActive: true } });
    const totalAdminUsers = await User.count({ where: { role: "admin" } });
    const totalRegularUsers = await User.count({ where: { role: "user" } });

    const totalDevices = await WhatsAppSession.count();
    const totalActiveDevices = await WhatsAppSession.count({
      where: { isActive: true },
    });
    const totalConnectedDevices = await WhatsAppSession.count({
      where: { status: "connected", isActive: true },
    });

    const totalMessages = await Message.count();
    const totalIncomingMessages = await Message.count({
      where: { direction: "incoming" },
    });
    const totalOutgoingMessages = await Message.count({
      where: { direction: "outgoing" },
    });

    const totalGroups = await Group.count();
    const totalActiveGroups = await Group.count({ where: { isActive: true } });

    const totalContacts = await Contact.count();

    // Get recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const messagesLast24h = await Message.count({
      where: {
        timestamp: {
          [Op.gte]: last24Hours,
        },
      },
    });

    const newUsersLast24h = await User.count({
      where: {
        createdAt: {
          [Op.gte]: last24Hours,
        },
      },
    });

    const newDevicesLast24h = await WhatsAppSession.count({
      where: {
        createdAt: {
          [Op.gte]: last24Hours,
        },
      },
    });

    // Get status distribution
    const { sequelize } = require("../config/database");
    const deviceStatusDistribution = await WhatsAppSession.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    const messageStatusDistribution = await Message.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: totalActiveUsers,
          admins: totalAdminUsers,
          regular: totalRegularUsers,
        },
        devices: {
          total: totalDevices,
          active: totalActiveDevices,
          connected: totalConnectedDevices,
          statusDistribution: deviceStatusDistribution,
        },
        messages: {
          total: totalMessages,
          incoming: totalIncomingMessages,
          outgoing: totalOutgoingMessages,
          statusDistribution: messageStatusDistribution,
        },
        groups: {
          total: totalGroups,
          active: totalActiveGroups,
        },
        contacts: {
          total: totalContacts,
        },
        activity: {
          last24Hours: {
            messages: messagesLast24h,
            newUsers: newUsersLast24h,
            newDevices: newDevicesLast24h,
          },
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Admin get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Create new user (Admin only)
 * POST /api/admin/users
 */
const createUser = async (req, res) => {
  try {
    const { username, email, password, fullName, role = "user", isActive = true } = req.body;

    // Validation
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Username, email, password, and fullName are required",
      });
    }

    // Validate role
    if (role && !["admin", "user"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'admin' or 'user'",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      fullName,
      role: role || "user",
      isActive: isActive !== undefined ? isActive : true,
    });

    logger.info(`Admin ${req.user.id} created new user: ${user.email} (${user.role})`);

    await logAction(
      {
        adminId: req.user.id,
        action: "create_user",
        targetType: "user",
        targetId: user.id,
        details: { email: user.email, role: user.role },
      },
      req
    );


    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    logger.error("Admin create user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update user (Admin only)
 * PUT /api/admin/users/:userId
 */
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, fullName, role, isActive, password } = req.body;

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent admin from demoting themselves
    if (parseInt(userId) === req.user.id && role && role !== user.role) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    // Prevent admin from deactivating themselves
    if (parseInt(userId) === req.user.id && isActive !== undefined && !isActive) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    // Validate role if provided
    if (role && !["admin", "user"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'admin' or 'user'",
      });
    }

    // Check if email/username already exists (if changed)
    if (email || username) {
      const whereClause = {
        [Op.or]: [],
        id: { [Op.ne]: userId },
      };

      if (email) {
        whereClause[Op.or].push({ email });
      }
      if (username) {
        whereClause[Op.or].push({ username });
      }

      const existingUser = await User.findOne({ where: whereClause });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email or username already exists",
        });
      }
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = password; // Will be hashed by model hook

    await user.update(updateData);
    await user.reload();

    logger.info(`Admin ${req.user.id} updated user: ${user.email}`);

    await logAction(
      {
        adminId: req.user.id,
        action: "update_user",
        targetType: "user",
        targetId: user.id,
        details: updateData,
      },
      req
    );


    res.json({
      success: true,
      message: "User updated successfully",
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    logger.error("Admin update user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete user (Admin only)
 * DELETE /api/admin/users/:userId
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has active sessions/devices
    const activeSessions = await WhatsAppSession.count({
      where: { userId: userId, isActive: true },
    });

    if (activeSessions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user with ${activeSessions} active device(s). Please disconnect all devices first.`,
      });
    }

    await user.destroy();

    logger.info(`Admin ${req.user.id} deleted user: ${user.email}`);

    await logAction(
      {
        adminId: req.user.id,
        action: "delete_user",
        targetType: "user",
        targetId: userId,
        details: { email: user.email },
      },
      req
    );


    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error("Admin delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * List all groups (Admin only)
 * GET /api/admin/groups
 */
const listGroups = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      deviceId,
      userId,
      search,
      isActive,
    } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};

    if (deviceId) {
      whereClause.deviceId = deviceId;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    if (search) {
      whereClause[Op.or] = [
        { subject: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // Build include clause for device and user
    const includeClause = [
      {
        association: "device",
        attributes: ["id", "deviceId", "deviceName", "phoneNumber", "userId"],
        include: [
          {
            association: "user",
            attributes: ["id", "username", "email", "fullName", "role"],
          },
        ],
      },
    ];

    // Filter by userId if provided (via device)
    if (userId) {
      includeClause[0].where = { userId: parseInt(userId) };
    }

    // Get groups with pagination
    const { count, rows: groups } = await Group.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "groupId",
        "deviceId",
        "subject",
        "description",
        "participants",
        "admins",
        "isActive",
        "createdAt",
        "updatedAt",
      ],
      include: includeClause,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        groups: groups.map((group) => group.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalGroups: count,
          hasNext: offset + groups.length < count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Admin list groups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list groups",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * List all contacts (Admin only)
 * GET /api/admin/contacts
 */
const listContacts = async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, search, isBlocked } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};

    if (userId) {
      whereClause.userId = parseInt(userId);
    }

    if (isBlocked !== undefined) {
      whereClause.isBlocked = isBlocked === "true";
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    // Get contacts with pagination
    const { count, rows: contacts } = await Contact.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "userId",
        "phoneNumber",
        "name",
        "email",
        "groups",
        "tags",
        "notes",
        "isBlocked",
        "lastMessageAt",
        "profilePicture",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          association: "user",
          attributes: ["id", "username", "email", "fullName", "role"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        contacts: contacts.map((contact) => contact.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalContacts: count,
          hasNext: offset + contacts.length < count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Admin list contacts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list contacts",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * List all jobs (Admin only)
 * GET /api/admin/jobs
 */
const listJobs = async (req, res) => {
  try {
    const { status, type, limit = 50 } = req.query;
    const jobQueueService = require("../services/jobQueueService");

    // Get jobs with filter
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    let jobs = jobQueueService.getJobs(filter);

    // Limit results
    if (limit) {
      jobs = jobs.slice(0, parseInt(limit));
    }

    // Enrich jobs with device info if available
    const enrichedJobs = await Promise.all(
      jobs.map(async (job) => {
        const jobData = { ...job };
        
        // Convert Date objects to ISO strings for JSON serialization
        if (jobData.createdAt instanceof Date) {
          jobData.createdAt = jobData.createdAt.toISOString();
        }
        if (jobData.startedAt instanceof Date) {
          jobData.startedAt = jobData.startedAt.toISOString();
        }
        if (jobData.completedAt instanceof Date) {
          jobData.completedAt = jobData.completedAt.toISOString();
        }

        // Get device info if deviceId exists in job data
        if (jobData.data && jobData.data.deviceId) {
          try {
            const device = await WhatsAppSession.findOne({
              where: { deviceId: jobData.data.deviceId },
              attributes: ["id", "deviceId", "deviceName", "phoneNumber", "userId"],
              include: [
                {
                  association: "user",
                  attributes: ["id", "username", "email", "fullName"],
                },
              ],
            });
            if (device) {
              jobData.device = device.toJSON();
            }
          } catch (error) {
            // Ignore device fetch errors
          }
        }

        return jobData;
      })
    );

    res.json({
      success: true,
      data: {
        jobs: enrichedJobs,
        total: enrichedJobs.length,
      },
    });
  } catch (error) {
    logger.error("Admin list jobs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list jobs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get job details (Admin only)
 * GET /api/admin/jobs/:jobId
 */
const getJobDetails = async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobQueueService = require("../services/jobQueueService");

    const job = jobQueueService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Convert Date objects to ISO strings
    const jobData = { ...job };
    if (jobData.createdAt instanceof Date) {
      jobData.createdAt = jobData.createdAt.toISOString();
    }
    if (jobData.startedAt instanceof Date) {
      jobData.startedAt = jobData.startedAt.toISOString();
    }
    if (jobData.completedAt instanceof Date) {
      jobData.completedAt = jobData.completedAt.toISOString();
    }

    // Get device info if deviceId exists
    if (jobData.data && jobData.data.deviceId) {
      try {
        const device = await WhatsAppSession.findOne({
          where: { deviceId: jobData.data.deviceId },
          attributes: ["id", "deviceId", "deviceName", "phoneNumber", "userId"],
          include: [
            {
              association: "user",
              attributes: ["id", "username", "email", "fullName"],
            },
          ],
        });
        if (device) {
          jobData.device = device.toJSON();
        }
      } catch (error) {
        // Ignore device fetch errors
      }
    }

    res.json({
      success: true,
      data: {
        job: jobData,
      },
    });
  } catch (error) {
    logger.error("Admin get job details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get job details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Cancel job (Admin only)
 * POST /api/admin/jobs/:jobId/cancel
 */
const cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobQueueService = require("../services/jobQueueService");

    const job = jobQueueService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.status === "completed" || job.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Job is already ${job.status}`,
      });
    }

    const cancelled = jobQueueService.cancelJob(jobId);

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        message: "Failed to cancel job",
      });
    }

    logger.info(`Admin ${req.user.id} cancelled job: ${jobId}`);

    res.json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error) {
    logger.error("Admin cancel job error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel job",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  listUsers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  listDevices,
  listMessages,
  getStats,
  listGroups,
  listContacts,
  listJobs,
  getJobDetails,
  cancelJob,
};

/**
 * Disconnect device (Admin only)
 * POST /api/admin/devices/:deviceId/disconnect
 */
const disconnectDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Find session
    const session = await WhatsAppSession.findOne({ where: { deviceId } });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    // Disconnect via WhatsApp Service
    await whatsappService.disconnectSession(deviceId);

    // Initial update to status
    await session.update({ status: "disconnected" });

    logger.info(`Admin ${req.user.id} disconnected device: ${deviceId}`);

    await logAction(
      {
        adminId: req.user.id,
        action: "disconnect_device",
        targetType: "device",
        targetId: deviceId,
        details: { deviceName: session.deviceName },
      },
      req
    );

    res.json({
      success: true,
      message: "Device disconnected successfully",
    });
  } catch (error) {
    logger.error("Admin disconnect device error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disconnect device",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete device (Admin only)
 * DELETE /api/admin/devices/:deviceId
 */
const deleteDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Find session
    const session = await WhatsAppSession.findOne({ where: { deviceId } });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    // Delete session via WhatsApp Service
    await whatsappService.deleteSession(deviceId);

    // Delete from DB (might be handled by service, but ensuring here)
    await session.destroy();

    logger.info(`Admin ${req.user.id} deleted device: ${deviceId}`);

    await logAction(
      {
        adminId: req.user.id,
        action: "delete_device",
        targetType: "device",
        targetId: deviceId,
        details: { deviceName: session.deviceName, phoneNumber: session.phoneNumber },
      },
      req
    );

    res.json({
      success: true,
      message: "Device deleted successfully",
    });
  } catch (error) {
    logger.error("Admin delete device error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete device",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Pause job (Admin only)
 * POST /api/admin/jobs/:jobId/pause
 */
const pauseJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobQueueService = require("../services/jobQueueService");

    const paused = jobQueueService.pauseJob(jobId);

    if (!paused) {
      return res.status(400).json({
        success: false,
        message: "Failed to pause job",
      });
    }

    logger.info(`Admin ${req.user.id} paused job: ${jobId}`);
    
    await logAction(
      {
        adminId: req.user.id,
        action: "pause_job",
        targetType: "job",
        targetId: jobId,
      },
      req
    );

    res.json({
      success: true,
      message: "Job paused successfully",
    });
  } catch (error) {
    logger.error("Admin pause job error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to pause job",
    });
  }
};

/**
 * Resume job (Admin only)
 * POST /api/admin/jobs/:jobId/resume
 */
const resumeJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobQueueService = require("../services/jobQueueService");

    const resumed = jobQueueService.resumeJob(jobId);

    if (!resumed) {
      return res.status(400).json({
        success: false,
        message: "Failed to resume job",
      });
    }

    logger.info(`Admin ${req.user.id} resumed job: ${jobId}`);

    await logAction(
      {
        adminId: req.user.id,
        action: "resume_job",
        targetType: "job",
        targetId: jobId,
      },
      req
    );

    res.json({
      success: true,
      message: "Job resumed successfully",
    });
  } catch (error) {
    logger.error("Admin resume job error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to resume job",
    });
  }
};

/**
 * Retry job (Admin only)
 * POST /api/admin/jobs/:jobId/retry
 */
const retryJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobQueueService = require("../services/jobQueueService");

    const newJobId = jobQueueService.retryJob(jobId);

    logger.info(`Admin ${req.user.id} retried job: ${jobId} -> ${newJobId}`);

    await logAction(
      {
        adminId: req.user.id,
        action: "retry_job",
        targetType: "job",
        targetId: jobId,
        details: { newJobId },
      },
      req
    );

    res.json({
      success: true,
      message: "Job retry started successfully",
      data: {
        jobId: newJobId,
      },
    });
  } catch (error) {
    logger.error("Admin retry job error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retry job",
    });
  }
};

/**
 * Get device health metrics (Admin only)
 * GET /api/admin/devices/:deviceId/health
 */
const getDeviceHealth = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Find device
    const device = await WhatsAppSession.findOne({
      where: { deviceId },
      include: [
        {
          association: "user",
          attributes: ["id", "username", "email", "fullName"],
        },
      ],
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    // Calculate health metrics
    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Get message success rate for this device
    const totalMessages = await Message.count({
      where: {
        sessionId: device.id,
        direction: "outgoing",
        timestamp: { [Op.gte]: last7Days },
      },
    });

    const failedMessages = await Message.count({
      where: {
        sessionId: device.id,
        direction: "outgoing",
        status: "failed",
        timestamp: { [Op.gte]: last7Days },
      },
    });

    const messageSuccessRate = totalMessages > 0
      ? ((totalMessages - failedMessages) / totalMessages) * 100
      : 100;

    // Calculate stuck duration (if in connecting or qr_required state)
    let stuckDuration = null;
    if (device.status === 'connecting' || device.status === 'qr_required') {
      const updatedAt = new Date(device.updatedAt);
      stuckDuration = Math.floor((now - updatedAt) / 1000 / 60); // minutes
    }

    // Calculate last seen duration
    let lastSeenMinutes = null;
    if (device.lastSeen) {
      lastSeenMinutes = Math.floor((now - new Date(device.lastSeen)) / 1000 / 60);
    }

    // Calculate uptime (simplified - based on status history from audit logs, if available)
    // For now, use a simple connected vs total time estimate
    let uptime7d = device.status === 'connected' ? 95 : 50; // Placeholder
    
    // Count session restarts in last 24h (from audit logs if available)
    const { AdminActionLog } = require("../models");
    let sessionRestarts24h = 0;
    try {
      sessionRestarts24h = await AdminActionLog.count({
        where: {
          targetType: "device",
          targetId: deviceId,
          action: { [Op.or]: ["disconnect_device", "connect_device"] },
          createdAt: { [Op.gte]: last24Hours },
        },
      });
    } catch (e) {
      // AdminActionLog might not have all events, fallback to 0
      sessionRestarts24h = 0;
    }

    // Determine overall health status
    let healthStatus = 'healthy';
    const alerts = [];

    // Check for critical conditions
    if (device.status === 'disconnected') {
      healthStatus = 'warning';
      alerts.push({ type: 'warning', message: 'Device is disconnected' });
    }

    if (stuckDuration && stuckDuration > 30) {
      healthStatus = 'critical';
      alerts.push({ type: 'danger', message: `Stuck in ${device.status} for ${stuckDuration} minutes` });
    } else if (stuckDuration && stuckDuration > 5) {
      healthStatus = 'warning';
      alerts.push({ type: 'warning', message: `In ${device.status} state for ${stuckDuration} minutes` });
    }

    if (lastSeenMinutes && lastSeenMinutes > 60 && device.status === 'connected') {
      healthStatus = 'warning';
      alerts.push({ type: 'warning', message: 'Session may be stale (no activity for 1+ hour)' });
    }

    if (messageSuccessRate < 70) {
      healthStatus = 'critical';
      alerts.push({ type: 'danger', message: `Low message delivery rate: ${messageSuccessRate.toFixed(1)}%` });
    } else if (messageSuccessRate < 90) {
      healthStatus = 'warning';
      alerts.push({ type: 'warning', message: `Message delivery rate: ${messageSuccessRate.toFixed(1)}%` });
    }

    if (sessionRestarts24h > 5) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      alerts.push({ type: 'warning', message: `${sessionRestarts24h} reconnections in last 24h` });
    }

    // Calculate overall score (0-100)
    let overallScore = 100;
    if (device.status !== 'connected') overallScore -= 30;
    if (stuckDuration > 5) overallScore -= 20;
    if (messageSuccessRate < 90) overallScore -= (100 - messageSuccessRate) * 0.3;
    if (sessionRestarts24h > 2) overallScore -= sessionRestarts24h * 3;
    overallScore = Math.max(0, Math.min(100, overallScore));

    res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        phoneNumber: device.phoneNumber ? 
          device.phoneNumber.substring(0, 4) + '****' + device.phoneNumber.slice(-4) : null,
        owner: device.user ? {
          id: device.user.id,
          username: device.user.username,
          fullName: device.user.fullName,
        } : null,
        health: {
          overallScore: Math.round(overallScore),
          status: healthStatus,
          metrics: {
            uptime7d: uptime7d,
            messageSuccessRate: parseFloat(messageSuccessRate.toFixed(1)),
            sessionRestarts24h: sessionRestarts24h,
            stuckDuration: stuckDuration,
            lastSeenMinutes: lastSeenMinutes,
          },
          current: {
            status: device.status,
            isActive: device.isActive,
            lastSeen: device.lastSeen,
          },
          alerts: alerts,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Admin get device health error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get device health",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get user insights and analytics (Admin only)
 * GET /api/admin/users/:userId/insights
 */
const getUserInsights = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "email", "fullName", "role", "isActive", "lastLogin", "createdAt"],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const now = new Date();
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Device stats
    const totalDevices = await WhatsAppSession.count({
      where: { userId: user.id },
    });

    const connectedDevices = await WhatsAppSession.count({
      where: { userId: user.id, status: "connected", isActive: true },
    });

    const devices = await WhatsAppSession.findAll({
      where: { userId: user.id },
      attributes: ["id", "deviceId", "deviceName", "phoneNumber", "status", "isActive", "lastSeen", "createdAt"],
      order: [["lastSeen", "DESC"]],
      limit: 5,
    });

    // Message stats
    const totalMessages = await Message.count({
      where: { userId: user.id },
    });

    const messagesLast7Days = await Message.count({
      where: { userId: user.id, timestamp: { [Op.gte]: last7Days } },
    });

    const messagesLast30Days = await Message.count({
      where: { userId: user.id, timestamp: { [Op.gte]: last30Days } },
    });

    const outgoingMessages = await Message.count({
      where: { userId: user.id, direction: "outgoing" },
    });

    const incomingMessages = await Message.count({
      where: { userId: user.id, direction: "incoming" },
    });

    const failedMessages = await Message.count({
      where: { userId: user.id, status: "failed" },
    });

    // Message success rate
    const messageSuccessRate = outgoingMessages > 0
      ? ((outgoingMessages - failedMessages) / outgoingMessages) * 100
      : 100;

    // Recent messages
    const recentMessages = await Message.findAll({
      where: { userId: user.id },
      attributes: ["id", "toNumber", "messageType", "status", "direction", "timestamp"],
      order: [["timestamp", "DESC"]],
      limit: 10,
    });

    // Contact stats
    const totalContacts = await Contact.count({
      where: { userId: user.id },
    });

    // Group stats
    const sessionIds = devices.map(d => d.id);
    const totalGroups = sessionIds.length > 0 ? await Group.count({
      where: { deviceId: { [Op.in]: devices.map(d => d.deviceId) } },
    }) : 0;

    // Calculate engagement score
    let engagementScore = 0;
    if (connectedDevices > 0) engagementScore += 30;
    if (messagesLast7Days > 0) engagementScore += 30;
    if (messagesLast7Days > 50) engagementScore += 20;
    if (user.lastLogin && new Date(user.lastLogin) > last7Days) engagementScore += 20;
    engagementScore = Math.min(100, engagementScore);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
        insights: {
          engagementScore,
          devices: {
            total: totalDevices,
            connected: connectedDevices,
            recent: devices.map(d => ({
              id: d.id,
              deviceId: d.deviceId,
              deviceName: d.deviceName,
              status: d.status,
              lastSeen: d.lastSeen,
            })),
          },
          messages: {
            total: totalMessages,
            last7Days: messagesLast7Days,
            last30Days: messagesLast30Days,
            outgoing: outgoingMessages,
            incoming: incomingMessages,
            failed: failedMessages,
            successRate: parseFloat(messageSuccessRate.toFixed(1)),
            recent: recentMessages.map(m => ({
              id: m.id,
              toNumber: m.toNumber ? m.toNumber.substring(0, 6) + '***' : null,
              messageType: m.messageType,
              status: m.status,
              direction: m.direction,
              timestamp: m.timestamp,
            })),
          },
          contacts: {
            total: totalContacts,
          },
          groups: {
            total: totalGroups,
          },
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Admin get user insights error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user insights",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  listUsers,
  getUserDetails,
  getUserInsights,
  createUser,
  updateUser,
  deleteUser,
  listDevices,
  getDeviceHealth,
  disconnectDevice,
  deleteDevice,
  listMessages,
  getStats,
  listGroups,
  listContacts,
  listJobs,
  getJobDetails,
  cancelJob,
  pauseJob,
  resumeJob,
  retryJob,
};


