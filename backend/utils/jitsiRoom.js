const crypto = require('crypto');

/**
 * Generate a unique Jitsi room name for an event
 * @param {number} eventId - The event ID
 * @returns {string} - Unique room name
 */
const generateRoomName = (eventId) => {
  const randomHex = crypto.randomBytes(8).toString('hex');
  return `nexus-event-${eventId}-${randomHex}`;
};

/**
 * Generate a random moderator password for Jitsi room
 * @returns {string} - 8-character hex password
 */
const generateModeratorPassword = () => {
  return crypto.randomBytes(4).toString('hex');
};

/**
 * Generate both room name and password for an event
 * @param {number} eventId - The event ID
 * @returns {object} - Object containing roomName and password
 */
const generateJitsiCredentials = (eventId) => {
  return {
    roomName: generateRoomName(eventId),
    password: generateModeratorPassword()
  };
};

module.exports = {
  generateRoomName,
  generateModeratorPassword,
  generateJitsiCredentials
};
