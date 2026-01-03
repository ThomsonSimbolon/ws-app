const whatsappService = require("../services/whatsappService");
const { WhatsAppSession, Message, Contact } = require("../models");
const logger = require("../utils/logger");

const getStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionState = await whatsappService.getSessionStatus(userId);

    // Get session from database
    const dbSession = await WhatsAppSession.findOne({
      where: { userId, isActive: true },
      attributes: ["id", "phoneNumber", "status", "lastSeen"],
    });

    res.json({
      success: true,
      data: {
        status: sessionState.status,
        qrCode: sessionState.qrCode,
        phoneNumber: sessionState.phoneNumber || dbSession?.phoneNumber,
        lastSeen: dbSession?.lastSeen,
        isConnected: sessionState.status === "connected",
      },
    });
  } catch (error) {
    logger.error("Get WhatsApp status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get WhatsApp status",
    });
  }
};

const connect = async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`🔗 WhatsApp connect request received for user ${userId}`);

    const currentState = await whatsappService.getSessionStatus(userId);
    logger.info(`📊 Current session state for user ${userId}:`, currentState);

    if (currentState.status === "connected") {
      logger.info(`✅ User ${userId} already connected to WhatsApp`);
      return res.json({
        success: true,
        message: "WhatsApp already connected",
        data: { status: "connected" },
      });
    }

    // Create new session or regenerate QR
    logger.info(`🚀 Creating new WhatsApp session for user ${userId}`);
    await whatsappService.createSession(userId);

    logger.info(`✅ WhatsApp session creation initiated for user ${userId}`);
    res.json({
      success: true,
      message: "WhatsApp connection initiated. Scan QR code to connect.",
      data: { status: "connecting" },
    });
  } catch (error) {
    logger.error(`❌ WhatsApp connect error for user ${req.user?.id}:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate WhatsApp connection",
    });
  }
};

const regenerateQR = async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(
      `🔄 WhatsApp regenerate QR request received for user ${userId}`
    );

    // WhatsApp Web-style: Request new QR without destroying session
    const result = await whatsappService.regenerateQRCode(userId);

    if (result.success) {
      logger.info(`✅ QR regeneration successful for user ${userId}`);
      res.json({
        success: true,
        message: "New QR code is being generated...",
        data: { status: "regenerating" },
      });
    } else {
      logger.warn(
        `⚠️ QR regeneration failed for user ${userId}: ${result.message}`
      );
      res.status(400).json({
        success: false,
        message: result.message || "Failed to regenerate QR code",
      });
    }
  } catch (error) {
    logger.error(
      `❌ WhatsApp regenerate QR error for user ${req.user?.id}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: "Failed to regenerate QR code",
    });
  }
};

const disconnect = async (req, res) => {
  try {
    const userId = req.user.id;

    await whatsappService.disconnectSession(userId);

    // Update database
    await WhatsAppSession.update(
      { status: "disconnected", isActive: false },
      { where: { userId } }
    );

    res.json({
      success: true,
      message: "WhatsApp disconnected successfully",
    });
  } catch (error) {
    logger.error("WhatsApp disconnect error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disconnect WhatsApp",
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, message, type = "text" } = req.body;

    // Validate phone number format
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    const sentMessage = await whatsappService.sendMessage(
      userId,
      cleanPhone,
      message,
      type
    );

    res.json({
      success: true,
      message: "Message sent successfully",
      data: {
        messageId: sentMessage.key.id,
        to: cleanPhone,
        message,
        type,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Send message error:", error);

    let statusCode = 500;
    let errorMessage = "Failed to send message";

    if (error.message === "WhatsApp session not found") {
      statusCode = 400;
      errorMessage = "WhatsApp not connected. Please connect first.";
    } else if (error.message === "WhatsApp not connected") {
      statusCode = 400;
      errorMessage = "WhatsApp session not active. Please reconnect.";
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, phone } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId };
    if (phone) {
      whereClause.$or = [{ fromNumber: phone }, { toNumber: phone }];
    }

    const messages = await Message.findAndCountAll({
      where: whereClause,
      order: [["timestamp", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        "id",
        "messageId",
        "fromNumber",
        "toNumber",
        "messageType",
        "content",
        "direction",
        "status",
        "timestamp",
      ],
    });

    res.json({
      success: true,
      data: {
        messages: messages.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(messages.count / limit),
          totalMessages: messages.count,
          hasNext: offset + messages.rows.length < messages.count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get messages",
    });
  }
};

const getContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search } = req.query;

    const whereClause = { userId };
    if (search) {
      whereClause.$or = [
        { name: { $like: `%${search}%` } },
        { phoneNumber: { $like: `%${search}%` } },
      ];
    }

    const contacts = await Contact.findAll({
      where: whereClause,
      order: [["name", "ASC"]],
      attributes: ["id", "phoneNumber", "name", "email", "lastMessageAt"],
    });

    res.json({
      success: true,
      data: { contacts },
    });
  } catch (error) {
    logger.error("Get contacts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get contacts",
    });
  }
};

module.exports = {
  getStatus,
  connect,
  regenerateQR,
  disconnect,
  sendMessage,
  getMessages,
  getContacts,
};
