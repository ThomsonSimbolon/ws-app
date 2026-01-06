const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { WhatsAppSession, Message, Contact } = require("../models");
const logger = require("../utils/logger");
const deviceManager = require("./deviceManager");

class WhatsAppService {
  constructor() {
    // New: deviceId-based storage
    this.sessions = new Map(); // deviceId -> socket instance
    this.sessionStates = new Map(); // deviceId -> session state
    this.sseConnections = new Map(); // deviceId -> SSE response objects (or userId for backward compatibility)

    // Legacy: userId-based storage (for backward compatibility)
    this.userIdToDeviceId = new Map(); // userId -> deviceId mapping
  }

  /**
   * Create session for device (NEW - Multi-device support)
   * @param {string} deviceId - Device ID
   * @returns {Promise} Socket instance
   */
  async createSessionForDevice(deviceId) {
    try {
      // Get device info from DeviceManager
      const device = await deviceManager.getDevice(deviceId);
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Check if session already exists and is healthy
      // Only reuse session if status is "connected" (valid and active)
      // For "qr_required" or "connecting" status, cleanup and create fresh session
      // to ensure we get a fresh QR code that hasn't expired
      if (this.sessions.has(deviceId)) {
        const existingSocket = this.sessions.get(deviceId);
        const sessionState = this.sessionStates.get(deviceId);

        // Only reuse session if it's already connected (valid and active)
        if (
          existingSocket &&
          sessionState &&
          sessionState.status === "connected"
        ) {
          logger.info(
            `✅ Healthy connected session exists for device ${deviceId}, reusing existing session`
          );
          return existingSocket;
        } else {
          // Status is qr_required, connecting, disconnected, or unknown
          // Cleanup and create fresh session to get new QR code
          logger.info(
            `🧹 Cleaning up stale/invalid session for device ${deviceId} (status: ${
              sessionState?.status || "unknown"
            })`
          );
          this.cleanupSessionForDevice(deviceId);
        }
      }

      logger.info(`🚀 Creating new WhatsApp session for device ${deviceId}`);
      const sessionDir = path.join(
        process.cwd(),
        "sessions",
        `auth_info_baileys_${deviceId}`
      );

      // Ensure session directory exists
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
        logger.info(`📁 Created session directory for device ${deviceId}`);
      }

      // Initialize session state
      this.sessionStates.set(deviceId, {
        status: "initializing",
        qrCode: null,
        phoneNumber: null,
        lastSeen: new Date(),
        retryCount: 0,
        connectionAttempts: 0,
        isActive: true,
        deviceId: deviceId,
        userId: device.userId,
      });

      // Get auth state with error handling
      let state, saveCreds;
      try {
        const authResult = await useMultiFileAuthState(sessionDir);
        state = authResult.state;
        saveCreds = authResult.saveCreds;
        logger.info(`✅ Auth state loaded for device ${deviceId}`);
      } catch (authError) {
        logger.error(
          `❌ Failed to load auth state for device ${deviceId}:`,
          authError
        );
        // Clear session directory and retry
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
          fs.mkdirSync(sessionDir, { recursive: true });
        }
        const authResult = await useMultiFileAuthState(sessionDir);
        state = authResult.state;
        saveCreds = authResult.saveCreds;
        logger.info(`✅ Auth state recreated for device ${deviceId}`);
      }

      // Get latest Baileys version
      const { version, isLatest } = await fetchLatestBaileysVersion();
      logger.info(
        `📱 Using Baileys version ${version}, is latest: ${isLatest}`
      );

      // Create Baileys-compatible logger
      const baileysLogger = {
        level: "silent",
        child: () => baileysLogger,
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
      };

