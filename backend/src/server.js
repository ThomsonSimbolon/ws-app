const { sequelize } = require("./config/database");
const logger = require("./utils/logger");
require("dotenv").config();

const whatsappService = require("./services/whatsappService");

// Import models untuk memastikan relasi terdefinisi
require("./models");

const AUTO_CREATE_TABLES =
  process.env.AUTO_CREATE_TABLES === "false" ||
  process.env.NODE_ENV === "development";

const createTablesIfNotExist = async () => {
  try {
    if (!AUTO_CREATE_TABLES) {
      logger.info(
        "Auto create tables is disabled. Skipping table creation check."
      );
      return;
    }

    logger.info("🔍 Checking database connection...");

    // Test database connection
    await sequelize.authenticate();
    logger.info("✅ Database connection established successfully.");

    logger.info("🔍 Checking existing tables...");

    // Get list of existing tables
    const [results] = await sequelize.query("SHOW TABLES");
    const existingTables = results.map((row) => Object.values(row)[0]);

    logger.info(
      `📋 Found ${existingTables.length} existing tables: ${existingTables.join(
        ", "
      )}`
    );

    // Define required tables
    const requiredTables = [
      "users",
      "whatsapp_sessions",
      "messages",
      "contacts",
      "scheduled_messages",
      "groups",
      "statistics",
      "admin_action_logs",
    ];
    const missingTables = requiredTables.filter(
      (table) => !existingTables.includes(table)
    );

    const shouldSync = missingTables.length > 0 || process.env.AUTO_UPDATE_SCHEMA === 'true';

    if (shouldSync) {
      if (missingTables.length > 0) {
        logger.info(`🚧 Missing tables detected: ${missingTables.join(", ")}`);
        logger.info("🔨 Creating missing tables...");
      }

      if (process.env.AUTO_UPDATE_SCHEMA === 'true') {
        logger.info(`🔄 Schema update enabled: true`);
      }

      // Sync database - akan membuat tabel yang belum ada dan update structure jika diaktifkan
      await sequelize.sync({
        alter: process.env.AUTO_UPDATE_SCHEMA === 'true', // Update struktur tabel jika diaktifkan via .env
        force: false, // Jangan hapus tabel yang sudah ada
      });

      if (missingTables.length > 0) {
        logger.info("✅ All required tables have been created successfully!");

        // Verify tables were created
        const [newResults] = await sequelize.query("SHOW TABLES");
        const newExistingTables = newResults.map((row) => Object.values(row)[0]);

        const stillMissing = requiredTables.filter(
          (table) => !newExistingTables.includes(table)
        );
        if (stillMissing.length === 0) {
          logger.info("✅ Database setup completed successfully!");
        } else {
          logger.error(`❌ Failed to create tables: ${stillMissing.join(", ")}`);
        }
      } else {
        logger.info("✅ Database schema sync completed.");
      }
    } else {
      logger.info("✅ All required tables already exist. No action needed.");
    }

    // Optional: Create default admin user if not exists
    await createDefaultAdminUser();
  } catch (error) {
    logger.error("❌ Database setup failed:", error);
    throw error;
  }
};

const createDefaultAdminUser = async () => {
  try {
    const { User } = require("./models");

    // Check if admin user exists
    const adminExists = await User.findOne({
      where: { role: "admin" },
    });

    if (!adminExists) {
      logger.info("👤 Creating default admin user...");

      await User.create({
        username: "admin",
        email: "admin@whatsapp-service.com",
        password: "admin123", // Will be hashed by model hooks
        fullName: "System Administrator",
        role: "admin",
      });

      logger.info("✅ Default admin user created successfully!");
      logger.info("📧 Login credentials:");
      logger.info("   Email: admin@whatsapp-service.com");
      logger.info("   Password: admin123");
      logger.info("⚠️  Please change the default password after first login!");
    }
  } catch (error) {
    logger.warn("⚠️  Failed to create default admin user:", error.message);
  }
};

const startServer = async () => {
  try {
    // Run database setup first
    await createTablesIfNotExist();

    if (whatsappService?.bootstrapSessions) {
      try {
        await whatsappService.bootstrapSessions();
      } catch (bootstrapError) {
        logger.warn(
          "⚠️  Failed to bootstrap WhatsApp sessions:",
          bootstrapError.message
        );
      }
    }

    // Start the main application
    logger.info("🚀 Starting WhatsApp Service...");
    require("./app");
  } catch (error) {
    logger.error("💥 Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("📴 Shutting down gracefully...");
  try {
    await sequelize.close();
    logger.info("✅ Database connection closed.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  logger.info("📴 Received SIGTERM, shutting down gracefully...");
  try {
    await sequelize.close();
    logger.info("✅ Database connection closed.");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
});

// Start the server
startServer();
