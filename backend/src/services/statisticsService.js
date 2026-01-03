const { Statistic, Message, WhatsAppSession } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

/**
 * Statistics Service
 * 
 * Handles statistics tracking and analytics
 */
class StatisticsService {
  /**
   * Update or create daily statistics for a device
   */
  async updateDailyStatistics(deviceId, date = null) {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const dateString = targetDate.toISOString().split('T')[0];

      // Get session ID
      const session = await WhatsAppSession.findOne({
        where: { deviceId: deviceId, isActive: true },
        attributes: ["id"]
      });

      if (!session) {
        logger.warn(`No session found for device ${deviceId}`);
        return null;
      }

      // Calculate date range
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      // Get messages for the day
      const messages = await Message.findAll({
        where: {
          sessionId: session.id,
          timestamp: {
            [Op.between]: [startOfDay, endOfDay]
          }
        },
        attributes: ['direction', 'timestamp']
      });

      // Calculate statistics
      const messagesIncoming = messages.filter(m => m.direction === 'incoming').length;
      const messagesOutgoing = messages.filter(m => m.direction === 'outgoing').length;

      // Calculate active chats (unique contacts)
      const uniqueContacts = new Set();
      messages.forEach(msg => {
        // This is simplified - in production you might want more sophisticated logic
        uniqueContacts.add(msg.direction === 'incoming' ? msg.fromNumber : msg.toNumber);
      });
      const activeChats = uniqueContacts.size;

      // Calculate response rate (simplified)
      // Response rate = (outgoing messages / incoming messages) * 100
      const responseRate = messagesIncoming > 0 
        ? (messagesOutgoing / messagesIncoming) * 100 
        : null;

      // Upsert statistics
      const [statistic, created] = await Statistic.findOrCreate({
        where: {
          deviceId: deviceId,
          date: dateString
        },
        defaults: {
          deviceId: deviceId,
          date: dateString,
          messagesIncoming: messagesIncoming,
          messagesOutgoing: messagesOutgoing,
          activeChats: activeChats,
          responseRate: responseRate,
          metadata: {
            calculatedAt: new Date().toISOString()
          }
        }
      });

      if (!created) {
        // Update existing statistic
        await statistic.update({
          messagesIncoming: messagesIncoming,
          messagesOutgoing: messagesOutgoing,
          activeChats: activeChats,
          responseRate: responseRate,
          metadata: {
            ...statistic.metadata,
            updatedAt: new Date().toISOString()
          }
        });
      }

      return statistic;
    } catch (error) {
      logger.error(`Error updating daily statistics for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get statistics for a device and date range
   */
  async getStatistics(deviceId, startDate, endDate) {
    try {
      const statistics = await Statistic.findAll({
        where: {
          deviceId: deviceId,
          date: {
            [Op.between]: [startDate, endDate]
          }
        },
        order: [['date', 'ASC']],
        attributes: [
          'id',
          'date',
          'messagesIncoming',
          'messagesOutgoing',
          'activeChats',
          'responseRate',
          'averageResponseTime',
          'metadata'
        ]
      });

      return statistics;
    } catch (error) {
      logger.error(`Error getting statistics for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get daily activity for a device
   */
  async getDailyActivity(deviceId, date = null) {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const dateString = targetDate.toISOString().split('T')[0];

      // Update statistics first
      await this.updateDailyStatistics(deviceId, dateString);

      // Get statistics
      const statistic = await Statistic.findOne({
        where: {
          deviceId: deviceId,
          date: dateString
        }
      });

      if (!statistic) {
        // Return zero statistics if not found
        return {
          date: dateString,
          messagesIncoming: 0,
          messagesOutgoing: 0,
          activeChats: 0,
          responseRate: null,
          averageResponseTime: null,
        };
      }

      return {
        date: statistic.date,
        messagesIncoming: statistic.messagesIncoming,
        messagesOutgoing: statistic.messagesOutgoing,
        activeChats: statistic.activeChats,
        responseRate: statistic.responseRate,
        averageResponseTime: statistic.averageResponseTime,
      };
    } catch (error) {
      logger.error(`Error getting daily activity for device ${deviceId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new StatisticsService();

