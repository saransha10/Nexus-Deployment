const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const pool = require('../config/database');

// Generate 2FA Secret
const generateTwoFactorSecret = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user details
    const userResult = await pool.query(
      'SELECT email, name FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Nexus Events (${user.email})`,
      issuer: 'Nexus Events',
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (not enabled yet)
    await pool.query(
      'UPDATE users SET two_factor_secret = $1 WHERE user_id = $2',
      [secret.base32, userId]
    );

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message: 'Scan this QR code with your authenticator app',
    });
  } catch (error) {
    console.error('Generate 2FA secret error:', error);
    res.status(500).json({ error: 'Failed to generate 2FA secret' });
  }
};

// Enable 2FA
const enableTwoFactor = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    // Get user's secret
    const result = await pool.query(
      'SELECT two_factor_secret FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const secret = result.rows[0].two_factor_secret;

    if (!secret) {
      return res.status(400).json({ error: 'Please generate 2FA secret first' });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Enable 2FA
    await pool.query(
      'UPDATE users SET two_factor_enabled = true WHERE user_id = $1',
      [userId]
    );

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
};

// Disable 2FA
const disableTwoFactor = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(password, result.rows[0].password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Disable 2FA
    await pool.query(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE user_id = $1',
      [userId]
    );

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// Check 2FA Status
const getTwoFactorStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT two_factor_enabled FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      enabled: result.rows[0].two_factor_enabled || false 
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
};

module.exports = {
  generateTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus,
};
