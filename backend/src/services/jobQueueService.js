/**
 * Job Queue Service (Refactored for Persistence)
 * Manages bulk messaging jobs using MySQL for state and idempotency.
 * 
 * Features:
 * - Persistent Storage (Jobs table)
 * - Row-level Idempotency (JobItems table)
 * - Crash Recovery (Resets processing -> queued)
 * - Pause/Resume/Cancel support
 */

const { Job, JobItem, Message, WhatsAppSession } = require("../models");
const whatsappService = require("./whatsappService");
const logger = require("../utils/logger");
const { Op } = require("sequelize");

class JobQueueService {
  constructor() {
    this.isProcessing = false;
    // Check for jobs every 5 seconds
    setInterval(() => this.processQueue(), 5000);
  }

  /**
   * Create a new bulk message job
   */
  async createJob(userId, deviceId, type, data, recipients) {
    try {
      if (!recipients || recipients.length === 0) {
        throw new Error("Recipients list cannot be empty");
      }

      // Create Job
      const job = await Job.create({
        userId,
        deviceId,
        type,
        status: "queued",
        data,
        progress: {
          total: recipients.length,
          sent: 0,
          failed: 0,
        },
      });

      // Create Job Items (Bulk Insert)
      const jobItems = recipients.map((recipient) => ({
        jobId: job.id,
        recipient: typeof recipient === "string" ? recipient : recipient.phone,
        status: "pending",
      }));

      await JobItem.bulkCreate(jobItems);

      logger.info(`📝 Job created: ${job.id} with ${recipients.length} recipients`);
      
      // Trigger processing immediately
      this.processQueue();

      return job;
    } catch (error) {
      logger.error("❌ Error creating job:", error);
      throw error;
    }
  }

  /**
   * Main Queue Processor
   * Picks next 'queued' job and processes it.
   */
  async processQueue() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      // Find next queued job (FIFO)
      const job = await Job.findOne({
        where: { status: "queued" },
        order: [["created_at", "ASC"]],
        include: [
          { model: JobItem, as: "items" } // Eager load not ideal for huge jobs, but okay for moderate <1000
        ]
      });

      if (!job) {
        this.isProcessing = false;
        return;
      }

      logger.info(`🔄 Starting processing for job ${job.id}`);

      // Lock Job
      await job.update({ status: "processing" });

