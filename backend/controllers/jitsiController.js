const pool = require('../config/database');

/**
 * Get Jitsi meeting info for an event
 * Returns room name and password (only if user is organizer)
 */
const getJitsiInfo = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    // Get event with Jitsi credentials
    const result = await pool.query(
      `SELECT event_id, organizer_id, jitsi_room, jitsi_password, title
       FROM events
       WHERE event_id = $1`,
      [eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = result.rows[0];

    // Check if Jitsi room has been generated
    if (!event.jitsi_room) {
      return res.status(404).json({ 
        error: 'Jitsi meeting not available for this event',
        message: 'The event may not be approved yet or does not have video conferencing enabled'
      });
    }

    // Check if user is the organizer
    const isOrganizer = event.organizer_id === userId;

    // Return room info
    const response = {
      roomName: event.jitsi_room,
      isOrganizer,
      eventTitle: event.title
    };

    // Only include password if user is organizer
    if (isOrganizer) {
      response.password = event.jitsi_password;
    }

    res.json(response);
  } catch (error) {
    console.error('Get Jitsi info error:', error);
    res.status(500).json({ error: 'Failed to fetch Jitsi meeting info' });
  }
};

module.exports = {
  getJitsiInfo
};
