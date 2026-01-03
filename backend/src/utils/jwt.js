const jwt = require("jsonwebtoken");

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m", // Shorter access token
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "30d", // Longer refresh token
  });
};

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
};
