const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  getEventPolls,
  createPoll,
  votePoll,
  togglePoll,
  getPollResults
} = require('../controllers/pollController');

// Get polls for an event
router.get('/event/:eventId', authenticate, getEventPolls);

// Create a new poll
router.post('/event/:eventId', authenticate, createPoll);

// Vote on a poll
router.post('/:pollId/vote', authenticate, votePoll);

// Toggle poll active status
router.patch('/:pollId/toggle', authenticate, togglePoll);

// Get poll results
router.get('/:pollId/results', authenticate, getPollResults);

module.exports = router;