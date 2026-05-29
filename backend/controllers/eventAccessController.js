const pool = require('../config/database');
const crypto = require('crypto');

// Log event access
const logEventAccess = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { accessType = 'view' } = req.body;
    const userId = req.user.userId;

    // Get user's IP address
    const ipAddress = req.headers['x-forwarded-for'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress;

    const userAgent = req.headers['user-agent'];

    // Check if user has valid ticket
    const ticketCheck = await pool.query(
      'SELECT ticket_id FROM tickets WHERE user_id = $1 AND event_id = $2 AND status = $3',
      [userId, eventId, 'active']
    );

    if (ticketCheck.rows.length === 0) {
      return res.status(403).json({ error: 'No valid ticket for this event' });
    }

    const ticketId = ticketCheck.rows[0].ticket_id;

    // Log the access
    await pool.query(
      `INSERT INTO event_access_logs (event_id, user_id, ticket_id, access_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [eventId, userId, ticketId, accessType, ipAddress, userAgent]
    );

    // Update ticket access count
    await pool.query(
      `UPDATE tickets 
       SET last_accessed_at = NOW(), access_count = access_count + 1 
       WHERE ticket_id = $1`,
      [ticketId]
    );

    res.json({ message: 'Access logged successfully' });
  } catch (error) {
    console.error('Log event access error:', error);
    res.status(500).json({ error: 'Failed to log access' });
  }
};

// Generate unique meeting token for user
const generateMeetingToken = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    // First, check if user is the organizer
    const eventCheck = await pool.query(
      'SELECT * FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];
    const isOrganizer = event.organizer_id === userId;

    // Check if user has valid ticket (skip for organizers)
    if (!isOrganizer) {
      const ticketCheck = await pool.query(
        `SELECT t.*, e.start_time, e.end_time, e.meeting_type, e.meeting_room_id, e.streaming_url, e.organizer_joined
         FROM tickets t
         JOIN events e ON t.event_id = e.event_id
         WHERE t.user_id = $1 AND t.event_id = $2 AND t.status = $3`,
        [userId, eventId, 'active']
      );

      if (ticketCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No valid ticket for this event' });
      }

      var ticket = ticketCheck.rows[0];

      // IMPORTANT: Block participants if organizer hasn't joined yet
      if (!ticket.organizer_joined) {
        return res.status(403).json({ 
          error: 'Organizer has not joined the meeting yet',
          message: 'Please wait for the organizer to start the meeting before joining.'
        });
      }
    }

    // Check if event is live or about to start (within 30 minutes)
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    const thirtyMinutesBefore = new Date(startTime.getTime() - 30 * 60 * 1000);

    if (now < thirtyMinutesBefore) {
      return res.status(400).json({ 
        error: 'Event has not started yet',
        starts_at: startTime.toISOString()
      });
    }

    if (now > endTime) {
      return res.status(400).json({ 
        error: 'Event has ended',
        ended_at: endTime.toISOString()
      });
    }

    // Generate unique token
    const uniqueToken = crypto.randomBytes(32).toString('hex');

    // Store token in ticket (only if not organizer)
    if (!isOrganizer && ticket) {
      await pool.query(
        'UPDATE tickets SET unique_meeting_token = $1 WHERE ticket_id = $2',
        [uniqueToken, ticket.ticket_id]
      );
    }

    // If organizer is joining, mark organizer_joined as true
    if (isOrganizer) {
      await pool.query(
        'UPDATE events SET organizer_joined = TRUE WHERE event_id = $1',
        [eventId]
      );
    }

    // Return meeting info based on type
    const meetingInfo = {
      meeting_type: event.meeting_type,
      token: uniqueToken,
      ticket_id: isOrganizer ? null : ticket.ticket_id,
      is_organizer: isOrganizer,
      organizer_joined: isOrganizer ? true : event.organizer_joined
    };

    if (event.meeting_type === 'builtin') {
      // Generate secure random room name if not exists
      let roomName = event.meeting_room_id;
      if (!roomName) {
        // Create secure random room name: nexus-{eventId}-{random}
        roomName = `nexus-${eventId}-${crypto.randomBytes(8).toString('hex')}`;
        
        // Save room name to database
        await pool.query(
          'UPDATE events SET meeting_room_id = $1 WHERE event_id = $2',
          [roomName, eventId]
        );
      }

      meetingInfo.room_name = roomName;
      meetingInfo.display_name = req.user.name + (isOrganizer ? ' (Organizer)' : '');
      meetingInfo.email = req.user.email;
    } else {
      meetingInfo.streaming_url = event.streaming_url;
    }

    res.json(meetingInfo);
  } catch (error) {
    console.error('Generate meeting token error:', error);
    res.status(500).json({ error: 'Failed to generate meeting token' });
  }
};

// Verify meeting token
const verifyMeetingToken = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { token } = req.body;
    const userId = req.user.userId;

    // Verify token belongs to this user and event
    const result = await pool.query(
      `SELECT t.*, e.end_time
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE t.user_id = $1 AND t.event_id = $2 AND t.unique_meeting_token = $3 AND t.status = $4`,
      [userId, eventId, token, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ 
        valid: false, 
        error: 'Invalid or expired token' 
      });
    }

    const ticket = result.rows[0];

    // Check if event has ended
    if (new Date() > new Date(ticket.end_time)) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Event has ended' 
      });
    }

    res.json({ 
      valid: true, 
      ticket_id: ticket.ticket_id 
    });
  } catch (error) {
    console.error('Verify meeting token error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
};

// Get suspicious access activity (admin/organizer only)
const getSuspiciousActivity = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user is organizer or admin
    if (userRole !== 'admin') {
      const eventCheck = await pool.query(
        'SELECT organizer_id FROM events WHERE event_id = $1',
        [eventId]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (eventCheck.rows[0].organizer_id !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    // Get suspicious activity for this event
    const result = await pool.query(
      `SELECT 
        t.ticket_id,
        u.name as user_name,
        u.email as user_email,
        COUNT(DISTINCT eal.ip_address) as unique_ips,
        COUNT(*) as access_count,
        array_agg(DISTINCT eal.ip_address) as ip_addresses,
        MAX(eal.accessed_at) as last_access
       FROM event_access_logs eal
       JOIN tickets t ON eal.ticket_id = t.ticket_id
       JOIN users u ON eal.user_id = u.user_id
       WHERE eal.event_id = $1 AND eal.accessed_at > NOW() - INTERVAL '24 hours'
       GROUP BY t.ticket_id, u.name, u.email
       HAVING COUNT(DISTINCT eal.ip_address) > 2
       ORDER BY unique_ips DESC, access_count DESC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get suspicious activity error:', error);
    res.status(500).json({ error: 'Failed to fetch suspicious activity' });
  }
};

// Get event access logs (admin/organizer only)
const getEventAccessLogs = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { limit = 100 } = req.query;

    // Check if user is organizer or admin
    if (userRole !== 'admin') {
      const eventCheck = await pool.query(
        'SELECT organizer_id FROM events WHERE event_id = $1',
        [eventId]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (eventCheck.rows[0].organizer_id !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    // Get access logs
    const result = await pool.query(
      `SELECT 
        eal.*,
        u.name as user_name,
        u.email as user_email,
        t.ticket_type
       FROM event_access_logs eal
       JOIN users u ON eal.user_id = u.user_id
       JOIN tickets t ON eal.ticket_id = t.ticket_id
       WHERE eal.event_id = $1
       ORDER BY eal.accessed_at DESC
       LIMIT $2`,
      [eventId, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get event access logs error:', error);
    res.status(500).json({ error: 'Failed to fetch access logs' });
  }
};

module.exports = {
  logEventAccess,
  generateMeetingToken,
  verifyMeetingToken,
  getSuspiciousActivity,
  getEventAccessLogs
};
