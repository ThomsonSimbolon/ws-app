/**
 * Data Migration Script: Migrate existing sessions to device format
 * 
 * This script:
 * 1. Generates deviceId for each existing session
 * 2. Sets default deviceName = "Device 1"
 * 3. Updates session records in database
 * 
 * Run this AFTER running the database migration:
 * npx sequelize-cli db:migrate
 * 
 * Usage:
 * node scripts/migrate-sessions-to-devices.js
 */

require("dotenv").config();
const { sequelize } = require("../src/config/database");
const { WhatsAppSession } = require("../src/models");
const logger = require("../src/utils/logger");

/**
 * Generate a unique device ID
 * Format: device-{timestamp}-{random}
 */
function generateDeviceId(userId, index = 0) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `device-${userId}-${timestamp}-${random}`;
}

/**
 * Migrate existing sessions to device format
 */
async function migrateSessionsToDevices() {
  try {
    logger.info("🚀 Starting session to device migration...");

    // Test database connection
    await sequelize.authenticate();
    logger.info("✅ Database connection established");

    // Get all existing sessions without deviceId
    const sessions = await WhatsAppSession.findAll({
      where: {
        deviceId: null
      },
      attributes: ['id', 'userId', 'sessionId', 'phoneNumber', 'status']
    });

    logger.info(`📋 Found ${sessions.length} sessions to migrate`);

    if (sessions.length === 0) {
      logger.info("✅ No sessions to migrate. All sessions already have deviceId.");
      return;
    }

    // Group sessions by userId to handle multiple sessions per user
    const sessionsByUser = {};
    sessions.forEach(session => {
      if (!sessionsByUser[session.userId]) {
        sessionsByUser[session.userId] = [];
      }
      sessionsByUser[session.userId].push(session);
    });

    logger.info(`👥 Found ${Object.keys(sessionsByUser).length} unique users`);

    let migratedCount = 0;
    let errorCount = 0;

    // Migrate each user's sessions
    for (const [userId, userSessions] of Object.entries(sessionsByUser)) {
      logger.info(`🔄 Migrating ${userSessions.length} session(s) for user ${userId}...`);

      for (let index = 0; index < userSessions.length; index++) {
        const session = userSessions[index];
        
        try {
          // Generate deviceId
          const deviceId = generateDeviceId(userId, index);
          const deviceName = userSessions.length === 1 
            ? "Device 1" 
            : `Device ${index + 1}`;

          // Update session
          await WhatsAppSession.update(
            {
              deviceId: deviceId,
              deviceName: deviceName
            },
            {
              where: { id: session.id }
            }
          );

          logger.info(`  ✅ Migrated session ${session.id} -> deviceId: ${deviceId}, deviceName: ${deviceName}`);
          migratedCount++;

        } catch (error) {
          logger.error(`  ❌ Error migrating session ${session.id}:`, error.message);
          errorCount++;
        }
      }
    }

    logger.info(`\n📊 Migration Summary:`);
    logger.info(`  ✅ Successfully migrated: ${migratedCount} sessions`);
    if (errorCount > 0) {
      logger.warn(`  ⚠️  Errors: ${errorCount} sessions`);
    }

    // Verify migration
    const remainingSessions = await WhatsAppSession.count({
      where: {
        deviceId: null
      }
    });

    if (remainingSessions === 0) {
      logger.info("✅ All sessions have been migrated successfully!");
    } else {
      logger.warn(`⚠️  Warning: ${remainingSessions} sessions still without deviceId`);
    }

  } catch (error) {
    logger.error("❌ Migration failed:", error);
    throw error;
  }
}

/**
 * Validate migration results
 */
async function validateMigration() {
  try {
    logger.info("\n🔍 Validating migration results...");

    // Check for sessions without deviceId
    const sessionsWithoutDeviceId = await WhatsAppSession.count({
      where: {
        deviceId: null
      }
    });

    if (sessionsWithoutDeviceId > 0) {
      logger.warn(`⚠️  Found ${sessionsWithoutDeviceId} sessions without deviceId`);
      return false;
    }

    // Check for duplicate deviceIds per user
    const duplicates = await sequelize.query(`
      SELECT user_id, device_id, COUNT(*) as count
      FROM whatsapp_sessions
      WHERE device_id IS NOT NULL
      GROUP BY user_id, device_id
      HAVING count > 1
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    if (duplicates.length > 0) {
      logger.warn(`⚠️  Found duplicate deviceIds per user:`, duplicates);
      return false;
    }

    logger.info("✅ Migration validation passed!");
    return true;

  } catch (error) {
    logger.error("❌ Validation failed:", error);
    return false;
  }
}

// Run migration
(async () => {
  try {
    await migrateSessionsToDevices();
    const isValid = await validateMigration();
    
    if (isValid) {
      logger.info("\n✅ Migration completed successfully!");
      process.exit(0);
    } else {
      logger.warn("\n⚠️  Migration completed with warnings. Please review.");
      process.exit(1);
    }
  } catch (error) {
    logger.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