      // Process the job
      await this.processJob(job);

    } catch (error) {
      logger.error("❌ Error in processQueue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a specific job
   * Iterates through items and sends messages.
   * STRICT IDEMPOTENCY: Only processes 'pending' items.
   */
  async processJob(job) {
    const { deviceId, type } = job;
    
    // Parse job.data if it's a JSON string from database
    let data = job.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
        logger.info(`📝 Parsed job.data from JSON string`);
      } catch (e) {
        logger.error(`❌ Failed to parse job.data: ${e.message}`);
        data = {};
      }
    }
    
    // Parse job.progress if it's a JSON string
    let progressData = job.progress;
    if (typeof progressData === 'string') {
      try {
        progressData = JSON.parse(progressData);
      } catch (e) {
        progressData = { sent: 0, failed: 0, total: 0 };
      }
    }
    
    let successCount = progressData.sent || 0;
    let failureCount = progressData.failed || 0;

    // Get socket for device
    const socket = whatsappService.sessions.get(deviceId);
    
    // Validate session
    if (!socket) {
      logger.error(`❌ Device ${deviceId} not connected. Pausing job ${job.id}`);
      await job.update({ 
        status: "paused", 
        error: "Device disconnected during processing" 
      });
      return;
    }

    // Fetch ONLY pending items to avoid re-processing sent ones
    // We fetch in batches to handle memory better if needed, but for now fetch all pending
    const pendingItems = await JobItem.findAll({
      where: {
        jobId: job.id,
        status: "pending"
      }
    });

    logger.info(`📊 Job ${job.id}: Found ${pendingItems.length} pending items`);

    for (const item of pendingItems) {
      // 1. RE-CHECK JOB STATUS (Crucial for Pause/Cancel)
      const currentJobStatus = await Job.findByPk(job.id, { attributes: ['status'] });
      if (currentJobStatus.status !== "processing") {
        logger.info(`⏸️ Job ${job.id} was ${currentJobStatus.status}. Stopping loop.`);
        return;
      }

      try {
        // 2. SAFETY DELAY (Rate Limit Protection)
        // Order: Job-specific delay > Env Var > Default (2000ms)
        const defaultDelay = 2000;
        const minDelay = 500; // Hard safety floor to prevent rate-limit bans
        
        let delay = process.env.JOB_MESSAGE_DELAY ? parseInt(process.env.JOB_MESSAGE_DELAY) : defaultDelay;
        
        // Allow job-specific override if present in data
        if (job.data && job.data.delay) {
             const jobDelay = parseInt(job.data.delay);
             if (!isNaN(jobDelay)) {
                 delay = jobDelay;
             }
        }
        
        // Enforce safety floor & Valid Integer
        if (isNaN(delay) || delay < minDelay) {
             delay = minDelay;
        }

        await new Promise(resolve => setTimeout(resolve, delay));

        let sentMessageId = null;

        // 3. SEND MESSAGE
        if (type === "send-text") {
          // Detect if simple message or bulk-unique
          let msgContent = data.message;
          
          // Debug logging
          logger.info(`🔍 Processing recipient: ${item.recipient}`);
          logger.info(`📦 data.messages exists: ${!!data.messages}, isArray: ${Array.isArray(data.messages)}`);
          if (data.messages) {
            logger.info(`📦 data.messages count: ${data.messages.length}`);
            logger.info(`📦 data.messages sample: ${JSON.stringify(data.messages[0])}`);
          }
          
          // If data.messages exists (bulk unique), find the one for this recipient
          if (data.messages && Array.isArray(data.messages)) {
             // Normalize both sides for robust matching
             const { normalizePhoneNumber } = require('../utils/validation');
             const normalizedRecipient = normalizePhoneNumber(item.recipient) || item.recipient;
             
             logger.info(`🔄 Normalized recipient: ${item.recipient} → ${normalizedRecipient}`);
             
             const foundMsg = data.messages.find(m => {
               const msgPhone = m.to || m.phone;
               const normalizedMsgPhone = normalizePhoneNumber(msgPhone);
               logger.info(`🔄 Comparing: ${msgPhone} → ${normalizedMsgPhone} === ${normalizedRecipient} ? ${normalizedMsgPhone === normalizedRecipient}`);
               return normalizedMsgPhone === normalizedRecipient;
             });
             
             if (foundMsg) {
               msgContent = foundMsg.message;
               logger.info(`✅ Found message for ${normalizedRecipient}: ${msgContent?.substring(0, 50)}...`);
             } else {
               logger.error(`❌ No message found for ${normalizedRecipient}`);
               logger.error(`📋 All messages:`, data.messages.map(m => ({
                 original: m.to || m.phone,
                 normalized: normalizePhoneNumber(m.to || m.phone)
               })));
             }
          }
          
          // Validate message content exists
          if (!msgContent || msgContent.trim() === '') {
            throw new Error(`No message content found for recipient ${item.recipient}`);
          }
          
          const sent = await whatsappService.sendMessage(deviceId, item.recipient, msgContent);
          sentMessageId = sent?.key?.id;
          
        } else if (type === "send-media") {
           // For media, data.items contains the payload
           let mediaItem = data; // Fallback
           
           if (data.items && Array.isArray(data.items)) {
              mediaItem = data.items.find(i => (i.to === item.recipient || i.phoneNumber === item.recipient));
           }
           
           if (mediaItem) {
               // We need media buffer. In controller we used `sendMediaFn` which handled buffer.
               // Now we are in Service. The buffers are NOT in DB.
               // CRITICAL: We cannot store Buffers in JSON DB.
               // The Controller `createSendMediaJob` passed `sendMediaFn` wrapper previously.
               // Now we are persistent.
               
               // If item.base64 or item.url is present, we can re-download/re-buffer.
               // If it was a generic "upload single file for all", we need that file path or URL.
               
               // In `createSendMediaJob`:
               // It validates `base64` or `url`.
               // So we can use `whatsappService.downloadMediaFromURL` or `Buffer.from(base64)`.
               
               let mediaBuffer;
               let fileName = mediaItem.fileName;
               let mimetype = mediaItem.mimetype; // Should be saved in createJob
               let mediaType = mediaItem.mediaType;

               if (mediaItem.base64) {
                 const base64Data = mediaItem.base64.startsWith("data:")
                    ? mediaItem.base64.split(",")[1]
                    : mediaItem.base64;
                 mediaBuffer = Buffer.from(base64Data, "base64");
               } else if (mediaItem.url) {
                 mediaBuffer = await whatsappService.downloadMediaFromURL(mediaItem.url);
               } else {
                 throw new Error("No media source (URL or Base64) found for persistent job");
               }
               
               // Derive mimetype if missing
               if (!mimetype) {
                  switch(mediaType) {
                    case 'image': mimetype = 'image/jpeg'; break;
                    case 'video': mimetype = 'video/mp4'; break;
                    case 'document': mimetype = 'application/pdf'; break;
                  }
               }
               
               const sent = await whatsappService.sendMediaForDevice(
                  deviceId, 
                  item.recipient, 
                  mediaType, 
                  mediaBuffer, 
                  mediaItem.caption,
                  fileName,
                  mimetype
               );
               sentMessageId = sent?.key?.id;
           } else {
               throw new Error("Media item data not found in job payload");
           }
        }

        // 4. ATOMIC UPDATE (Idempotency Success)
        await item.update({
          status: "sent",
          messageId: sentMessageId || "unknown",
          processedAt: new Date()
        });

        successCount++;

      } catch (error) {
        logger.error(`❌ Failed to send to ${item.recipient}: ${error.message}`);
        
        // 5. ATOMIC UPDATE (Idempotency Failure)
        // We do NOT retry indefinitely in this loop. "Skip and Log".
        await item.update({
          status: "failed",
          error: error.message,
          processedAt: new Date()
        });

        failureCount++;
      }

      // 6. UPDATE PROGRESS
      // Update job progress after each message
      await job.update({
        progress: {
          total: progressData.total || 0,
          sent: successCount,
          completed: successCount, // For frontend compatibility
          failed: failureCount
        }
      });
    }

    // 7. FINAL STATUS UPDATE
    await job.update({
      status: "completed"
    });

    logger.info(`✅ Job ${job.id} completed. Sent: ${successCount}, Failed: ${failureCount}`);
  }

  /**
   * Cancel a Job
   */
  async cancelJob(jobId, userId) {
     const job = await Job.findOne({ where: { id: jobId, userId } });
     if (!job) throw new Error("Job not found");

     // If processing, the loop will stop on next iteration
     await job.update({ status: "cancelled" });
     return job;
  }

  /**
   * Pause a Job
   */
  async pauseJob(jobId, userId) {
    const job = await Job.findOne({ where: { id: jobId, userId } });
    if (!job) throw new Error("Job not found");

    if (job.status === 'processing' || job.status === 'queued') {
      await job.update({ status: "paused" });
    }
    return job;
  }

  /**
   * Resume a Job
   */
  async resumeJob(jobId, userId) {
    const job = await Job.findOne({ where: { id: jobId, userId } });
    if (!job) throw new Error("Job not found");

    if (job.status === 'paused') {
      await job.update({ status: "queued" });
      this.processQueue(); // Trigger immediately
    }
    return job;
  }
  
  // Public Getters for Controllers
  async getJob(jobId) {
      return Job.findByPk(jobId, { include: ['items'] });
  }

  async getAllJobs(filters = {}) {
    const whereClause = {};
    if (filters.status) whereClause.status = filters.status;
    if (filters.type) whereClause.type = filters.type;
    return Job.findAll({ where: whereClause, order: [['created_at', 'DESC']] });
  }

  async getUserJobs(userId) {
      return Job.findAll({ where: { userId }, order: [['created_at', 'DESC']] });
  }
}

module.exports = new JobQueueService();
