const logger = require("../utils/logger");

// Lazy-load whatsappService to avoid circular dependency
let whatsappService = null;
const getWhatsAppService = () => {
  if (!whatsappService) {
    whatsappService = require("./whatsappService");
  }
  return whatsappService;
};

/**
 * Job Queue Service
 * 
 * Manages async job processing for bulk messaging and other async operations
 * - Job storage (in-memory)
 * - Job status tracking
 * - Job cancellation support
 * - Delay management
 * - Async processing
 * - Real-time SSE progress broadcasting
 */
class JobQueueService {
  constructor() {
    // Job storage (in-memory)
    // In production, consider using Redis or database for persistence
    this.jobs = new Map(); // jobId -> job object
    
    // Active workers
    this.workers = new Map(); // jobId -> worker info
    
    // Job counter
    this.jobCounter = 0;

    // Batched SSE update tracking
    this.pendingSSEUpdates = new Map(); // jobId -> last broadcast time
    this.SSE_UPDATE_INTERVAL = 1500; // 1.5 seconds between updates
  }

  /**
   * Broadcast job progress via SSE (batched to avoid overwhelming clients)
   * @param {Object} job - Job object
   * @param {boolean} force - Force immediate broadcast (for status changes)
   */
  broadcastJobProgress(job, force = false) {
    const now = Date.now();
    const lastBroadcast = this.pendingSSEUpdates.get(job.id) || 0;

    // Skip if we broadcast recently (unless forced)
    if (!force && (now - lastBroadcast) < this.SSE_UPDATE_INTERVAL) {
      return;
    }

    this.pendingSSEUpdates.set(job.id, now);

    try {
      const ws = getWhatsAppService();
      ws.broadcastJobProgress(job);
    } catch (error) {
      logger.warn(`⚠️ Failed to broadcast job progress for ${job.id}:`, error.message);
    }
  }


  /**
   * Generate unique job ID
   */
  generateJobId() {
    this.jobCounter++;
    return `job-${Date.now()}-${this.jobCounter}`;
  }

  /**
   * Create a new job
   * @param {string} type - Job type (e.g., 'send-text', 'send-media')
   * @param {Object} data - Job data
   * @param {Object} options - Job options (delay, etc.)
   * @returns {string} Job ID
   */
  createJob(type, data, options = {}) {
    const jobId = this.generateJobId();
    
    const job = {
      id: jobId,
      type: type,
      status: 'queued', // queued, processing, completed, failed, cancelled
      data: data,
      options: {
        delay: options.delay || 3, // Default 3 seconds delay between messages
        ...options
      },
      progress: {
        total: data.messages ? data.messages.length : 1,
        completed: 0,
        failed: 0
      },
      result: null,
      error: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
    };

    this.jobs.set(jobId, job);
    logger.info(`📦 Created job ${jobId} (type: ${type})`);

    // Start processing if not explicitly set to manual
    if (options.autoStart !== false) {
      this.processJob(jobId).catch(error => {
        logger.error(`❌ Error processing job ${jobId}:`, error);
      });
    }

    return jobId;
  }

  /**
   * Get job by ID
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job object
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs (with optional filter)
   * @param {Object} filter - Filter options (status, type)
   * @returns {Array} Array of job objects
   */
  getJobs(filter = {}) {
    let jobs = Array.from(this.jobs.values());

    if (filter.status) {
      jobs = jobs.filter(job => job.status === filter.status);
    }

    if (filter.type) {
      jobs = jobs.filter(job => job.type === filter.type);
    }

    // Sort by createdAt (newest first)
    jobs.sort((a, b) => b.createdAt - a.createdAt);

    return jobs;
  }

  /**
   * Cancel a job
   * @param {string} jobId - Job ID
   * @returns {boolean} True if cancelled successfully
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      return false; // Already finished
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    
    // Stop worker if running
    if (this.workers.has(jobId)) {
      const worker = this.workers.get(jobId);
      if (worker.cancelled) {
        worker.cancelled = true;
      }
      this.workers.delete(jobId);
    }

    logger.info(`🚫 Cancelled job ${jobId}`);
    this.broadcastJobProgress(job, true); // Force immediate broadcast
    return true;
  }

  /**
   * Pause a job
   * @param {string} jobId - Job ID
   * @returns {boolean} True if paused successfully
   */
  pauseJob(jobId) {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'queued' && job.status !== 'processing') {
      return false; // Can only pause queued or processing jobs
    }

