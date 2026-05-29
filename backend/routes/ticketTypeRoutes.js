const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/roleCheck');
const {
  getEventTicketTypes,
  createTicketTypes,
  updateTicketType,
  deleteTicketType
} = require('../controllers/ticketTypeController');

// Public route - get ticket types for an event
router.get('/event/:eventId', getEventTicketTypes);

// Protected routes - manage ticket types
router.post('/event/:eventId', authenticate, checkRole('organizer', 'admin'), createTicketTypes);
router.post('/event/:eventId/single', authenticate, checkRole('organizer', 'admin'), createTicketTypes); // For adding single ticket type
router.put('/:ticketTypeId', authenticate, checkRole('organizer', 'admin'), updateTicketType);
router.delete('/:ticketTypeId', authenticate, checkRole('organizer', 'admin'), deleteTicketType);

module.exports = router;
