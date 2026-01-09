const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const logger = require("./utils/logger");
const responseFormatter = require("./middleware/responseFormatter");

// Import routes
const authRoutes = require("./routes/auth");
const whatsappRoutes = require("./routes/whatsapp");
const whatsappMultiDeviceRoutes = require("./routes/whatsappMultiDevice");
const sseRoutes = require("./routes/sse");
const adminRoutes = require("./routes/admin");
const botRoutes = require("./routes/bot");

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // limit each IP to 300 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Response formatter middleware (harus setelah body parser)
app.use(responseFormatter);

// Static file serving for uploads (profile photos, media, etc.)
const uploadDir = process.env.UPLOAD_PATH || "./uploads";
app.use("/uploads", express.static(path.resolve(uploadDir)));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/whatsapp", whatsappRoutes); // Legacy routes (backward compatibility)
app.use("/api/whatsapp-multi-device", whatsappMultiDeviceRoutes); // New multi-device routes
app.use("/api/events", sseRoutes);
app.use("/api/admin", adminRoutes); // Admin-only routes (requires admin role)
app.use("/api/bot", botRoutes); // Bot auto-reply routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "WhatsApp Service Backend is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error("Global error handler:", error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5005;

// Start server (database setup handled by server.js)
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  console.log(
    `🚀 WhatsApp Service Backend running on http://localhost:${PORT}`
  );
});

module.exports = app;
