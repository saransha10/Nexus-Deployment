const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  getEventQuestions,
  submitQuestion,
  answerQuestion,
  moderateQuestion,
  deleteQuestion,
  getQuestionLimitStatus
} = require('../controllers/questionController');

// Get Q&A for an event
router.get('/event/:eventId', authenticate, getEventQuestions);

// Get user's question limit status for an event
router.get('/event/:eventId/limit-status', authenticate, getQuestionLimitStatus);

// Submit a question
router.post('/event/:eventId', authenticate, submitQuestion);

// Answer a question
router.patch('/:questionId/answer', authenticate, answerQuestion);

// Moderate question (approve/reject)
router.patch('/:questionId/moderate', authenticate, moderateQuestion);

// Delete question
router.delete('/:questionId', authenticate, deleteQuestion);

module.exports = router;