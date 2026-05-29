const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/database');
const { sendPasswordResetEmail } = require('../utils/email');

// Forgot Password - Send reset link
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    const user = result.rows[0];

    // Check if user has a password set
    if (!user.password_hash) {
      if (user.auth_provider === 'google') {
        return res.status(400).json({ 
          error: 'This account uses Google login and has no password set. Please sign in with Google or set a password in Settings first.' 
        });
      } else {
        return res.status(400).json({ 
          error: 'This account has no password set. Please contact support.' 
        });
      }
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token in database
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE user_id = $3',
      [resetTokenHash, resetTokenExpiry, user.user_id]
    );

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send email with reset link
    try {
      await sendPasswordResetEmail(email, resetUrl, user.name);
      console.log('✅ Password reset email sent to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError.message);
      // Still return success to not reveal if email exists
    }

    res.json({ 
      message: 'If the email exists, a reset link has been sent to your email address'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// Reset Password - Update password with token
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Password validation - Standard requirements
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one special character (!@#$%^&*...)' });
    }

    // Hash the token to compare with database
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [resetTokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];

    // Hash new password
    const password_hash = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = $2',
      [password_hash, user.user_id]
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
};
