const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/database');
const { generateToken } = require('../config/jwt');
const { sendEmail } = require('../utils/email');

// User Registration
const register = async (req, res) => {
  try {
    const { name, email, password, role = 'attendee' } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
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

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Insert user with email_verified = false
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, auth_provider, email_verified, verification_token, verification_token_expiry) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING user_id, name, email, role, created_at, email_verified`,
      [name, email, password_hash, role, 'local', false, verificationToken, verificationTokenExpiry]
    );

    const user = result.rows[0];

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #0891b2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Nexus Events!</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Thank you for registering with Nexus Events! To complete your registration and start discovering amazing events, please verify your email address.</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #0891b2;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account with Nexus Events, you can safely ignore this email.</p>
            <p>Best regards,<br/>Nexus Events Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      console.log('=== REGISTRATION: SENDING VERIFICATION EMAIL ===');
      console.log('To:', email);
      console.log('Verification URL:', verificationUrl);
      await sendEmail(email, 'Verify Your Email - Nexus Events', emailHtml);
      console.log('✅ Verification email sent successfully to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      console.error('Error details:', emailError.message);
      // Continue with registration even if email fails
    }

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        email_verified: user.email_verified
      },
      requiresVerification: true
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// User Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user (support both local and Google users with passwords)
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Debug logging
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', user.email);
    console.log('Auth Provider:', user.auth_provider);
    console.log('Email Verified:', user.email_verified);
    console.log('Role:', user.role);

    // Check if email is verified (only for local auth users, admins bypass this)
    if (user.auth_provider === 'local' && !user.email_verified && user.role !== 'admin') {
      console.log('❌ Login blocked - email not verified');
      return res.status(403).json({ 
        error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        requiresVerification: true 
      });
    }
    
    console.log('✅ Email verification check passed');

    // Check if password exists
    if (!user.password_hash) {
      if (user.auth_provider === 'google') {
        return res.status(401).json({ error: 'This account uses Google login. Please sign in with Google or set a password in Settings.' });
      } else {
        return res.status(401).json({ error: 'Please login with Google' });
      }
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ userId: user.user_id, role: user.role });

    res.json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Verify Email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user with this token
    const result = await pool.query(
      'SELECT * FROM users WHERE verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = result.rows[0];

    // Check if token has expired
    if (new Date() > new Date(user.verification_token_expiry)) {
      return res.status(400).json({ error: 'Verification token has expired. Please request a new one.' });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Update user to verified
    await pool.query(
      'UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expiry = NULL WHERE user_id = $1',
      [user.user_id]
    );

    // Generate login token
    const authToken = generateToken({ userId: user.user_id, role: user.role });

    res.json({
      message: 'Email verified successfully! You can now log in.',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
      },
      token: authToken
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
};

// Resend Verification Email
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await pool.query(
      'UPDATE users SET verification_token = $1, verification_token_expiry = $2 WHERE user_id = $3',
      [verificationToken, verificationTokenExpiry, user.user_id]
    );

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #0891b2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hello ${user.name},</p>
            <p>You requested a new verification link for your Nexus Events account. Please click the button below to verify your email address.</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #0891b2;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>Best regards,<br/>Nexus Events Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('=== RESEND VERIFICATION EMAIL ===');
    console.log('To:', email);
    console.log('User ID:', user.user_id);
    console.log('Verification URL:', verificationUrl);
    
    await sendEmail(email, 'Verify Your Email - Nexus Events', emailHtml);
    
    console.log('✅ Verification email resent successfully to:', email);

    res.json({
      message: 'Verification email sent! Please check your inbox.'
    });
  } catch (error) {
    console.error('❌ Resend verification error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
};
