/**
 * Response Helper Utility
 * 
 * Helper functions untuk format response standar sesuai dokumentasi API
 * Semua response akan otomatis memiliki field timestamp dengan format YYYY-MM-DD HH:mm:ss (Asia/Jakarta)
 */

/**
 * Format timestamp ke format YYYY-MM-DD HH:mm:ss (Asia/Jakarta timezone)
 * @returns {string} Formatted timestamp
 */
function getFormattedTimestamp() {
  const now = new Date();
  // Convert to Asia/Jakarta timezone (UTC+7)
  const jakartaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  
  const year = jakartaTime.getFullYear();
  const month = String(jakartaTime.getMonth() + 1).padStart(2, "0");
  const day = String(jakartaTime.getDate()).padStart(2, "0");
  const hours = String(jakartaTime.getHours()).padStart(2, "0");
  const minutes = String(jakartaTime.getMinutes()).padStart(2, "0");
  const seconds = String(jakartaTime.getSeconds()).padStart(2, "0");
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format success response sesuai dokumentasi
 * @param {Object} data - Data yang akan dikembalikan
 * @param {string} message - Pesan sukses (optional)
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Formatted success response
 */
function successResponse(data = null, message = null, statusCode = 200) {
  const response = {
    success: true,
    timestamp: getFormattedTimestamp(),
  };

  if (message) {
    response.message = message;
  }

  if (data !== null) {
    response.data = data;
  }

  return {
    response,
    statusCode,
  };
}

/**
 * Format error response sesuai dokumentasi
 * @param {string} message - Pesan error
 * @param {string|Object} error - Detail error (optional)
 * @param {number} statusCode - HTTP status code (default: 500)
 * @returns {Object} Formatted error response
 */
function errorResponse(message, error = null, statusCode = 500) {
  const response = {
    success: false,
    message: message,
    timestamp: getFormattedTimestamp(),
  };

  if (error) {
    if (typeof error === "string") {
      response.error = error;
    } else if (error instanceof Error) {
      response.error = error.message;
    } else {
      response.error = error;
    }
  }

  return {
    response,
    statusCode,
  };
}

module.exports = {
  successResponse,
  errorResponse,
  getFormattedTimestamp,
};

