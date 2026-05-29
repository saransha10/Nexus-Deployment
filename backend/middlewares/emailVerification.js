const pool = require('../config/database');

// Middleware to require email verification for critical actions
const requireEmailVerification = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Admins bypass email verification
    if (userRole === 'admin') {
      return next();
    }

    // Get user's email verification status
    const result = await pool.query(
      'SELECT email_verified, auth_provider FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Google OAuth users are auto-verified
    if (user.auth_provider === 'google' || user.email_verified) {
      return next();
    }

    // Email not verified
    return res.status(403).json({ 
      error: 'Email verification required',
      message: 'Please verify your email address to perform this action. Check your inbox for the verification link.',
      emailVerificationRequired: true
    });
  } catch (error) {
    console.error('Email verification check error:', error);
    res.status(500).json({ error: 'Verification check failed' });
  }
};

module.exports = {
  requireEmailVerification
};
