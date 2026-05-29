const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/roleCheck');
const { adminLimiter } = require('../middlewares/rateLimiter');
const {
  getAdminDashboard,
  getAllEventsAdmin,
  getPendingEvents,
  getEventDetailsAdmin,
  approveEvent,
  rejectEvent,
  getAllUsers, getUserDetails, updateUserRole, suspendUser, reactivateUser, deleteUser, verifyUserEmail, getUnverifiedUsers,
  getOrganizerPerformance,
  getAllReports, resolveReport,
  getSystemSettings, updateSystemSetting,
  getAuditLogs
} = require('../controllers/adminController');

// All routes require admin authentication and rate limiting
router.use(authenticate);
router.use(checkRole('admin'));
router.use(adminLimiter);

// Dashboard
router.get('/dashboard', getAdminDashboard);

// Event Management
router.get('/events', getAllEventsAdmin);
router.get('/events/pending', getPendingEvents);
router.get('/events/:eventId/details', getEventDetailsAdmin);
router.put('/events/:eventId/approve', approveEvent);
router.put('/events/:eventId/reject', rejectEvent);

// User Management
router.get('/users', getAllUsers);
router.get('/users/unverified', getUnverifiedUsers);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId/role', updateUserRole);
router.put('/users/:userId/verify-email', verifyUserEmail);
router.put('/users/:userId/suspend', suspendUser);
router.put('/users/:userId/reactivate', reactivateUser);
router.delete('/users/:userId', deleteUser);

// Organizer Monitoring
router.get('/organizers/performance', getOrganizerPerformance);

// Reports
router.get('/reports', getAllReports);
router.put('/reports/:reportId/resolve', resolveReport);

// System Settings
router.get('/settings', getSystemSettings);
router.put('/settings/:settingKey', updateSystemSetting);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;
