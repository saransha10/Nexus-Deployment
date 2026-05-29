const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences
} = require('../controllers/notificationController');

// Get user notifications
router.get('/', authenticate, getUserNotifications);

// Mark notification as read
router.put('/:id/read', authenticate, markAsRead);

// Mark all notifications as read
router.put('/read-all', authenticate, markAllAsRead);

// Delete notification
router.delete('/:id', authenticate, deleteNotification);

// Get notification preferences
router.get('/preferences', authenticate, getPreferences);

// Update notification preferences
router.put('/preferences', authenticate, updatePreferences);

module.exports = router;
