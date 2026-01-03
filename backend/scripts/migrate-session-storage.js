/**
 * Session Storage Migration Script
 * 
 * Migrates session files from old format (user_{userId}/) to new format (auth_info_baileys_{deviceId}/)
 * 
 * Run this AFTER:
 * 1. Database migration (add device_id columns)
 * 2. Data migration script (migrate-sessions-to-devices.js)
 * 
 * Usage:
 * node scripts/migrate-session-storage.js
 */

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { sequelize, Sequelize } = require("../src/config/database");
const { WhatsAppSession } = require("../src/models");
const logger = require("../src/utils/logger");

/**
 * Migrate session storage files
 */
async function migrateSessionStorage() {
  try {
    logger.info("🚀 Starting session storage migration...");

    const sessionsDir = path.join(process.cwd(), "sessions");

    if (!fs.existsSync(sessionsDir)) {
      logger.info("📂 No sessions directory found, skipping migration");
      return;
    }

    // Test database connection
    await sequelize.authenticate();
    logger.info("✅ Database connection established");

    // Get all sessions with deviceId from database
    const sessions = await WhatsAppSession.findAll({
      where: {
        deviceId: { [Sequelize.Op.ne]: null }
      },
      attributes: ['id', 'userId', 'deviceId', 'deviceName']
    });

    logger.info(`📋 Found ${sessions.length} sessions with deviceId`);

    if (sessions.length === 0) {
      logger.warn("⚠️  No sessions with deviceId found. Please run data migration script first.");
      return;
    }

    // Create backup directory
    const backupDir = path.join(process.cwd(), "sessions_backup_" + Date.now());
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      logger.info(`📦 Created backup directory: ${backupDir}`);
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Migrate each session
    for (const session of sessions) {
      try {
        const oldPath = path.join(sessionsDir, `user_${session.userId}`);
        const newPath = path.join(sessionsDir, `auth_info_baileys_${session.deviceId}`);

        // Check if old path exists
        if (!fs.existsSync(oldPath)) {
          // Check if new path already exists (already migrated)
          if (fs.existsSync(newPath)) {
            logger.info(`  ⏭️  Session ${session.deviceId} already in new format, skipping`);
            skippedCount++;
            continue;
          } else {
            logger.warn(`  ⚠️  Old session directory not found for user ${session.userId}, skipping`);
            skippedCount++;
            continue;
          }
        }

        // Check if new path already exists
        if (fs.existsSync(newPath)) {
          logger.info(`  ⏭️  New session directory already exists for ${session.deviceId}, skipping`);
          skippedCount++;
          continue;
        }

        // Backup old directory
        const backupPath = path.join(backupDir, `user_${session.userId}`);
        fs.cpSync(oldPath, backupPath, { recursive: true });
        logger.info(`  📦 Backed up: ${oldPath} -> ${backupPath}`);

        // Copy to new location
        fs.cpSync(oldPath, newPath, { recursive: true });
        logger.info(`  ✅ Migrated: ${oldPath} -> ${newPath}`);

        migratedCount++;

        // Optional: Remove old directory after successful migration
        // Uncomment the following lines if you want to remove old directories
        // fs.rmSync(oldPath, { recursive: true, force: true });
        // logger.info(`  🗑️  Removed old directory: ${oldPath}`);

      } catch (error) {
        logger.error(`  ❌ Error migrating session ${session.deviceId}:`, error.message);
        errorCount++;
      }
    }

    logger.info(`\n📊 Migration Summary:`);
    logger.info(`  ✅ Successfully migrated: ${migratedCount} sessions`);
    logger.info(`  ⏭️  Skipped: ${skippedCount} sessions`);
    if (errorCount > 0) {
      logger.warn(`  ❌ Errors: ${errorCount} sessions`);
    }
    logger.info(`  📦 Backup location: ${backupDir}`);

    // Validate migration
    const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });
    const newFormatDirs = entries.filter(e => 
      e.isDirectory() && e.name.startsWith("auth_info_baileys_")
    ).length;
    const oldFormatDirs = entries.filter(e => 
      e.isDirectory() && e.name.startsWith("user_")
    ).length;

    logger.info(`\n📁 Directory Status:`);
    logger.info(`  ✅ New format (auth_info_baileys_*): ${newFormatDirs} directories`);
    logger.info(`  📂 Old format (user_*): ${oldFormatDirs} directories`);

    if (migratedCount > 0) {
      logger.info(`\n✅ Migration completed successfully!`);
      logger.info(`⚠️  Note: Old directories are kept for safety. You can remove them after verification.`);
    } else if (skippedCount === sessions.length) {
      logger.info(`\n✅ All sessions already migrated or don't need migration.`);
    }

  } catch (error) {
    logger.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration
(async () => {
  try {
    await migrateSessionStorage();
    process.exit(0);
  } catch (error) {
    logger.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();

