const { verifyToken } = require('../utils/token');
const User = require('../models/User');

/**
 * Protect routes — require valid access token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 🔍 Debug log (remove later)
    console.log("Auth Header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.message || "Invalid token",
      });
    }

    // ✅ Check decoded properly
    if (!decoded || decoded.tokenType !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type",
      });
    }

    const user = await User.findById(decoded.userId).select("+isActive");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Error:", err.message);

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};
/**
 * Require email verification
 */
const requireVerified = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address before continuing',
    });
  }
  next();
};

/**
 * Role-based authorization
 * Usage: authorize('admin') or authorize('admin', 'moderator')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied — required role: ${roles.join(' or ')}`,
    });
  }
  next();
};

module.exports = { authenticate, requireVerified, authorize };
