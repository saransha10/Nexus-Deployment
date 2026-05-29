const { generateToken } = require('../config/jwt');
const pool = require('../config/database');

// Google OAuth Callback
const googleCallback = (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }

    // Generate JWT token
    const token = generateToken({ 
      userId: user.user_id, 
      role: user.role 
    });

    const userData = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile_picture: user.profile_picture,
    };

    // Check if this is first time login (role is still 'attendee' default)
    // Redirect to role selection if needed
    if (user.role === 'attendee' && user.auth_provider === 'google') {
      // Check if user just registered (created_at is recent)
      const timeSinceCreation = Date.now() - new Date(user.created_at).getTime();
      const isNewUser = timeSinceCreation < 60000; // Less than 1 minute old

      if (isNewUser) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/role-selection?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`
        );
      }
    }

    // Redirect to frontend with token
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`
    );
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

// Update user role
const updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.user.userId;

    if (!role || !['attendee', 'organizer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await pool.query(
      'UPDATE users SET role = $1 WHERE user_id = $2',
      [role, userId]
    );

    res.json({ message: 'Role updated successfully', role });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

module.exports = {
  googleCallback,
  updateRole,
};
