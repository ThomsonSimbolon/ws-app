const Joi = require("joi");

/**
 * Normalize phone number sesuai dokumentasi
 * Format yang didukung: +62, 62, atau 0 diikuti 8-13 digit
 * @param {string} phone - Phone number
 * @returns {string|null} Normalized phone number (tanpa +, tanpa leading 0) atau null jika invalid
 */
function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== "string") {
    return null;
  }

  // Remove all non-digit characters except +
  let cleaned = phone.trim();

  // Handle +62 format
  if (cleaned.startsWith("+62")) {
    cleaned = cleaned.substring(3); // Remove +62
  } else if (cleaned.startsWith("62")) {
    cleaned = cleaned.substring(2); // Remove 62
  } else if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1); // Remove leading 0
  }

  // Remove all non-digit characters
  cleaned = cleaned.replace(/\D/g, "");

  // Validate: should be 8-13 digits after normalization
  if (cleaned.length < 8 || cleaned.length > 13) {
    return null;
  }

  return cleaned;
}

/**
 * Validate phone number format sesuai dokumentasi
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid
 */
function validatePhoneNumber(phone) {
  const normalized = normalizePhoneNumber(phone);
  return normalized !== null;
}

// User validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid("admin", "user").default("user"),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// WhatsApp validation schemas
const sendMessageSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[1-9]\d{1,14}$/)
    .required(),
  message: Joi.string().min(1).max(1000).required(),
  type: Joi.string().valid("text", "image", "document").default("text"),
});

const bulkMessageSchema = Joi.object({
  phones: Joi.array()
    .items(Joi.string().pattern(/^[1-9]\d{1,14}$/))
    .min(1)
    .max(100)
    .required(),
  message: Joi.string().min(1).max(1000).required(),
  type: Joi.string().valid("text", "image", "document").default("text"),
});

// Device validation schemas
const createDeviceSchema = Joi.object({
  deviceId: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(3)
    .max(50)
    .optional()
    .messages({
      "string.pattern.base": "deviceId hanya boleh mengandung huruf, angka, underscore, dan dash",
      "string.min": "deviceId minimal 3 karakter",
      "string.max": "deviceId maksimal 50 karakter",
    }),
  deviceName: Joi.string().max(100).optional(),
  userId: Joi.number().integer().optional(), // Optional, untuk admin create device untuk user lain
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const { errorResponse } = require("./responseHelper");
      const { response, statusCode } = errorResponse(
        "Validasi error",
        error.details.map((detail) => detail.message).join(", "),
        400
      );
      return res.status(statusCode).json(response);
    }
    next();
  };
};

module.exports = {
  validate,
  normalizePhoneNumber,
  validatePhoneNumber,
  schemas: {
    registerSchema,
    loginSchema,
    sendMessageSchema,
    bulkMessageSchema,
    createDeviceSchema,
  },
};
