const pool = require('../config/database');
const { emitChatMessage } = require('../utils/socket');

// Get chat messages for an event
const getEventMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT m.message_id, m.content, m.created_at,
              u.name as sender_name, u.profile_picture, u.role
       FROM messages m
       JOIN users u ON m.user_id = u.user_id
       WHERE m.event_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [eventId, limit, offset]
    );

    res.json(result.rows.reverse()); // Reverse to show oldest first
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send a chat message
const sendMessage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Message too long (max 1000 characters)' });
    }

    // Check if user has access to this event (has ticket or is organizer)
    const accessCheck = await pool.query(
      `SELECT 1 FROM tickets WHERE user_id = $1 AND event_id = $2 AND status = 'active'
       UNION
       SELECT 1 FROM events WHERE organizer_id = $1 AND event_id = $2`,
      [userId, eventId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this event chat' });
    }

    const result = await pool.query(
      `INSERT INTO messages (user_id, event_id, content)
       VALUES ($1, $2, $3)
       RETURNING message_id, content, created_at`,
      [userId, eventId, content.trim()]
    );

    // Get user info for the response
    const userInfo = await pool.query(
      'SELECT name, profile_picture, role FROM users WHERE user_id = $1',
      [userId]
    );

    const message = {
      ...result.rows[0],
      sender_name: userInfo.rows[0].name,
      profile_picture: userInfo.rows[0].profile_picture,
      role: userInfo.rows[0].role,
      user_id: userId
    };

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      emitChatMessage(io, eventId, message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Delete a message (organizer/admin only)
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get message details
    const messageCheck = await pool.query(
      `SELECT m.*, e.organizer_id 
       FROM messages m
       JOIN events e ON m.event_id = e.event_id
       WHERE m.message_id = $1`,
      [messageId]
    );

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageCheck.rows[0];

    // Check permissions: message owner, event organizer, or admin
    if (message.user_id !== userId && 
        message.organizer_id !== userId && 
        userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    await pool.query('DELETE FROM messages WHERE message_id = $1', [messageId]);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

module.exports = {
  getEventMessages,
  sendMessage,
  deleteMessage
};