'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add device_id column (nullable first for backward compatibility)
    await queryInterface.addColumn('whatsapp_sessions', 'device_id', {
      type: Sequelize.STRING(100),
      allowNull: true,
      unique: false, // Will add unique constraint later after data migration
      comment: 'Unique device identifier for multi-device support'
    });

    // Add device_name column (nullable)
    await queryInterface.addColumn('whatsapp_sessions', 'device_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Human-readable device name'
    });

    // Add index on device_id for better query performance
    await queryInterface.addIndex('whatsapp_sessions', ['device_id'], {
      name: 'idx_whatsapp_sessions_device_id',
      unique: false
    });

    // Add composite index on (user_id, device_id) for unique constraint later
    // Note: We'll add unique constraint after data migration in separate step
    await queryInterface.addIndex('whatsapp_sessions', ['user_id', 'device_id'], {
      name: 'idx_whatsapp_sessions_user_device',
      unique: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('whatsapp_sessions', 'idx_whatsapp_sessions_user_device');
    await queryInterface.removeIndex('whatsapp_sessions', 'idx_whatsapp_sessions_device_id');

    // Remove columns
    await queryInterface.removeColumn('whatsapp_sessions', 'device_name');
    await queryInterface.removeColumn('whatsapp_sessions', 'device_id');
  }
};

