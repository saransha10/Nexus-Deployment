const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/roleCheck');
const {
  registerForEvent,
  getUserTickets,
  getTicketById,
  cancelTicket,
  deleteTicket,
  checkRegistration,
  getEventAttendees,
  validateQRCode,
  checkTicketAvailability,
  getQRStatus
} = require('../controllers/ticketController');

// Check ticket availability before payment
router.post('/check-availability/:eventId', authenticate, checkTicketAvailability);

// All routes require authentication
router.post('/register/:eventId', authenticate, registerForEvent);
router.get('/my-tickets', authenticate, getUserTickets);
router.get('/:ticketId', authenticate, getTicketById);
router.put('/:ticketId/cancel', authenticate, cancelTicket); // Changed to PUT for cancel
router.delete('/:ticketId', authenticate, deleteTicket); // DELETE for permanent deletion
router.get('/check/:eventId', authenticate, checkRegistration);
router.get('/event/:eventId/attendees', authenticate, checkRole('organizer', 'admin'), getEventAttendees);

// QR Code validation (for organizers/admins at event entry)
router.post('/validate-qr', authenticate, checkRole('organizer', 'admin'), validateQRCode);

// QR Code status check (for users to check their QR validity)
router.post('/qr-status', authenticate, getQRStatus);

module.exports = router;
