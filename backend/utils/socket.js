// Socket.IO utility functions for emitting events

/**
 * Emit chat message to event room
 */
const emitChatMessage = (io, eventId, message) => {
  io.to(`event-${eventId}`).emit('chat-message', message);
};

/**
 * Emit poll update to event room
 */
const emitPollUpdate = (io, eventId, pollData) => {
  io.to(`event-${eventId}`).emit('poll-update', pollData);
};

/**
 * Emit new question to event room
 */
const emitNewQuestion = (io, eventId, question) => {
  io.to(`event-${eventId}`).emit('question-new', question);
};

/**
 * Emit question update (upvote, answer) to event room
 */
const emitQuestionUpdate = (io, eventId, question) => {
  io.to(`event-${eventId}`).emit('question-update', question);
};

/**
 * Emit organizer joined notification
 */
const emitOrganizerJoined = (io, eventId, data) => {
  io.to(`event-${eventId}`).emit('organizer-joined', data);
};

/**
 * Emit ticket purchase update
 */
const emitTicketUpdate = (io, eventId, ticketData) => {
  io.to(`event-${eventId}`).emit('ticket-update', ticketData);
};

/**
 * Emit analytics update
 */
const emitAnalyticsUpdate = (io, eventId, analyticsData) => {
  io.to(`event-${eventId}`).emit('analytics-update', analyticsData);
};

/**
 * Emit notification to specific user
 */
const emitUserNotification = (io, userId, notification) => {
  io.to(`user-${userId}`).emit('notification', notification);
};

module.exports = {
  emitChatMessage,
  emitPollUpdate,
  emitNewQuestion,
  emitQuestionUpdate,
  emitOrganizerJoined,
  emitTicketUpdate,
  emitAnalyticsUpdate,
  emitUserNotification,
};
