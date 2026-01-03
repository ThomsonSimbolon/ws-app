'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // This migration adds unique constraint after data has been migrated
    // It should be run after data migration script fills device_id for all existing rows

    // Remove the non-unique composite index first
    await queryInterface.removeIndex('whatsapp_sessions', 'idx_whatsapp_sessions_user_device');

    // Add unique constraint on (user_id, device_id)
    // This ensures one device_id per user, but a user can have multiple devices
    await queryInterface.addIndex('whatsapp_sessions', ['user_id', 'device_id'], {
      name: 'idx_whatsapp_sessions_user_device_unique',
      unique: true
    });

    // Make device_id NOT NULL after all existing data has device_id
    // Note: This should only be done after data migration is complete
    // For safety, we'll keep it nullable in case migration script hasn't run
    // You can manually run: ALTER TABLE whatsapp_sessions MODIFY device_id VARCHAR(100) NOT NULL;
  },

  async down(queryInterface, Sequelize) {
    // Remove unique constraint
    await queryInterface.removeIndex('whatsapp_sessions', 'idx_whatsapp_sessions_user_device_unique');

    // Re-add non-unique index
    await queryInterface.addIndex('whatsapp_sessions', ['user_id', 'device_id'], {
      name: 'idx_whatsapp_sessions_user_device',
      unique: false
    });
  }
};

