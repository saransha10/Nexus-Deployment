const bcrypt = require('bcrypt');
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');

// Configure multer — store temp files locally before uploading to Cloudinary
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
    }
  }
});

// Get user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(
      `SELECT user_id, name, email, phone, company, job_title, bio, 
              website, linkedin, twitter, profile_picture, role, auth_provider, created_at,
              CASE WHEN password_hash IS NOT NULL THEN true ELSE false END as password_hash
       FROM users WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update profile information
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone, company, job_title, bio, website, linkedin, twitter } = req.body;

    // Validate name
    if (name && name.trim().length === 0) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (company !== undefined) {
      updates.push(`company = $${paramCount++}`);
      values.push(company);
    }
    if (job_title !== undefined) {
      updates.push(`job_title = $${paramCount++}`);
      values.push(job_title);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(bio?.substring(0, 500)); // Limit to 500 chars
    }
    if (website !== undefined) {
      updates.push(`website = $${paramCount++}`);
      values.push(website);
    }
    if (linkedin !== undefined) {
      updates.push(`linkedin = $${paramCount++}`);
      values.push(linkedin);
    }
    if (twitter !== undefined) {
      updates.push(`twitter = $${paramCount++}`);
      values.push(twitter);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING user_id, name, email, phone, company, job_title, bio, 
                website, linkedin, twitter, profile_picture, role
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update localStorage user data
    const updatedUser = result.rows[0];
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Upload profile photo
const uploadProfilePhoto = async (req, res) => {
  let uploadedPublicId = null;
  try {
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get old profile picture public_id to delete from Cloudinary
    const oldProfile = await pool.query(
      'SELECT profile_picture, profile_picture_public_id FROM users WHERE user_id = $1',
      [userId]
    );

    // Upload new image to Cloudinary
    const { url, public_id } = await uploadToCloudinary(req.file.path, 'nexus/profiles');
    uploadedPublicId = public_id;

    // Update database with Cloudinary URL
    const result = await pool.query(
      `UPDATE users 
       SET profile_picture = $1, profile_picture_public_id = $2
       WHERE user_id = $3 
       RETURNING user_id, name, email, profile_picture, role`,
      [url, public_id, userId]
    );

    // Delete old image from Cloudinary if it existed
    if (oldProfile.rows[0]?.profile_picture_public_id) {
      await deleteFromCloudinary(oldProfile.rows[0].profile_picture_public_id);
    }

    res.json({
      message: 'Profile photo uploaded successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    
    // Cleanup new image from Cloudinary if database update fails
    if (uploadedPublicId) {
      try {
        await deleteFromCloudinary(uploadedPublicId);
      } catch (cleanupError) {
        console.error('Failed to cleanup Cloudinary image:', cleanupError);
      }
    }
    
    res.status(500).json({ error: 'Failed to upload photo' });
  }
};

// Remove profile photo
const removeProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get current profile picture
    const profile = await pool.query(
      'SELECT profile_picture, profile_picture_public_id FROM users WHERE user_id = $1',
      [userId]
    );

    // Delete from Cloudinary if public_id exists
    if (profile.rows[0]?.profile_picture_public_id) {
      await deleteFromCloudinary(profile.rows[0].profile_picture_public_id);
    }

    // Update database
    const result = await pool.query(
      `UPDATE users 
       SET profile_picture = NULL, profile_picture_public_id = NULL
       WHERE user_id = $1 
       RETURNING user_id, name, email, profile_picture, role`,
      [userId]
    );

    res.json({
      message: 'Profile photo removed successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Remove photo error:', error);
    res.status(500).json({ error: 'Failed to remove photo' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT password_hash, auth_provider FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check if user has a password set (regardless of original auth provider)
    if (!user.password_hash) {
      return res.status(400).json({ error: 'No password set. Please set a password first.' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2',
      [newPasswordHash, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Change email
const changeEmail = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ error: 'New email and password are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT password_hash, email, auth_provider FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check if user uses local auth
    if (user.auth_provider !== 'local') {
      return res.status(400).json({ error: 'Cannot change email for Google authenticated accounts' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    // Check if new email already exists
    const existingEmail = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
      [newEmail, userId]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Update email
    const result = await pool.query(
      'UPDATE users SET email = $1 WHERE user_id = $2 RETURNING user_id, name, email, role, profile_picture',
      [newEmail, userId]
    );

    res.json({
      message: 'Email changed successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ error: 'Failed to change email' });
  }
};

// Delete account
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    // Get user
    const userResult = await pool.query(
      'SELECT password_hash, auth_provider, profile_picture, profile_picture_public_id FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify password for local auth users
    if (user.auth_provider === 'local') {
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Password is incorrect' });
      }
    }

    // Delete profile picture from Cloudinary if exists
    if (user.profile_picture_public_id) {
      await deleteFromCloudinary(user.profile_picture_public_id);
    }

    // Delete user (cascade will handle related records)
    await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

// Set password for Google OAuth users
const setPassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ error: 'Password and confirmation are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Password validation
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
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    // Get user to check if they already have a password
    const userResult = await pool.query(
      'SELECT password_hash, auth_provider FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.password_hash) {
      return res.status(400).json({ error: 'Password already set. Use Change Password instead.' });
    }

    // Hash new password
    const bcrypt = require('bcrypt');
    const password_hash = await bcrypt.hash(password, 10);

    // Set password but keep Google auth provider for dual authentication
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2 RETURNING *',
      [password_hash, userId]
    );

    const updatedUser = result.rows[0];

    res.json({ 
      message: 'Password set successfully. You can now login with either Google or email/password.',
      user: {
        user_id: updatedUser.user_id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profile_picture: updatedUser.profile_picture,
        auth_provider: updatedUser.auth_provider,
        email_verified: updatedUser.email_verified
      }
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
  changePassword,
  changeEmail,
  deleteAccount,
  setPassword,
  upload
};