    job.status = 'paused';
    
    // Worker loop will detect status change and stop
    logger.info(`II Paused job ${jobId}`);
    this.broadcastJobProgress(job, true); // Force immediate broadcast
    return true;
  }

  /**
   * Resume a job
   * @param {string} jobId - Job ID
   * @returns {boolean} True if resumed successfully
   */
  resumeJob(jobId) {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'paused') {
      return false; // Can only resume paused jobs
    }

    job.status = 'queued'; // Re-queue it
    logger.info(`▶️ Resuming job ${jobId}`);
    this.broadcastJobProgress(job, true); // Force immediate broadcast

    // Restart processing (processJob handles resuming logic)
    this.processJob(jobId).catch(error => {
      logger.error(`❌ Error resuming job ${jobId}:`, error);
    });

    return true;
  }

  /**
   * Retry a failed job (creates a new job with failed items)
   * @param {string} jobId - Original Job ID
   * @returns {string} New Job ID
   */
  retryJob(jobId) {
    const oldJob = this.jobs.get(jobId);
    
    if (!oldJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (oldJob.status !== 'completed' && oldJob.status !== 'failed' && oldJob.status !== 'cancelled') {
        throw new Error(`Job ${jobId} is not in a terminal state`);
    }

    // Identify failed items
    let failedItems = [];
    
    if (oldJob.type === 'send-text') {
        // Collect failed messages (from result.failed or identifying missing success indices)
        // Check result.failed explicitly
        if (oldJob.result && oldJob.result.failed) {
            failedItems = oldJob.result.failed.map(f => ({
                to: f.to,
                message: f.message,
                type: 'text' // Assuming text, but could be preserved
            }));
        } 
        
        // Also check if some items were never processed (cancellation/failure before completion)
        const processedIndices = new Set([
            ...(oldJob.result?.success?.map(s => s.index) || []),
            ...(oldJob.result?.failed?.map(f => f.index) || [])
        ]);
        
        oldJob.data.messages.forEach((msg, idx) => {
            if (!processedIndices.has(idx)) {
                failedItems.push(msg); // Add unprocessed
            }
        });

    } else if (oldJob.type === 'send-media') {
        // Similar logic for media
        const processedIndices = new Set([
            ...(oldJob.result?.success?.map(s => s.index) || []),
            ...(oldJob.result?.failed?.map(f => f.index) || [])
        ]);

        oldJob.data.items.forEach((item, idx) => {
             // For explicit failures
             const failRecord = oldJob.result?.failed?.find(f => f.index === idx);
             if (failRecord) {
                 failedItems.push(item);
             } else if (!processedIndices.has(idx)) {
                 failedItems.push(item);
             }
        });
    } else {
        throw new Error(`Retry not supported for job type: ${oldJob.type}`);
    }

    if (failedItems.length === 0) {
        throw new Error(`No failed or unprocessed items found to retry for job ${jobId}`);
    }

    // Create new job with failed items
    const newData = { ...oldJob.data };
    if (oldJob.type === 'send-text') {
        newData.messages = failedItems;
    } else {
        newData.items = failedItems;
    }

    // Create and return new job
    logger.info(`🔄 Retrying job ${jobId} with ${failedItems.length} items (New Job)`);
    return this.createJob(oldJob.type, newData, oldJob.options);
  }

  /**
   * Process a job
   * @param {string} jobId - Job ID
   */
  async processJob(jobId) {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'queued') {
      logger.warn(`Job ${jobId} is not in queued status (current: ${job.status})`);
      return;
    }

    job.status = 'processing';
    if (!job.startedAt) {
        job.startedAt = new Date();
    }

    // Broadcast job start
    this.broadcastJobProgress(job, true);

    // Store worker info for cancellation/pausing
    const worker = {
      cancelled: false,
      paused: false,
    };
    this.workers.set(jobId, worker);

    try {
      // Process based on job type
      switch (job.type) {
        case 'send-text':
          await this.processSendTextJob(job, worker);
          break;
        case 'send-media':
          await this.processSendMediaJob(job, worker);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      if (!worker.cancelled && !worker.paused && job.status !== 'paused') {
        job.status = 'completed';
        job.completedAt = new Date();
        logger.info(`✅ Job ${jobId} completed successfully`);
        this.broadcastJobProgress(job, true); // Final status broadcast
      } else if (job.status === 'paused') {
          logger.info(`II Job ${jobId} paused`);
          this.broadcastJobProgress(job, true); // Paused status broadcast
      }
    } catch (error) {
      if (!worker.cancelled) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        logger.error(`❌ Job ${jobId} failed:`, error);
        this.broadcastJobProgress(job, true); // Failed status broadcast
      }
    } finally {
      this.workers.delete(jobId);
    }
  }

  /**
   * Process send-text job
   */
  async processSendTextJob(job, worker) {
    const { messages, deviceId, sendMessageFn } = job.data;
    const delay = job.options.delay * 1000; // Convert to milliseconds

    if (!sendMessageFn || typeof sendMessageFn !== 'function') {
      throw new Error('sendMessageFn is required');
    }

    job.progress.total = messages.length;
    
    // Initialize results if not already present (resume support)
    if (!job.result) {
        job.result = {
          success: [],
          failed: [],
        };
    }

    for (let i = 0; i < messages.length; i++) {
      // Check if job was cancelled or paused
      if (worker.cancelled) {
        logger.info(`🚫 Job ${job.id} cancelled, stopping at message ${i + 1}`);
        job.status = 'cancelled';
        break;
      }
      
      if (worker.paused) { // Check worker.paused flag
          job.status = 'paused'; // Update job status
          logger.info(`II Job ${job.id} paused, stopping at message ${i + 1}`);
          break;
      }

      // Check if already processed (for resume)
      const isProcessed = job.result.success.some(s => s.index === i) || job.result.failed.some(f => f.index === i);
      if (isProcessed) {
          job.progress.completed++; // Increment completed for already processed items
          continue;
      }

      const message = messages[i];
      
      try {
        // Send message
        await sendMessageFn(deviceId, message.to, message.message, message.type || 'text');
        
        job.progress.completed++;
        job.result.success.push({
          index: i,
          to: message.to,
          message: message.message,
          timestamp: new Date(),
        });

        // Broadcast progress update (batched automatically)
        this.broadcastJobProgress(job);

        logger.info(`✅ Job ${job.id}: Sent message ${i + 1}/${messages.length} to ${message.to}`);

        // Delay before next message (except for last message)
        if (i < messages.length - 1 && !worker.cancelled && !worker.paused) {
          await this.delay(delay);
        }
      } catch (error) {
        job.progress.failed++;
        job.result.failed.push({
          index: i,
          to: message.to,
          message: message.message,
          error: error.message,
          timestamp: new Date(),
        });

        logger.error(`❌ Job ${job.id}: Failed to send message ${i + 1}/${messages.length} to ${message.to}:`, error.message);
        
        // Continue with next message even if one fails
      }
    }
  }

  /**
   * Process send-media job
   */
  async processSendMediaJob(job, worker) {
    const { items, deviceId, sendMediaFn, targetType = 'contact' } = job.data;
    const delay = job.options.delay * 1000; // Convert to milliseconds

    if (!sendMediaFn || typeof sendMediaFn !== 'function') {
      throw new Error('sendMediaFn is required');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('items array is required and must not be empty');
    }

    job.progress.total = items.length;
    
    // Initialize results if not present (resume support)
    if (!job.result) {
        job.result = {
            success: [],
            failed: [],
        };
    }

    for (let i = 0; i < items.length; i++) {
      // Check if job was cancelled
      if (worker.cancelled) {
        logger.info(`🚫 Job ${job.id} cancelled, stopping at item ${i + 1}`);
        job.status = 'cancelled';
        break;
      }

      if (job.status === 'paused') {
          worker.paused = true;
          logger.info(`II Job ${job.id} paused, stopping at item ${i + 1}`);
          break;
      }

      // Check if already processed (for resume)
      const isProcessed = job.result.success.some(s => s.index === i) || job.result.failed.some(f => f.index === i);
      if (isProcessed) {
          continue;
      }

      const item = items[i];
      
      try {
        // Prepare media data
        let mediaBuffer;
        let fileName = item.fileName || null;
        let mimetype = item.mimetype || null;

        if (item.base64) {
          // Base64 data
          const base64Data = item.base64.startsWith("data:")
            ? item.base64.split(",")[1]
            : item.base64;
          mediaBuffer = Buffer.from(base64Data, "base64");
        } else if (item.url) {
          // URL - download media (using whatsappService if available)
          if (job.data.downloadMediaFromURLFn) {
            mediaBuffer = await job.data.downloadMediaFromURLFn(item.url);
          } else {
            throw new Error('URL download not supported without downloadMediaFromURLFn');
          }
        } else if (item.filePath && require('fs').existsSync(item.filePath)) {
          // File path
          mediaBuffer = require('fs').readFileSync(item.filePath);
          fileName = item.fileName || require('path').basename(item.filePath);
        } else {
          throw new Error('Media data not found. Provide base64, url, or filePath');
        }

        // Determine MIME type if not provided
        if (!mimetype) {
          switch (item.mediaType) {
            case "image":
              mimetype = "image/jpeg";
              break;
            case "video":
              mimetype = "video/mp4";
              break;
            case "document":
              mimetype = "application/pdf";
              break;
            default:
              mimetype = "application/octet-stream";
          }
        }

        // Send media based on target type
        let sentMessage;
        if (targetType === 'contact') {
          // Send to contact
          const phoneNumber = item.to || item.phoneNumber;
          if (!phoneNumber) {
            throw new Error('Field "to" is required for contact media');
          }

          sentMessage = await sendMediaFn(
            deviceId,
            phoneNumber,
            item.mediaType,
            mediaBuffer,
            item.caption || null,
            fileName,
            mimetype
          );

          job.result.success.push({
            index: i,
            to: phoneNumber,
            mediaType: item.mediaType,
            timestamp: new Date(),
          });
        } else if (targetType === 'group') {
          // Send to group
          const groupId = item.groupId;
          if (!groupId) {
            throw new Error('Field "groupId" is required for group media');
          }

          // For group media, we need a different function
          if (job.data.sendGroupMediaFn) {
            sentMessage = await job.data.sendGroupMediaFn(
              deviceId,
              groupId,
              item.mediaType,
              mediaBuffer,
              item.caption || null,
              fileName,
              mimetype
            );
          } else {
            throw new Error('sendGroupMediaFn is required for group media jobs');
          }

          job.result.success.push({
            index: i,
            groupId: groupId,
            mediaType: item.mediaType,
            timestamp: new Date(),
          });
        } else {
          throw new Error(`Invalid targetType: ${targetType}. Must be 'contact' or 'group'`);
        }
        
        job.progress.completed++;
        
        // Broadcast progress update (batched automatically)
        this.broadcastJobProgress(job);
        
        const target = targetType === 'contact' ? (item.to || item.phoneNumber) : item.groupId;
        logger.info(`✅ Job ${job.id}: Sent media ${i + 1}/${items.length} to ${target}`);

        // Delay before next message (except for last message)
        if (i < items.length - 1 && !worker.cancelled && job.status !== 'paused') {
          await this.delay(delay);
        }
      } catch (error) {
        job.progress.failed++;
        
        const target = targetType === 'contact' ? (item.to || item.phoneNumber) : item.groupId;
        job.result.failed.push({
          index: i,
          target: target,
          mediaType: item.mediaType,
          error: error.message,
          timestamp: new Date(),
        });

        logger.error(`❌ Job ${job.id}: Failed to send media ${i + 1}/${items.length} to ${target}:`, error.message);
        
        // Continue with next item even if one fails
      }
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup old completed/failed jobs (older than specified hours)
   * @param {number} hours - Hours to keep jobs (default: 24)
   */
  cleanupOldJobs(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
        job.completedAt &&
        job.completedAt < cutoffTime
      ) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`🧹 Cleaned up ${cleanedCount} old jobs`);
    }

    return cleanedCount;
  }

  /**
   * Get job statistics
   */
  getStatistics() {
    const jobs = Array.from(this.jobs.values());
    
    return {
      total: jobs.length,
      queued: jobs.filter(j => j.status === 'queued').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
    };
  }
}

// Export singleton instance
module.exports = new JobQueueService();

