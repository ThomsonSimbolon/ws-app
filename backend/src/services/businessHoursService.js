/**
 * Business Hours Service
 * Handles business hours checking with timezone support
 */

const logger = require("../utils/logger");
const { DeviceBotConfig } = require("../models");

/**
 * Check if current time is within business hours for a device
 * @param {string} deviceId - Device ID
 * @returns {Promise<{isBusinessHours: boolean, offHoursMessage: string|null}>}
 */
async function checkBusinessHours(deviceId) {
  try {
    const config = await DeviceBotConfig.findOne({
      where: { deviceId },
    });

    // No config or off-hours not enabled → always business hours
    if (!config || !config.offHoursEnabled) {
      return { isBusinessHours: true, offHoursMessage: null };
    }

    // No business hours defined → always business hours
    if (!config.businessHours || config.businessHours.length === 0) {
      return { isBusinessHours: true, offHoursMessage: null };
    }

    // Get current time in device's timezone
    const now = getCurrentTimeInTimezone(config.timezone);
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = formatTime(now);

    // Find today's schedule
    const todaySchedule = config.businessHours.find(
      (schedule) => schedule.day === currentDay
    );

    // No schedule for today → off hours
    if (!todaySchedule) {
      return {
        isBusinessHours: false,
        offHoursMessage: config.offHoursMessage,
      };
    }

    // Check if current time is within schedule
    const isWithinHours =
      currentTime >= todaySchedule.start && currentTime <= todaySchedule.end;

    return {
      isBusinessHours: isWithinHours,
      offHoursMessage: isWithinHours ? null : config.offHoursMessage,
    };
  } catch (error) {
    logger.error("❌ Error checking business hours:", error);
    // Fail-open: assume business hours
    return { isBusinessHours: true, offHoursMessage: null };
  }
}

/**
 * Get current time in a specific timezone
 * @param {string} timezone - IANA timezone (e.g., 'Asia/Jakarta')
 * @returns {Date}
 */
function getCurrentTimeInTimezone(timezone) {
  try {
    const now = new Date();
    const options = {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };

    // Get timezone string representation
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    const parts = formatter.formatToParts(now);

    // Extract parts
    const dateParts = {};
    for (const part of parts) {
      dateParts[part.type] = part.value;
    }

    // Create date object in local context
    const tzDate = new Date(
      parseInt(dateParts.year),
      parseInt(dateParts.month) - 1,
      parseInt(dateParts.day),
      parseInt(dateParts.hour),
      parseInt(dateParts.minute),
      parseInt(dateParts.second)
    );

    return tzDate;
  } catch (error) {
    logger.warn(`⚠️ Invalid timezone ${timezone}, using UTC`);
    return new Date();
  }
}

/**
 * Format time as HH:MM string
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Validate business hours configuration
 * @param {Array} businessHours - Business hours array
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateBusinessHours(businessHours) {
  const errors = [];

  if (!Array.isArray(businessHours)) {
    return { valid: false, errors: ["Business hours must be an array"] };
  }

  for (let i = 0; i < businessHours.length; i++) {
    const schedule = businessHours[i];

    // Check required fields
    if (typeof schedule.day !== "number" || schedule.day < 0 || schedule.day > 6) {
      errors.push(`Schedule ${i}: Invalid day (must be 0-6)`);
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(schedule.start)) {
      errors.push(`Schedule ${i}: Invalid start time format (use HH:MM)`);
    }
    if (!timeRegex.test(schedule.end)) {
      errors.push(`Schedule ${i}: Invalid end time format (use HH:MM)`);
    }

    // Check start < end
    if (schedule.start && schedule.end && schedule.start >= schedule.end) {
      errors.push(`Schedule ${i}: Start time must be before end time`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get default business hours (Monday-Friday 9AM-5PM)
 * @returns {Array}
 */
function getDefaultBusinessHours() {
  return [
    { day: 1, start: "09:00", end: "17:00" }, // Monday
    { day: 2, start: "09:00", end: "17:00" }, // Tuesday
    { day: 3, start: "09:00", end: "17:00" }, // Wednesday
    { day: 4, start: "09:00", end: "17:00" }, // Thursday
    { day: 5, start: "09:00", end: "17:00" }, // Friday
  ];
}

module.exports = {
  checkBusinessHours,
  getCurrentTimeInTimezone,
  validateBusinessHours,
  getDefaultBusinessHours,
};
