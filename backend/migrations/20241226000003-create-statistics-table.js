'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('statistics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      device_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        references: {
          model: 'whatsapp_sessions',
          key: 'device_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date of statistics (YYYY-MM-DD)',
      },
      messages_incoming: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of incoming messages',
      },
      messages_outgoing: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of outgoing messages',
      },
      active_chats: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of active chats',
      },
      response_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Response rate percentage',
      },
      average_response_time: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Average response time in seconds',
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional statistics data',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('statistics', ['device_id'], {
      name: 'idx_statistics_device_id',
    });

    await queryInterface.addIndex('statistics', ['date'], {
      name: 'idx_statistics_date',
    });

    await queryInterface.addIndex('statistics', ['device_id', 'date'], {
      name: 'idx_statistics_device_date_unique',
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('statistics');
  }
};

