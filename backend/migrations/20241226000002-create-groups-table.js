'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('groups', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      group_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'WhatsApp group JID (e.g., 120363123456789012@g.us)',
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
      subject: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Group name/subject',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Group description',
      },
      creation_timestamp: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      owner: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Group owner JID',
      },
      participants: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of participant JIDs',
      },
      admins: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of admin JIDs',
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional group metadata',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    await queryInterface.addIndex('groups', ['device_id'], {
      name: 'idx_groups_device_id',
    });

    await queryInterface.addIndex('groups', ['group_id'], {
      name: 'idx_groups_group_id',
      unique: true,
    });

    await queryInterface.addIndex('groups', ['is_active'], {
      name: 'idx_groups_is_active',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('groups');
  }
};

