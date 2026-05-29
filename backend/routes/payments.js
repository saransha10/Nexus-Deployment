const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const paymentController = require('../controllers/paymentController');

// Create payment record
router.post('/create', authenticate, paymentController.createPayment);

// Complete payment
router.put('/:payment_id/complete', authenticate, paymentController.completePayment);

// Fail payment
router.put('/:payment_id/fail', authenticate, paymentController.failPayment);

// Get user's payment history
router.get('/my-payments', authenticate, paymentController.getUserPayments);

// Get payment analytics for an event (organizer only)
router.get('/analytics/:eventId', authenticate, paymentController.getEventPaymentAnalytics);

// Get failed payments (admin/support)
router.get('/failed', authenticate, paymentController.getFailedPayments);

module.exports = router;