const User = require('../models/User');
const { generateTokenPair, verifyToken, generateSecureCode, hashCode } = require('../utils/token');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── Register ─────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const verifyCode = generateSecureCode();
    const user = await User.create({
      name,
      email,
      password,
      emailVerifyToken: hashCode(verifyCode),
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const verifyUrl = `${CLIENT_URL}/verify-email?token=${verifyCode}&id=${user._id}`;
    await sendVerificationEmail({ to: email, name, verifyUrl });

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email to continue.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── Verify Email ─────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token, id } = req.body;
    if (!token || !id) {
      return res.status(400).json({ success: false, message: 'Verification token and ID required' });
    }

    const user = await User.findById(id).select('+emailVerifyToken +emailVerifyExpires');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.isEmailVerified) {
      return res.status(200).json({ success: true, message: 'Email already verified' });
    }

    if (Date.now() > user.emailVerifyExpires) {
      return res.status(400).json({ success: false, message: 'Verification link expired. Please request a new one.' });
    }

    const hashedToken = hashCode(token);
    if (hashedToken !== user.emailVerifyToken) {
      return res.status(400).json({ success: false, message: 'Invalid verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

// ─── Resend Verification ──────────────────────────────────
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+emailVerifyToken +emailVerifyExpires');
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, a link has been sent.' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    const verifyCode = generateSecureCode();
    user.emailVerifyToken = hashCode(verifyCode);
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verifyUrl = `${CLIENT_URL}/verify-email?token=${verifyCode}&id=${user._id}`;
    await sendVerificationEmail({ to: email, name: user.name, verifyUrl });

    res.json({ success: true, message: 'Verification email resent.' });
  } catch (err) {
    next(err);
  }
};

// ─── Login ────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil +refreshTokenHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    if (user.isLocked()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken, expiresIn } = generateTokenPair(user);

    // Store hashed refresh token
    user.refreshTokenHash = hashCode(refreshToken);
    await user.resetLoginAttempts(); // also saves

    res.json({
      success: true,
      data: {
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
        expiresIn,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Refresh Token ────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    if (decoded.tokenType !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.userId).select('+refreshTokenHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Validate stored refresh token hash (token rotation security)
    const incomingHash = hashCode(refreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      return res.status(401).json({ success: false, message: 'Refresh token reuse detected. Please log in again.' });
    }

    const { accessToken, refreshToken: newRefreshToken, expiresIn } = generateTokenPair(user);

    // Rotate refresh token
    user.refreshTokenHash = hashCode(newRefreshToken);
    await user.save();

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken, expiresIn },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Logout ───────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    req.user.refreshTokenHash = undefined;
    await req.user.save();
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── Forgot Password ──────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');

    // Always return same message to prevent email enumeration
    const genericMsg = 'If that email exists, a reset link has been sent.';

    if (!user) return res.json({ success: true, message: genericMsg });

    const resetCode = generateSecureCode();
    user.passwordResetToken = hashCode(resetCode);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${CLIENT_URL}/reset-password?token=${resetCode}&id=${user._id}`;
    await sendPasswordResetEmail({ to: email, name: user.name, resetUrl });

    res.json({ success: true, message: genericMsg });
  } catch (err) {
    next(err);
  }
};

// ─── Reset Password ───────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, id, password } = req.body;
    if (!token || !id || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const user = await User.findById(id).select('+passwordResetToken +passwordResetExpires');
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });
    }

    if (Date.now() > user.passwordResetExpires) {
      return res.status(400).json({ success: false, message: 'Reset link expired. Please request a new one.' });
    }

    const hashedToken = hashCode(token);
    if (hashedToken !== user.passwordResetToken) {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }

    user.password = password; // pre-save hook hashes it
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokenHash = undefined; // Invalidate all sessions
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
};

// ─── Get Current User ────────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeObject() } });
};

// ─── Change Password (authenticated) ─────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    user.refreshTokenHash = undefined;
    await user.save();

    res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) {
    next(err);
  }
};
