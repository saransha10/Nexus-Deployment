const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { authenticate, optionalAuthenticate } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/roleCheck');
const {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getOrganizerEvents,
  emailAttendees
} = require('../controllers/eventController');
const { getJitsiInfo } = require('../controllers/jitsiController');

// Configure multer for event image uploads
const fs = require('fs');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/events/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes
router.get('/', optionalAuthenticate, getAllEvents);

// Protected routes (require authentication and specific roles)
// Note: Specific routes must come before parameterized routes
router.get('/organizer/my-events', authenticate, checkRole('organizer', 'admin'), getOrganizerEvents);
router.get('/:eventId/jitsi-info', authenticate, getJitsiInfo);
router.post('/', authenticate, checkRole('organizer', 'admin'), upload.single('event_image'), createEvent);

// Email attendees route (must come before :id route)
router.post('/:id/email-attendees', authenticate, emailAttendees);

// Public route for single event (must come after specific routes)
router.get('/:id', optionalAuthenticate, getEventById);

// Protected routes for update/delete
router.put('/:id', authenticate, upload.single('event_image'), updateEvent);
router.delete('/:id', authenticate, deleteEvent);

module.exports = router;
