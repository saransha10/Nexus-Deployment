const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  getEventMessages,
  sendMessage,
  deleteMessage
} = require('../controllers/chatController');

// Get messages for an event
router.get('/event/:eventId', authenticate, getEventMessages);

// Send a message
router.post('/event/:eventId', authenticate, sendMessage);

// Delete a message
router.delete('/message/:messageId', authenticate, deleteMessage);

module.exports = router;