const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/roleCheck');
const {
  getEventAnalytics,
  getRevenueAnalytics,
  getAttendanceAnalytics,
  getEngagementAnalytics,
  getOrganizerAnalytics
} = require('../controllers/analyticsController');

// Get event analytics overview
router.get('/event/:eventId', authenticate, getEventAnalytics);

// Get revenue analytics
router.get('/event/:eventId/revenue', authenticate, getRevenueAnalytics);

// Get attendance analytics
router.get('/event/:eventId/attendance', authenticate, getAttendanceAnalytics);

// Get engagement analytics
router.get('/event/:eventId/engagement', authenticate, getEngagementAnalytics);

// Get organizer dashboard analytics
router.get('/organizer/dashboard', authenticate, checkRole('organizer', 'admin'), getOrganizerAnalytics);

module.exports = router;