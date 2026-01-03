/**
 * Response Formatter Middleware
 * 
 * Middleware untuk otomatis menambahkan timestamp ke semua response
 * Memastikan format response konsisten sesuai dokumentasi API
 */

const { getFormattedTimestamp } = require("../utils/responseHelper");

/**
 * Middleware untuk format response standar
 * Menambahkan timestamp jika belum ada di response
 */
const responseFormatter = (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method
  res.json = function (data) {
    // Jika response sudah memiliki timestamp, skip
    if (data && typeof data === "object" && data.timestamp) {
      return originalJson(data);
    }

    // Jika response adalah object, tambahkan timestamp
    if (data && typeof data === "object") {
      data.timestamp = getFormattedTimestamp();
    }

    return originalJson(data);
  };

  next();
};

module.exports = responseFormatter;