      // Create socket with improved configuration
      const socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: baileysLogger,
        browser: ["WhatsApp Service", "Chrome", "1.0.0"],
        generateHighQualityLinkPreview: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
        getMessage: async (key) => {
          return undefined;
        },
      });

      // Store session immediately
      this.sessions.set(deviceId, socket);
      this.userIdToDeviceId.set(device.userId, deviceId);

      // Update session state to connecting
      const sessionState = this.sessionStates.get(deviceId);
      sessionState.status = "connecting";
      sessionState.connectionAttempts++;

      logger.info(
        `📡 Session created for device ${deviceId}, setting up event handlers`
      );

      // Setup event handlers
      this.setupEventHandlersForDevice(
        deviceId,
        socket,
        saveCreds,
        device.userId
      );

      return socket;
    } catch (error) {
      logger.error(`❌ Error creating session for device ${deviceId}:`, error);
      this.cleanupSessionForDevice(deviceId);
      throw error;
    }
  }

  /**
   * Generate pairing code for device
   * @param {string} deviceId - Device ID
   * @param {string} phoneNumber - Phone number (normalized, without + or 0)
   * @returns {Promise<string|null>} Pairing code or null if failed
   */
  async generatePairingCodeForDevice(deviceId, phoneNumber) {
    try {
      // Get device info
      const device = await deviceManager.getDevice(deviceId);
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Check if device is already connected
      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState && sessionState.status === "connected") {
        throw new Error("Device sudah terkoneksi");
      }

      // Clean up existing session if any
      if (this.sessions.has(deviceId)) {
        this.cleanupSessionForDevice(deviceId);
      }

      logger.info(
        `🔐 Generating pairing code for device ${deviceId} with phone ${phoneNumber}`
      );

      const sessionDir = path.join(
        process.cwd(),
        "sessions",
        `auth_info_baileys_${deviceId}`
      );

      // Ensure session directory exists
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      // Get auth state
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      // Get latest Baileys version
      const { version } = await fetchLatestBaileysVersion();

      // Create Baileys-compatible logger
      const baileysLogger = {
        level: "silent",
        child: () => baileysLogger,
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
      };

      // Create socket with phoneNumber option for pairing code
      const socket = makeWASocket({
        version,
        auth: state,
        phoneNumber: phoneNumber, // This triggers pairing code mode
        printQRInTerminal: false,
        logger: baileysLogger,
        browser: ["WhatsApp Service", "Chrome", "1.0.0"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        getMessage: async (key) => {
          return undefined;
        },
      });

      // Initialize session state
      this.sessionStates.set(deviceId, {
        status: "pairing",
        qrCode: null,
        phoneNumber: phoneNumber,
        pairingCode: null,
        lastSeen: new Date(),
        deviceId: deviceId,
        userId: device.userId,
      });

      // Wait for pairing code (Baileys will emit it)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.cleanupSessionForDevice(deviceId);
          reject(new Error("Timeout menunggu pairing code"));
        }, 30000); // 30 seconds timeout

        socket.ev.on("connection.update", async (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            // QR code is generated, but we want pairing code
            // Continue waiting
            return;
          }

          if (connection === "open") {
            clearTimeout(timeout);
            this.cleanupSessionForDevice(deviceId);
            reject(new Error("Device sudah terkoneksi"));
            return;
          }

          if (connection === "close") {
            clearTimeout(timeout);
            const shouldReconnect =
              lastDisconnect?.error?.output?.statusCode !== 401;
            if (!shouldReconnect) {
              this.cleanupSessionForDevice(deviceId);
              reject(new Error("Gagal mendapatkan pairing code"));
            }
            return;
          }
        });

        // Listen for pairing code event
        // Note: Baileys doesn't directly emit pairing code, but we can get it from connection.update
        // For now, we'll use a workaround: create session and let user enter code manually
        // The actual pairing code should be displayed in WhatsApp app
        socket.ev.on("creds.update", saveCreds);

        // Store socket temporarily
        this.sessions.set(deviceId, socket);

        // For pairing code, Baileys requires the user to enter the code shown in WhatsApp
        // We return a placeholder message indicating the code will be shown in WhatsApp
        // The actual implementation would require additional Baileys features
        setTimeout(() => {
          clearTimeout(timeout);
          // Pairing code is typically 8 digits shown in WhatsApp
          // Since Baileys doesn't expose it directly, we'll indicate pairing mode is active
          const sessionState = this.sessionStates.get(deviceId);
          if (sessionState) {
            sessionState.status = "pairing";
            sessionState.pairingCode = "WAITING"; // Placeholder
          }
          resolve("WAITING"); // Indicates pairing mode is active
        }, 2000);
      });
    } catch (error) {
      logger.error(
        `❌ Error generating pairing code for device ${deviceId}:`,
        error
      );
      this.cleanupSessionForDevice(deviceId);
      throw error;
    }
  }

  /**
   * Create session for user (LEGACY - Backward compatibility)
   * Wrapper method that gets or creates device for user
   * @param {number} userId - User ID
   * @returns {Promise} Socket instance
   */
  async createSession(userId) {
    try {
      // Get existing device for user or create new one
      const devices = await deviceManager.listDevices(userId);
      let device;

      if (devices.length > 0) {
        // Use first active device
        device = devices.find((d) => d.isActive) || devices[0];
        logger.info(
          `📱 Using existing device ${device.deviceId} for user ${userId}`
        );
      } else {
        // Create new device for user
        logger.info(`🔧 Creating new device for user ${userId}`);
        device = await deviceManager.createDevice(userId, "Device 1");
      }

      // Use device-based session creation
      return await this.createSessionForDevice(device.deviceId);
    } catch (error) {
      logger.error(`❌ Error creating session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * LEGACY METHOD - Maintained for backward compatibility
   * This will use old user-based session directory format
   * @deprecated Use createSessionForDevice instead
   */
  async _createSessionLegacy(userId) {
    try {
      // Check if session already exists and is healthy
      const existingDeviceId = this.userIdToDeviceId.get(userId);
      if (existingDeviceId && this.sessions.has(existingDeviceId)) {
        const existingSocket = this.sessions.get(existingDeviceId);
        const sessionState = this.sessionStates.get(existingDeviceId);

        if (
          existingSocket &&
          sessionState &&
          sessionState.status !== "disconnected"
        ) {
          logger.info(
            `⚠️ Healthy session exists for user ${userId}, reusing existing session`
          );
          return existingSocket;
        }
      }

      logger.info(
        `🚀 Creating new WhatsApp session for user ${userId} (legacy mode)`
      );
      const sessionDir = path.join(process.cwd(), "sessions", `user_${userId}`);

      // Ensure session directory exists
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
        logger.info(`📁 Created session directory for user ${userId}`);
      }

      // Initialize session state first
      this.sessionStates.set(userId, {
        status: "initializing",
        qrCode: null,
        phoneNumber: null,
        lastSeen: new Date(),
        retryCount: 0,
        connectionAttempts: 0,
        isActive: true,
      });

      // Get auth state with error handling
      let state, saveCreds;
      try {
        const authResult = await useMultiFileAuthState(sessionDir);
        state = authResult.state;
        saveCreds = authResult.saveCreds;
        logger.info(`✅ Auth state loaded for user ${userId}`);
      } catch (authError) {
        logger.error(
          `❌ Failed to load auth state for user ${userId}:`,
          authError
        );
        // Clear session directory and retry
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
          fs.mkdirSync(sessionDir, { recursive: true });
        }
        const authResult = await useMultiFileAuthState(sessionDir);
        state = authResult.state;
        saveCreds = authResult.saveCreds;
        logger.info(`✅ Auth state recreated for user ${userId}`);
      }

      // Get latest Baileys version
      const { version, isLatest } = await fetchLatestBaileysVersion();
      logger.info(
        `📱 Using Baileys version ${version}, is latest: ${isLatest}`
      );

      // Create Baileys-compatible logger
      const baileysLogger = {
        level: "silent",
        child: () => baileysLogger,
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
      };

      // Create socket with improved configuration
      const socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: baileysLogger,
        browser: ["WhatsApp Service", "Chrome", "1.0.0"],
        generateHighQualityLinkPreview: true,
        connectTimeoutMs: 60000, // 60 seconds timeout
        defaultQueryTimeoutMs: 60000,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
        getMessage: async (key) => {
          // Handle message retry requests
          return undefined;
        },
      });

      // Store session immediately
      this.sessions.set(userId, socket);

      // Update session state to connecting
      const sessionState = this.sessionStates.get(userId);
      sessionState.status = "connecting";
      sessionState.connectionAttempts++;

      logger.info(
        `📡 Session created for user ${userId}, setting up event handlers`
      );

      // Setup event handlers with improved error handling
      this.setupEventHandlers(userId, socket, saveCreds);

      return socket;
    } catch (error) {
      logger.error(`❌ Error creating session for user ${userId}:`, error);

      // Cleanup on error
      this.cleanupSession(userId);

      // Update session state to error
      this.sessionStates.set(userId, {
        status: "error",
        qrCode: null,
        phoneNumber: null,
        lastSeen: new Date(),
        retryCount: 0,
        connectionAttempts: 0,
        isActive: false,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Setup event handlers for device-based session
   * @param {string} deviceId - Device ID
   * @param {Object} socket - Baileys socket
   * @param {Function} saveCreds - Credentials save function
   * @param {number} userId - User ID (for backward compatibility)
   */
  setupEventHandlersForDevice(deviceId, socket, saveCreds, userId) {
    const sessionState = this.sessionStates.get(deviceId);

    // Connection updates
    socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      logger.info(`🔄 Connection update for device ${deviceId}:`, {
        connection,
        hasQR: !!qr,
        lastDisconnectReason: lastDisconnect?.error?.output?.statusCode,
        currentStatus: sessionState?.status,
        hasSocketUser: !!socket.user,
        phoneNumber: socket.user?.id?.split(":")[0] || null,
      });

      if (qr) {
        logger.info(
          `📱 QR code received in connection.update for device ${deviceId}`
        );
        await this.handleQRCodeGenerationForDevice(deviceId, qr, sessionState);
      }

      if (connection === "close") {
        logger.info(`🔌 Connection closed for device ${deviceId}`);
        await this.handleConnectionCloseForDevice(
          deviceId,
          lastDisconnect,
          sessionState
        );
      }

      if (connection === "open") {
        logger.info(
          `✅ Connection opened for device ${deviceId}, processing...`
        );
        await this.handleConnectionOpenForDevice(
          deviceId,
          socket,
          sessionState
        );
        logger.info(
          `✅ Connection open processing completed for device ${deviceId}`
        );
      }

      if (connection === "connecting") {
        sessionState.status = "connecting";
        logger.info(`🔄 Device ${deviceId} is connecting to WhatsApp`);
        // Update database status to connecting
        try {
          await deviceManager.updateDeviceStatus(deviceId, {
            status: "connecting",
          });
        } catch (error) {
          logger.warn(
            `⚠️ Failed to update connecting status in database for device ${deviceId}:`,
            error.message
          );
        }
      }
    });

    // Save credentials
    socket.ev.on("creds.update", async () => {
      try {
        await saveCreds();
        logger.debug(`💾 Credentials updated for device ${deviceId}`);
      } catch (error) {
        logger.error(
          `❌ Failed to save credentials for device ${deviceId}:`,
          error
        );
      }
    });

    // Message events
    socket.ev.on("messages.upsert", async (messageUpdate) => {
      try {
        const { messages, type } = messageUpdate;
        
        // Process both new messages (notify) and history sync (append)
        if (type === "notify" || type === "append") {
          const isHistory = type === "append";
          
          for (const message of messages) {
            await this.handleIncomingMessageForDevice(deviceId, message, isHistory);
          }
        }
      } catch (error) {
        logger.error(
          `❌ Error handling messages for device ${deviceId}:`,
          error
        );
      }
    });

    // Contacts events
    socket.ev.on("contacts.upsert", async (contacts) => {
      try {
        await this.saveContactsForDevice(deviceId, contacts);
        logger.info(
          `👥 Contacts synced for device ${deviceId}: ${contacts.length} contacts`
        );
      } catch (error) {
        logger.error(
          `❌ Failed to save contacts for device ${deviceId}:`,
          error
        );
      }
    });

    // Connection errors
    socket.ev.on("CB:call", (data) => {
      logger.debug(`📞 Call event for device ${deviceId}:`, data);
    });

    if (socket.ws) {
      socket.ws.on("error", (error) => {
        logger.error(`❌ WebSocket error for device ${deviceId}:`, error);
      });
    }
  }

  /**
   * LEGACY METHOD - Maintained for backward compatibility
   */
  setupEventHandlers(userId, socket, saveCreds) {
    const sessionState = this.sessionStates.get(userId);

    // Connection updates with improved handling
    socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      logger.info(`🔄 Connection update for user ${userId}:`, {
        connection,
        hasQR: !!qr,
        lastDisconnectReason: lastDisconnect?.error?.output?.statusCode,
        currentStatus: sessionState?.status,
      });

      // Handle QR code generation
      if (qr) {
        await this.handleQRCodeGeneration(userId, qr, sessionState);
      }

      // Handle connection states
      if (connection === "close") {
        await this.handleConnectionClose(userId, lastDisconnect, sessionState);
      }

      if (connection === "open") {
        await this.handleConnectionOpen(userId, socket, sessionState);
      }

      if (connection === "connecting") {
        sessionState.status = "connecting";
        logger.info(`🔄 User ${userId} is connecting to WhatsApp`);
      }
    });

    // Save credentials with error handling
    socket.ev.on("creds.update", async () => {
      try {
        await saveCreds();
        logger.debug(`💾 Credentials updated for user ${userId}`);
      } catch (error) {
        logger.error(
          `❌ Failed to save credentials for user ${userId}:`,
          error
        );
      }
    });

    // Message events
    socket.ev.on("messages.upsert", async (messageUpdate) => {
      try {
        const { messages, type } = messageUpdate;

        if (type === "notify") {
          for (const message of messages) {
            await this.handleIncomingMessage(userId, message);
          }
        }
      } catch (error) {
        logger.error(`❌ Error handling messages for user ${userId}:`, error);
      }
    });

    // Handle connection errors
    socket.ev.on("CB:call", (data) => {
      logger.debug(`📞 Call event for user ${userId}:`, data);
    });

    // Add socket error handling
    if (socket.ws) {
      socket.ws.on("error", (error) => {
        logger.error(`❌ WebSocket error for user ${userId}:`, error);
      });
    }
  }

  /**
   * Handle QR code generation for device
   */
  async handleQRCodeGenerationForDevice(deviceId, qr, sessionState) {
    try {
      logger.info(`🔄 QR Code generation started for device ${deviceId}`);

      const qrCodeData = await QRCode.toDataURL(qr);
      logger.info(
        `📱 QR Code generated successfully for device ${deviceId} (length: ${qrCodeData.length})`
      );

      if (sessionState.qrCode === qrCodeData) {
        logger.info(
          `🔄 Duplicate QR Code for device ${deviceId}, skipping update`
        );
        return;
      }

      // Update session state first
      sessionState.qrCode = qrCodeData;
      sessionState.status = "qr_required";
      sessionState.lastSeen = new Date();
      logger.info(
        `💾 Session state updated for device ${deviceId}: status=qr_required`
      );

      // Send QR to SSE clients (support both deviceId and userId)
      const userId = sessionState.userId;
      if (userId) {
        this.sendSSEUpdate(userId, {
          type: "qr-code",
          data: qrCodeData,
          timestamp: new Date().toISOString(),
        });
        logger.info(
          `📡 QR Code sent via SSE to user ${userId} for device ${deviceId}`
        );
      }

      // Update database via DeviceManager with error handling
      try {
        await deviceManager.updateDeviceStatus(deviceId, {
          status: "qr_required",
          qrCode: qrCodeData,
        });
        logger.info(`💾 QR Code saved to database for device ${deviceId}`);
      } catch (dbError) {
        logger.error(
          `❌ Failed to save QR code to database for device ${deviceId}:`,
          dbError
        );
        // Don't throw - QR code is still available in session state
      }
    } catch (qrError) {
      logger.error(`❌ QR generation error for device ${deviceId}:`, qrError);
      const userId = sessionState.userId;
      if (userId) {
        this.sendSSEUpdate(userId, {
          type: "error",
          data: { message: "Failed to generate QR code" },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  async handleQRCodeGeneration(userId, qr, sessionState) {
    try {
      // Check if this is a duplicate QR code
      const qrCodeData = await QRCode.toDataURL(qr);

      if (sessionState.qrCode === qrCodeData) {
        logger.info(`🔄 Duplicate QR Code for user ${userId}, skipping`);
        return;
      }

      logger.info(`📱 QR Code generated for user ${userId}`, {
        qrCodeLength: qrCodeData.length,
        qrCodePreview: qrCodeData.substring(0, 50) + "...",
        previousQR: !!sessionState.qrCode,
      });

      // Update session state
      sessionState.qrCode = qrCodeData;
      sessionState.status = "qr_required";
      sessionState.lastSeen = new Date();

      // Send QR to SSE clients
      this.sendSSEUpdate(userId, {
        type: "qr-code",
        data: qrCodeData,
        timestamp: new Date().toISOString(),
      });

      logger.info(`📡 QR Code sent via SSE to user ${userId}`);

      // Update database
      await this.updateSessionInDB(userId, {
        status: "qr_required",
        qrCode: qrCodeData,
      });

      logger.info(`💾 QR Code saved to database for user ${userId}`);
    } catch (qrError) {
      logger.error(`❌ QR generation error for user ${userId}:`, qrError);

      // Send error notification via SSE
      this.sendSSEUpdate(userId, {
        type: "error",
        data: { message: "Failed to generate QR code" },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async handleConnectionClose(userId, lastDisconnect, sessionState) {
    const shouldReconnect =
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    const disconnectReason = lastDisconnect?.error?.output?.statusCode;

    logger.info(`🔌 Connection closed for user ${userId}`, {
      reason: disconnectReason,
      shouldReconnect,
      retryCount: sessionState.retryCount,
    });

    if (shouldReconnect && sessionState.retryCount < 5) {
      sessionState.retryCount++;
      sessionState.status = "reconnecting";

      logger.info(
        `🔄 Reconnecting session for user ${userId}, attempt ${sessionState.retryCount}`
      );

      // Send status update
      this.sendSSEUpdate(userId, {
        type: "connection-status",
        data: { status: "reconnecting", attempt: sessionState.retryCount },
        timestamp: new Date().toISOString(),
      });

      // Reconnect with delay
      setTimeout(async () => {
        try {
          await this.createSession(userId);
        } catch (error) {
          logger.error(`❌ Reconnection failed for user ${userId}:`, error);
        }
      }, 3000 * sessionState.retryCount); // Incremental delay
    } else {
      logger.info(
        `❌ Session closed permanently for user ${userId}, not reconnecting`
      );

      if (!shouldReconnect) {
        this.removeSessionFiles(userId);
      }

      sessionState.status = "disconnected";
      sessionState.isActive = false;

      this.sendSSEUpdate(userId, {
        type: "connection-status",
        data: { status: "disconnected", reason: disconnectReason },
        timestamp: new Date().toISOString(),
      });

      await this.updateSessionInDB(userId, {
        status: "disconnected",
        isActive: false,
      });

      // Clean up session after permanent disconnect
      this.cleanupSession(userId);
    }
  }

  /**
   * Handle connection open for device
   */
  async handleConnectionOpenForDevice(deviceId, socket, sessionState) {
    logger.info(`✅ WhatsApp connected for device ${deviceId}`);

    try {
      // Wait for socket.user to be available (with retry logic)
      let phoneNumber = null;
      let deviceInfo = null;
      let retryCount = 0;
      const maxRetries = 10;
      const retryDelay = 500; // 500ms

      while (retryCount < maxRetries && !socket.user) {
        logger.info(
          `⏳ Waiting for socket.user for device ${deviceId}, attempt ${
            retryCount + 1
          }/${maxRetries}`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryCount++;
      }

      if (socket.user) {
        phoneNumber = socket.user.id?.split(":")[0] || null;
        deviceInfo = {
          id: socket.user.id,
          name: socket.user.name,
        };
        logger.info(
          `📱 Phone number extracted for device ${deviceId}: ${phoneNumber}`
        );
      } else {
        logger.warn(
          `⚠️ socket.user not available after ${maxRetries} retries for device ${deviceId}`
        );
        // Try to get phone number from existing session state or database
        const existingDevice = await deviceManager.getDevice(deviceId);
        if (existingDevice && existingDevice.phoneNumber) {
          phoneNumber = existingDevice.phoneNumber;
          logger.info(
            `📱 Using existing phone number from database: ${phoneNumber}`
          );
        }
      }

      // Update session state
      sessionState.status = "connected";
      sessionState.qrCode = null;
      sessionState.retryCount = 0;
      sessionState.phoneNumber = phoneNumber;
      sessionState.isActive = true;
      sessionState.lastSeen = new Date();

      const userId = sessionState.userId;

      // Send connection success update
      if (userId) {
        this.sendSSEUpdate(userId, {
          type: "connection-status",
          data: {
            status: "connected",
            phoneNumber: phoneNumber,
          },
          timestamp: new Date().toISOString(),
        });
        logger.info(
          `📡 SSE update sent to user ${userId} for device ${deviceId}`
        );
      }

      // Update database via DeviceManager with error handling
      try {
        await deviceManager.updateDeviceStatus(deviceId, {
          status: "connected",
          phoneNumber: phoneNumber,
          qrCode: null,
          isActive: true,
          deviceInfo: deviceInfo,
          lastSeen: new Date(),
        });
        logger.info(
          `💾 Connection status updated in database for device ${deviceId} with phone ${phoneNumber}`
        );
      } catch (dbError) {
        logger.error(
          `❌ Failed to update database for device ${deviceId}:`,
          dbError
        );
        // Don't throw - connection is still successful even if DB update fails
        // But log it for monitoring
      }

      logger.info(
        `✅ Device ${deviceId} connection process completed successfully`
      );
    } catch (error) {
      logger.error(
        `❌ Error in handleConnectionOpenForDevice for device ${deviceId}:`,
        error
      );
      // Update session state to error but don't throw
      sessionState.status = "error";
      sessionState.error = error.message;
    }
  }

  /**
   * Handle connection close for device
   */
  async handleConnectionCloseForDevice(deviceId, lastDisconnect, sessionState) {
    const shouldReconnect =
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    const disconnectReason = lastDisconnect?.error?.output?.statusCode;

    logger.info(`🔌 Connection closed for device ${deviceId}`, {
      reason: disconnectReason,
      shouldReconnect,
      retryCount: sessionState.retryCount,
    });

    const userId = sessionState.userId;

    if (shouldReconnect && sessionState.retryCount < 5) {
      sessionState.retryCount++;
      sessionState.status = "reconnecting";

      logger.info(
        `🔄 Reconnecting session for device ${deviceId}, attempt ${sessionState.retryCount}`
      );

      if (userId) {
        this.sendSSEUpdate(userId, {
          type: "connection-status",
          data: { status: "reconnecting", attempt: sessionState.retryCount },
          timestamp: new Date().toISOString(),
        });
      }

      // Reconnect with delay
      setTimeout(async () => {
        try {
          await this.createSessionForDevice(deviceId);
        } catch (error) {
          logger.error(`❌ Reconnection failed for device ${deviceId}:`, error);
        }
      }, 3000 * sessionState.retryCount);
    } else {
      logger.info(
        `❌ Session closed permanently for device ${deviceId}, not reconnecting`
      );

      if (!shouldReconnect) {
        this.removeSessionFilesForDevice(deviceId);
      }

      sessionState.status = "disconnected";
      sessionState.isActive = false;

      if (userId) {
        this.sendSSEUpdate(userId, {
          type: "connection-status",
          data: { status: "disconnected", reason: disconnectReason },
          timestamp: new Date().toISOString(),
        });
      }

      await deviceManager.updateDeviceStatus(deviceId, {
        status: "disconnected",
        isActive: false,
      });

      this.cleanupSessionForDevice(deviceId);
    }
  }

  /**
   * Handle incoming message for device
   * @param {string} deviceId
   * @param {Object} message
   * @param {boolean} isHistory - If true, skip real-time notifications
   */
  async handleIncomingMessageForDevice(deviceId, message, isHistory = false) {
    try {
      const sessionState = this.sessionStates.get(deviceId);
      if (!sessionState) return;

      const remoteJid = message.key.remoteJid;
      const fromMe = message.key.fromMe;
      const messageContent =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        (message.message?.imageMessage ? "[Image]" : null) ||
        (message.message?.videoMessage ? "[Video]" : null) ||
        (message.message?.documentMessage ? "[Document]" : null) ||
        (message.message?.audioMessage ? "[Audio]" : null) ||
        (message.message?.stickerMessage ? "[Sticker]" : null) ||
        "[Media]";

      const userId = sessionState.userId;
      if (!userId) return;

      // Get session ID from database
      const sessionId = await this.getSessionIdFromDBForDevice(deviceId);

      // Filter out status updates (stories)
      if (remoteJid === "status@broadcast") return;

      // Save message to database
      try {
        await Message.create({
          userId,
          sessionId: sessionId,
          messageId: message.key.id,
          fromNumber: fromMe ? sessionState.phoneNumber : remoteJid.split("@")[0],
          toNumber: fromMe ? remoteJid.split("@")[0] : sessionState.phoneNumber,
          messageType: "text", // TODO: Detect type better
          content: messageContent,
          direction: fromMe ? "outgoing" : "incoming",
          status: "delivered",
          timestamp: new Date(message.messageTimestamp * 1000),
          metadata: {
            key: message.key,
            pushName: message.pushName,
          },
        });
      } catch (dbError) {
        // Ignore unique constraint errors (duplicates)
        if (dbError.name !== 'SequelizeUniqueConstraintError') {
          // logger.warn(`Failed to save message ${message.key.id}: ${dbError.message}`);
        }
      }

      // Send to SSE clients ONLY if NOT history
      if (!isHistory) {
        this.sendSSEUpdate(userId, {
          type: "new-message",
          data: {
            from: fromMe ? "me" : remoteJid,
            message: messageContent,
            timestamp: new Date(message.messageTimestamp * 1000).toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error(
        `Error handling incoming message for device ${deviceId}:`,
        error
      );
    }
  }

  async handleConnectionOpen(userId, socket, sessionState) {
    logger.info(`✅ WhatsApp connected for user ${userId}`);

    sessionState.status = "connected";
    sessionState.qrCode = null;
    sessionState.retryCount = 0;
    sessionState.phoneNumber = socket.user?.id.split(":")[0];
    sessionState.isActive = true;
    sessionState.lastSeen = new Date();

    // Send connection success update
    this.sendSSEUpdate(userId, {
      type: "connection-status",
      data: {
        status: "connected",
        phoneNumber: sessionState.phoneNumber,
      },
      timestamp: new Date().toISOString(),
    });

    // Update database
    await this.updateSessionInDB(userId, {
      status: "connected",
      phoneNumber: sessionState.phoneNumber,
      qrCode: null,
      isActive: true,
      deviceInfo: {
        id: socket.user?.id,
        name: socket.user?.name,
      },
    });

    logger.info(`💾 Connection status updated in database for user ${userId}`);
  }

  async handleIncomingMessage(userId, message) {
    try {
      const remoteJid = message.key.remoteJid;
      const fromMe = message.key.fromMe;
      const messageContent =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        "[Media]";

      // Save message to database
      await Message.create({
        userId,
        sessionId: await this.getSessionIdFromDB(userId),
        messageId: message.key.id,
        fromNumber: fromMe
          ? this.sessionStates.get(userId)?.phoneNumber
          : remoteJid.split("@")[0],
        toNumber: fromMe
          ? remoteJid.split("@")[0]
          : this.sessionStates.get(userId)?.phoneNumber,
        messageType: "text",
        content: messageContent,
        direction: fromMe ? "outgoing" : "incoming",
        status: "delivered",
        timestamp: new Date(message.messageTimestamp * 1000),
        metadata: {
          key: message.key,
          pushName: message.pushName,
        },
      });

      // Send to SSE clients
      this.sendSSEUpdate(userId, {
        type: "new-message",
        data: {
          from: fromMe ? "me" : remoteJid,
          message: messageContent,
          timestamp: new Date(message.messageTimestamp * 1000).toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        `Error handling incoming message for user ${userId}:`,
        error
      );
    }
  }

  /**
   * Send message using deviceId
   */
  async sendMessageForDevice(deviceId, phoneNumber, message, type = "text") {
    try {
      const socket = this.sessions.get(deviceId);
      if (!socket) {
        throw new Error("WhatsApp session not found for device");
      }

      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState?.status !== "connected") {
        throw new Error("WhatsApp not connected");
      }

      const jid = `${phoneNumber}@s.whatsapp.net`;

      let sentMessage;
      switch (type) {
        case "text":
          sentMessage = await socket.sendMessage(jid, { text: message });
          break;
        default:
          throw new Error("Unsupported message type");
      }

      // Save to database
      const sessionId = await this.getSessionIdFromDBForDevice(deviceId);
      await Message.create({
        userId: sessionState.userId,
        sessionId: sessionId,
        messageId: sentMessage.key.id,
        fromNumber: sessionState.phoneNumber,
        toNumber: phoneNumber,
        messageType: type,
        content: message,
        direction: "outgoing",
        status: "sent",
        timestamp: new Date(),
        metadata: { key: sentMessage.key },
      });

      return sentMessage;
    } catch (error) {
      logger.error(`Error sending message for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Send media message using deviceId
   * @param {string} deviceId - Device ID
   * @param {string} phoneNumber - Phone number (normalized)
   * @param {string} mediaType - Media type: 'image', 'video', 'document'
   * @param {Buffer|string} mediaData - Media data (Buffer, base64 string, or file path)
   * @param {string} caption - Caption (optional)
   * @param {string} fileName - File name (optional, for documents)
   * @param {string} mimetype - MIME type (optional)
   * @returns {Promise} Sent message object
   */
  async sendMediaForDevice(
    deviceId,
    phoneNumber,
    mediaType,
    mediaData,
    caption = null,
    fileName = null,
    mimetype = null
  ) {
    try {
      const socket = this.sessions.get(deviceId);
      if (!socket) {
        throw new Error("WhatsApp session not found for device");
      }

      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState?.status !== "connected") {
        throw new Error("WhatsApp not connected");
      }

      const jid = `${phoneNumber}@s.whatsapp.net`;
      let mediaBuffer;

      // Handle different media data formats
      if (Buffer.isBuffer(mediaData)) {
        // Already a Buffer
        mediaBuffer = mediaData;
      } else if (typeof mediaData === "string") {
        if (mediaData.startsWith("data:")) {
          // Base64 data URL
          const base64Data = mediaData.split(",")[1];
          mediaBuffer = Buffer.from(base64Data, "base64");
        } else if (fs.existsSync(mediaData)) {
          // File path
          mediaBuffer = fs.readFileSync(mediaData);
        } else {
          throw new Error("Invalid media data format");
        }
      } else {
        throw new Error("Invalid media data format");
      }

      // Determine MIME type if not provided
      if (!mimetype) {
        switch (mediaType) {
          case "image":
            mimetype = "image/jpeg"; // Default
            break;
          case "video":
            mimetype = "video/mp4"; // Default
            break;
          case "document":
            mimetype = "application/pdf"; // Default
            break;
          default:
            mimetype = "application/octet-stream";
        }
      }

      // Prepare message content based on media type
      let messageContent = {};
      switch (mediaType) {
        case "image":
          messageContent = {
            image: mediaBuffer,
            caption: caption || undefined,
            mimetype: mimetype,
          };
          break;
        case "video":
          messageContent = {
            video: mediaBuffer,
            caption: caption || undefined,
            mimetype: mimetype,
          };
          break;
        case "document":
          messageContent = {
            document: mediaBuffer,
            mimetype: mimetype,
            fileName: fileName || `file.${mimetype.split("/")[1]}`,
            caption: caption || undefined,
          };
          break;
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }

      // Send message
      const sentMessage = await socket.sendMessage(jid, messageContent);

      // Save to database
      const sessionId = await this.getSessionIdFromDBForDevice(deviceId);
      await Message.create({
        userId: sessionState.userId,
        sessionId: sessionId,
        messageId: sentMessage.key.id,
        fromNumber: sessionState.phoneNumber,
        toNumber: phoneNumber,
        messageType: mediaType,
        content: caption || "[Media]",
        direction: "outgoing",
        status: "sent",
        timestamp: new Date(),
        metadata: {
          key: sentMessage.key,
          fileName: fileName,
          mimetype: mimetype,
        },
      });

      logger.info(
        `✅ Media ${mediaType} sent to ${phoneNumber} from device ${deviceId}`
      );

      return sentMessage;
    } catch (error) {
      logger.error(`Error sending media for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Download media from URL
   * @param {string} url - Media URL
   * @returns {Promise<Buffer>} Media buffer
   */
  async downloadMediaFromURL(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 30000, // 30 seconds timeout
        maxContentLength: 16 * 1024 * 1024, // 16MB max
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error(`Error downloading media from URL ${url}:`, error);
      throw new Error(`Failed to download media from URL: ${error.message}`);
    }
  }

  /**
   * Get contacts list for device
   * @param {string} deviceId - Device ID
   * @returns {Promise<Array>} Array of contacts
   */
  async getContactsForDevice(deviceId) {
    try {
      const socket = this.sessions.get(deviceId);
      if (!socket) {
        throw new Error("WhatsApp session not found for device");
      }

      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState?.status !== "connected") {
        throw new Error("WhatsApp not connected");
      }

      // Get contacts from Baileys store
      // Baileys stores contacts in socket.store.contacts as a Map-like structure
      const contactsMap = socket.store?.contacts || {};

      // Convert to array format
      // Baileys contacts structure: { [jid]: { id, notify, name, verifiedName, ... } }
      const contactsArray = [];

      for (const jid in contactsMap) {
        const contact = contactsMap[jid];
        if (contact && jid && !jid.includes("@g.us")) {
          // Exclude groups
          contactsArray.push({
            id: jid,
            name: contact.name || contact.notify || null,
            notify: contact.notify || null,
            verifiedName: contact.verifiedName || null,
          });
        }
      }

      logger.info(
        `✅ Retrieved ${contactsArray.length} contacts for device ${deviceId}`
      );

      return contactsArray;
    } catch (error) {
      logger.error(`Error getting contacts for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Create group
   */
  async createGroupForDevice(deviceId, subject, participants = []) {
    try {
      const socket = this.sessions.get(deviceId);
      if (!socket) {
        throw new Error("WhatsApp session not found for device");
      }

      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState?.status !== "connected") {
        throw new Error("WhatsApp not connected");
      }

      // Convert phone numbers to JIDs
      const participantJids = participants.map((p) => {
        const cleanPhone = p.replace(/\D/g, "");
        return `${cleanPhone}@s.whatsapp.net`;
      });

      // Create group using Baileys
      const group = await socket.groupCreate(subject, participantJids);

      logger.info(`✅ Group created: ${group} for device ${deviceId}`);

      return group;
    } catch (error) {
      logger.error(`Error creating group for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get group metadata
   */
  async getGroupMetadataForDevice(deviceId, groupId) {
    try {
      const socket = this.sessions.get(deviceId);
      if (!socket) {
        throw new Error("WhatsApp session not found for device");
      }

      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState?.status !== "connected") {
        throw new Error("WhatsApp not connected");
      }

      const metadata = await socket.groupMetadata(groupId);

      return metadata;
    } catch (error) {
      logger.error(
        `Error getting group metadata for device ${deviceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Send message to group
   */
  async sendGroupMessageForDevice(deviceId, groupId, message) {
    try {
      const socket = this.sessions.get(deviceId);
      if (!socket) {
        throw new Error("WhatsApp session not found for device");
      }

      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState?.status !== "connected") {
        throw new Error("WhatsApp not connected");
      }

      const sentMessage = await socket.sendMessage(groupId, { text: message });

      logger.info(
        `✅ Group message sent to ${groupId} from device ${deviceId}`
      );

      return sentMessage;
    } catch (error) {
      logger.error(
        `Error sending group message for device ${deviceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Send mention message to group
   * @param {string} deviceId - Device ID
   * @param {string} groupId - Group ID
   * @param {string} message - Message text with placeholders
   * @param {Array<string>} mentions - Array of JIDs to mention
   * @returns {Promise} Sent message object
   */
  async sendGroupMentionMessageForDevice(deviceId, groupId, message, mentions) {
    try {
      const socket = this.sessions.get(deviceId);
      if (!socket) {
        throw new Error("WhatsApp session not found for device");
      }

      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState?.status !== "connected") {
        throw new Error("WhatsApp not connected");
      }

      // Parse placeholders in message
      let processedMessage = message;

      // Replace {mentions} with all mentions
      if (processedMessage.includes("{mentions}")) {
        const mentionsText = mentions.join(" ");
        processedMessage = processedMessage.replace(
          /{mentions}/g,
          mentionsText
        );
      }

      // Replace {m1}, {m2}, etc. (1-based index)
      mentions.forEach((mention, index) => {
        const placeholder = `{m${index + 1}}`;
        processedMessage = processedMessage.replace(
          new RegExp(`\\{m${index + 1}\\}`, "g"),
          mention.split("@")[0] // Just the phone number part
        );
      });

      // Replace {mention1}, {mention2}, etc. (1-based index)
      mentions.forEach((mention, index) => {
        const placeholder = `{mention${index + 1}}`;
        processedMessage = processedMessage.replace(
          new RegExp(`\\{mention${index + 1}\\}`, "g"),
          mention.split("@")[0]
        );
      });

      // Replace {mention[0]}, {mention[1]}, etc. (0-based index)
      mentions.forEach((mention, index) => {
        const placeholder = `{mention[${index}]}`;
        processedMessage = processedMessage.replace(
          new RegExp(`\\{mention\\[${index}\\]\\}`, "g"),
          mention.split("@")[0]
        );
      });

      // Send message with mentions
      const sentMessage = await socket.sendMessage(groupId, {
        text: processedMessage,
        mentions: mentions, // Baileys mentions array
      });

      logger.info(
        `✅ Mention message sent to ${groupId} from device ${deviceId}`
      );

      return sentMessage;
    } catch (error) {
      logger.error(
        `Error sending mention message for device ${deviceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Send media message to group
   * @param {string} deviceId - Device ID
   * @param {string} groupId - Group ID
   * @param {string} mediaType - Media type: 'image', 'video', 'document'
   * @param {Buffer|string} mediaData - Media data (Buffer, base64 string, or file path)
   * @param {string} caption - Caption (optional)
   * @param {string} fileName - File name (optional, for documents)
   * @param {string} mimetype - MIME type (optional)
   * @returns {Promise} Sent message object
   */
  async sendGroupMediaForDevice(
    deviceId,
    groupId,
    mediaType,
    mediaData,
    caption = null,
    fileName = null,
    mimetype = null
  ) {
    try {
      const socket = this.sessions.get(deviceId);
      if (!socket) {
        throw new Error("WhatsApp session not found for device");
      }

      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState?.status !== "connected") {
        throw new Error("WhatsApp not connected");
      }

      let mediaBuffer;

      // Handle different media data formats
      if (Buffer.isBuffer(mediaData)) {
        // Already a Buffer
        mediaBuffer = mediaData;
      } else if (typeof mediaData === "string") {
        if (mediaData.startsWith("data:")) {
          // Base64 data URL
          const base64Data = mediaData.split(",")[1];
          mediaBuffer = Buffer.from(base64Data, "base64");
        } else if (fs.existsSync(mediaData)) {
          // File path
          mediaBuffer = fs.readFileSync(mediaData);
        } else {
          throw new Error("Invalid media data format");
        }
      } else {
        throw new Error("Invalid media data format");
      }

      // Determine MIME type if not provided
      if (!mimetype) {
        switch (mediaType) {
          case "image":
            mimetype = "image/jpeg"; // Default
            break;
          case "video":
            mimetype = "video/mp4"; // Default
            break;
          case "document":
            mimetype = "application/pdf"; // Default
            break;
          default:
            mimetype = "application/octet-stream";
        }
      }

      // Prepare message content based on media type
      let messageContent = {};
      switch (mediaType) {
        case "image":
          messageContent = {
            image: mediaBuffer,
            caption: caption || undefined,
            mimetype: mimetype,
          };
          break;
        case "video":
          messageContent = {
            video: mediaBuffer,
            caption: caption || undefined,
            mimetype: mimetype,
          };
          break;
        case "document":
          messageContent = {
            document: mediaBuffer,
            mimetype: mimetype,
            fileName: fileName || `file.${mimetype.split("/")[1]}`,
            caption: caption || undefined,
          };
          break;
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }

      // Send message to group
      const sentMessage = await socket.sendMessage(groupId, messageContent);

      logger.info(
        `✅ Group media ${mediaType} sent to ${groupId} from device ${deviceId}`
      );

      return sentMessage;
    } catch (error) {
      logger.error(`Error sending group media for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Update group participants (invite/kick)
   */
  async updateGroupParticipantsForDevice(
    deviceId,
    groupId,
    participants,
    action
  ) {
    try {
      const socket = this.sessions.get(deviceId);
      if (!socket) {
        throw new Error("WhatsApp session not found for device");
      }

      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState?.status !== "connected") {
        throw new Error("WhatsApp not connected");
      }

      // Convert phone numbers to JIDs
      const participantJids = participants.map((p) => {
        const cleanPhone = p.replace(/\D/g, "");
        return `${cleanPhone}@s.whatsapp.net`;
      });

      // Update participants (add or remove)
      const result = await socket.groupParticipantsUpdate(
        groupId,
        participantJids,
        action
      );

      logger.info(`✅ Group participants updated for ${groupId}: ${action}`);

      return result;
    } catch (error) {
      logger.error(
        `Error updating group participants for device ${deviceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Update group admins (promote/demote)
   */
  async updateGroupAdminsForDevice(deviceId, groupId, participantJids, action) {
    try {
      const socket = this.sessions.get(deviceId);
      if (!socket) {
        throw new Error("WhatsApp session not found for device");
      }

      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState?.status !== "connected") {
        throw new Error("WhatsApp not connected");
      }

      // Update admins
      const result = await socket.groupParticipantsUpdate(
        groupId,
        participantJids,
        action
      );

      logger.info(`✅ Group admins updated for ${groupId}: ${action}`);

      return result;
    } catch (error) {
      logger.error(
        `Error updating group admins for device ${deviceId}:`,
        error
      );
      throw error;
    }
  }

  async sendMessage(userId, phoneNumber, message, type = "text") {
    try {
      // Try to find deviceId for this user
      const deviceId = this.userIdToDeviceId.get(userId);
      if (deviceId) {
        return await this.sendMessageForDevice(
          deviceId,
          phoneNumber,
          message,
          type
        );
      }

      // Fallback to legacy method
      const socket = this.sessions.get(userId);
      if (!socket) {
        throw new Error("WhatsApp session not found");
      }

      const sessionState = this.sessionStates.get(userId);
      if (sessionState?.status !== "connected") {
        throw new Error("WhatsApp not connected");
      }

      const jid = `${phoneNumber}@s.whatsapp.net`;

      let sentMessage;
      switch (type) {
        case "text":
          sentMessage = await socket.sendMessage(jid, { text: message });
          break;
        // Add more message types later (image, document, etc.)
        default:
          throw new Error("Unsupported message type");
      }

      // Save to database
      await Message.create({
        userId,
        sessionId: await this.getSessionIdFromDB(userId),
        messageId: sentMessage.key.id,
        fromNumber: sessionState.phoneNumber,
        toNumber: phoneNumber,
        messageType: type,
        content: message,
        direction: "outgoing",
        status: "sent",
        timestamp: new Date(),
        metadata: { key: sentMessage.key },
      });

      return sentMessage;
    } catch (error) {
      logger.error(`Error sending message for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get session ID from database using deviceId
   */
  async getSessionIdFromDBForDevice(deviceId) {
    const session = await WhatsAppSession.findOne({
      where: { deviceId, isActive: true },
      attributes: ["id"],
    });
    return session?.id;
  }

  async getSessionIdFromDB(userId) {
    const session = await WhatsAppSession.findOne({
      where: { userId, isActive: true },
      attributes: ["id"],
    });
    return session?.id;
  }

  async updateSessionInDB(userId, updates) {
    try {
      await WhatsAppSession.upsert({
        userId,
        sessionId: `session_${userId}_${Date.now()}`,
        ...updates,
        lastSeen: new Date(),
      });
    } catch (error) {
      logger.error(`Error updating session in DB for user ${userId}:`, error);
    }
  }

  /**
   * Get session status for device
   * Prioritizes session state in memory, falls back to database
   */
  async getSessionStatusForDevice(deviceId) {
    // First, try to get from session state (in-memory, most up-to-date)
    const sessionState = this.sessionStates.get(deviceId);
    if (sessionState) {
      return {
        status: sessionState.status || "disconnected",
        qrCode: sessionState.qrCode || null,
        phoneNumber: sessionState.phoneNumber || null,
        lastSeen: sessionState.lastSeen || null,
        isActive: sessionState.isActive !== false,
      };
    }

    // Fallback to database if session state not available
    try {
      const device = await deviceManager.getDevice(deviceId);
      if (device) {
        return {
          status: device.status || "disconnected",
          qrCode: null, // QR code is not stored in database long-term
          phoneNumber: device.phoneNumber || null,
          lastSeen: device.lastSeen || null,
          isActive: device.isActive !== false,
        };
      }
    } catch (error) {
      logger.warn(
        `⚠️ Error getting device status from database for ${deviceId}:`,
        error.message
      );
    }

    // Default fallback
    return {
      status: "disconnected",
      qrCode: null,
      phoneNumber: null,
      lastSeen: null,
      isActive: false,
    };
  }

  /**
   * Get session status (LEGACY - for backward compatibility)
   */
  async getSessionStatus(userId) {
    // Try to find deviceId for this user
    const deviceId = this.userIdToDeviceId.get(userId);
    if (deviceId) {
      return await this.getSessionStatusForDevice(deviceId);
    }

    // Fallback to legacy userId-based lookup
    const sessionState = this.sessionStates.get(userId);
    if (sessionState) {
      return {
        status: sessionState.status || "disconnected",
        qrCode: sessionState.qrCode || null,
        phoneNumber: sessionState.phoneNumber || null,
        lastSeen: sessionState.lastSeen || null,
        isActive: sessionState.isActive !== false,
      };
    }

    // Default fallback
    return {
      status: "disconnected",
      qrCode: null,
      phoneNumber: null,
      lastSeen: null,
      isActive: false,
    };
  }

  /**
   * Disconnect session for device
   */
  async disconnectSessionForDevice(deviceId) {
    try {
      const socket = this.sessions.get(deviceId);
      if (socket) {
        try {
          await socket.logout();
        } catch (logoutError) {
          logger.warn(
            `Error logging out device ${deviceId}:`,
            logoutError.message
          );
        }
      }
      this.cleanupSessionForDevice(deviceId);
    } catch (error) {
      logger.error(
        `Error disconnecting session for device ${deviceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Disconnect session (LEGACY - for backward compatibility)
   */
  async disconnectSession(userId) {
    try {
      // Try to find deviceId for this user
      const deviceId = this.userIdToDeviceId.get(userId);
      if (deviceId) {
        return await this.disconnectSessionForDevice(deviceId);
      }

      // Fallback to legacy method
      const socket = this.sessions.get(userId);
      if (socket) {
        await socket.logout();
      }
      this.cleanupSession(userId);
    } catch (error) {
      logger.error(`Error disconnecting session for user ${userId}:`, error);
    }
  }

  /**
   * Cleanup session for device
   */
  cleanupSessionForDevice(deviceId) {
    try {
      logger.info(`🧹 Cleaning up session for device ${deviceId}`);

      const socket = this.sessions.get(deviceId);
      if (socket) {
        try {
          if (socket.ws && socket.ws.readyState === 1) {
            socket.ws.close();
          }
        } catch (error) {
          logger.warn(
            `⚠️ Error closing WebSocket for device ${deviceId}:`,
            error.message
          );
        }
      }

      this.sessions.delete(deviceId);

      const sessionState = this.sessionStates.get(deviceId);
      if (sessionState) {
        sessionState.status = "disconnected";
        sessionState.isActive = false;
        sessionState.lastSeen = new Date();
      }

      // Clean up userId mapping
      if (sessionState?.userId) {
        const userId = sessionState.userId;
        if (this.userIdToDeviceId.get(userId) === deviceId) {
          this.userIdToDeviceId.delete(userId);
        }
      }

      // Close SSE connections
      const userId = sessionState?.userId;
      if (userId) {
        const sseConnections = this.sseConnections.get(userId);
        if (sseConnections) {
          // SSE connections are still userId-based for backward compatibility
          // This can be updated later if needed
        }
      }

      logger.info(`✅ Session cleanup completed for device ${deviceId}`);
    } catch (error) {
      logger.error(
        `❌ Error during session cleanup for device ${deviceId}:`,
        error
      );
    }
  }

  /**
   * Remove session files for device
   */
  removeSessionFilesForDevice(deviceId) {
    try {
      const sessionDir = path.join(
        process.cwd(),
        "sessions",
        `auth_info_baileys_${deviceId}`
      );
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        logger.info(`🗑️ Removed session directory for device ${deviceId}`);
      }
    } catch (error) {
      logger.warn(
        `⚠️ Failed to remove session directory for device ${deviceId}:`,
        error.message
      );
    }
  }

  cleanupSession(userId) {
    try {
      logger.info(`🧹 Cleaning up session for user ${userId}`);

      // Close socket connection safely
      const socket = this.sessions.get(userId);
      if (socket) {
        try {
          if (socket.ws && socket.ws.readyState === 1) {
            // WebSocket.OPEN
            socket.ws.close();
          }
        } catch (error) {
          logger.warn(
            `⚠️ Error closing WebSocket for user ${userId}:`,
            error.message
          );
        }
      }

      // Remove from sessions and states
      this.sessions.delete(userId);

      // Update session state to indicate cleanup
      const sessionState = this.sessionStates.get(userId);
      if (sessionState) {
        sessionState.status = "disconnected";
        sessionState.isActive = false;
        sessionState.lastSeen = new Date();
      }

      // Don't delete sessionState immediately - keep for status queries
      // this.sessionStates.delete(userId);

      // Close any SSE connections
      const sseConnections = this.sseConnections.get(userId);
      if (sseConnections) {
        sseConnections.forEach((res) => {
          try {
            res.end();
          } catch (error) {
            logger.warn(
              `⚠️ Error closing SSE connection for user ${userId}:`,
              error.message
            );
          }
        });
        this.sseConnections.delete(userId);
      }

      logger.info(`✅ Session cleanup completed for user ${userId}`);
    } catch (error) {
      logger.error(
        `❌ Error during session cleanup for user ${userId}:`,
        error
      );
    }
  }

  // WhatsApp Web-style QR regeneration (lightweight)
  async regenerateQRCode(userId) {
    try {
      const socket = this.sessions.get(userId);
      const sessionState = this.sessionStates.get(userId);

      if (!socket || !sessionState) {
        logger.warn(
          `❌ No active session found for user ${userId}, creating new session`
        );
        // If no session exists, create new one
        await this.createSession(userId);
        return { success: true, message: "New session created" };
      }

      logger.info(
        `🔄 Regenerating QR code for existing session of user ${userId}`
      );

      // Don't clear QR code immediately - keep it visible during regeneration
      sessionState.status = "regenerating";

      // Send status update to frontend that regeneration started
      this.sendSSEUpdate(userId, {
        type: "qr-regenerating",
        data: { status: "regenerating" },
        timestamp: new Date().toISOString(),
      });

      // For Baileys, we can trigger QR regeneration by restarting the connection process
      // without destroying the session completely
      try {
        // Close current connection but keep auth state
        if (socket.ws) {
          socket.ws.close();
        }

        // The connection.update handler will automatically trigger new QR generation
        // when the socket tries to reconnect

        logger.info(`✅ QR regeneration triggered for user ${userId}`);
        return { success: true, message: "QR regeneration triggered" };
      } catch (regenerateError) {
        logger.error(
          `❌ Error during QR regeneration for user ${userId}:`,
          regenerateError
        );

        // Fallback: create new session if regeneration fails
        await this.disconnectSession(userId);
        await this.createSession(userId);

        return { success: true, message: "Fallback: new session created" };
      }
    } catch (error) {
      logger.error(`❌ QR regeneration failed for user ${userId}:`, error);
      return { success: false, message: error.message };
    }
  }

  // SSE Methods
  addSSEConnection(userId, res) {
    if (!this.sseConnections.has(userId)) {
      this.sseConnections.set(userId, new Set());
    }
    this.sseConnections.get(userId).add(res);
  }

  removeSSEConnection(userId, res) {
    const connections = this.sseConnections.get(userId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        this.sseConnections.delete(userId);
      }
    }
  }

  sendSSEUpdate(userId, data) {
    const connections = this.sseConnections.get(userId);
    logger.info(`📡 Attempting to send SSE update to user ${userId}:`, {
      hasConnections: !!connections,
      connectionCount: connections ? connections.size : 0,
      dataType: data.type,
    });

    if (connections && connections.size > 0) {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      let successCount = 0;
      connections.forEach((res) => {
        try {
          res.write(message);
          successCount++;
        } catch (error) {
          logger.error(`❌ SSE write error for user ${userId}:`, error);
          connections.delete(res);
        }
      });
      logger.info(
        `✅ SSE update sent successfully to ${successCount}/${connections.size} connections for user ${userId}`
      );
    } else {
      logger.warn(
        `⚠️ No SSE connections found for user ${userId} - data not sent:`,
        data.type
      );
    }
  }

  /**
   * Broadcast SSE update to all connected users
   * Used primarily for admin-wide notifications like job progress
   * @param {Object} data - Data to broadcast
   */
  broadcastToAll(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    let totalConnections = 0;
    let successCount = 0;

    for (const [userId, connections] of this.sseConnections.entries()) {
      if (connections && connections.size > 0) {
        connections.forEach((res) => {
          try {
            res.write(message);
            successCount++;
          } catch (error) {
            logger.error(`❌ SSE broadcast write error for user ${userId}:`, error);
            connections.delete(res);
          }
          totalConnections++;
        });
      }
    }

    if (totalConnections > 0) {
      logger.debug(
        `📡 SSE broadcast sent to ${successCount}/${totalConnections} connections (type: ${data.type})`
      );
    }
  }

  /**
   * Broadcast job progress update
   * This is called by jobQueueService to notify all admins of job status changes
   * @param {Object} job - Job object with id, status, progress
   */
  broadcastJobProgress(job) {
    const data = {
      type: "job-progress",
      data: {
        jobId: job.id,
        status: job.status,
        progress: {
          total: job.progress?.total || 0,
          completed: job.progress?.completed || 0,
          failed: job.progress?.failed || 0,
        },
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error || null,
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(data);
  }

  removeSessionFiles(userId) {
    try {
      const sessionDir = path.join(process.cwd(), "sessions", `user_${userId}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        logger.info(`🗑️ Removed session directory for user ${userId}`);
      }
    } catch (error) {
      logger.warn(
        `⚠️ Failed to remove session directory for user ${userId}:`,
        error.message
      );
    }
  }

  /**
   * Bootstrap sessions - Updated to support both old and new format
   */
  async bootstrapSessions() {
    try {
      const sessionsDir = path.join(process.cwd(), "sessions");

      if (!fs.existsSync(sessionsDir)) {
        logger.info("📂 No sessions directory found, skipping bootstrap");
        return;
      }

      const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });

      // First, try to bootstrap new format (auth_info_baileys_{deviceId})
      for (const entry of entries) {
        if (
          !entry.isDirectory() ||
          !entry.name.startsWith("auth_info_baileys_")
        ) {
          continue;
        }

        const deviceId = entry.name.replace("auth_info_baileys_", "");

        if (this.sessions.has(deviceId)) {
          continue;
        }

        try {
          // Verify device exists in database
          const device = await deviceManager.getDevice(deviceId);
          if (device) {
            await this.createSessionForDevice(deviceId);
            logger.info(
              `🔁 Bootstrapped WhatsApp session for device ${deviceId}`
            );
          } else {
            logger.warn(
              `⚠️ Device ${deviceId} not found in database, skipping`
            );
          }
        } catch (error) {
          logger.warn(
            `⚠️ Failed to bootstrap session for device ${deviceId}:`,
            error.message
          );
        }
      }

      // Legacy: Also bootstrap old format (user_{userId}) for backward compatibility
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith("user_")) {
          continue;
        }

        const userId = parseInt(entry.name.replace("user_", ""), 10);

        if (Number.isNaN(userId)) {
          logger.warn(
            `⚠️ Unable to parse userId from session folder: ${entry.name}`
          );
          continue;
        }

        // Skip if already handled via device-based bootstrap
        if (this.userIdToDeviceId.has(userId)) {
          continue;
        }

        try {
          await this.createSession(userId);
          logger.info(
            `🔁 Bootstrapped WhatsApp session for user ${userId} (legacy)`
          );
        } catch (error) {
          logger.warn(
            `⚠️ Failed to bootstrap session for user ${userId}:`,
            error.message
          );
        }
      }
    } catch (error) {
      logger.warn("⚠️ Session bootstrap encountered an error:", error.message);
    }
  }
}

// Export singleton instance
module.exports = new WhatsAppService();
