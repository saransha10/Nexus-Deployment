const pool = require('../config/database');
const { 
  sendRegistrationConfirmationEmail, 
  sendEventReminderEmail,
  sendNewAttendeeNotification 
} = require('../utils/email');

// Create in-app notification
const createNotification = async (userId, type, title, message, eventId = null) => {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, event_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, message, eventId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { unread_only } = req.query;

    let query = `
      SELECT n.*, e.title as event_title
      FROM notifications n
      LEFT JOIN events e ON n.event_id = e.event_id
      WHERE n.user_id = $1
    `;

    if (unread_only === 'true') {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT 50';

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE notification_id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Get notification preferences
const getPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;

    let result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    // Create default preferences if they don't exist
    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO notification_preferences (user_id) 
         VALUES ($1) 
         RETURNING *`,
        [userId]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
};

// Update notification preferences
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      email_registration,
      email_reminder,
      email_updates,
      email_cancellation,
      email_qa_answer,
      email_new_poll,
      email_new_question,
      in_app_notifications
    } = req.body;

    const result = await pool.query(
      `INSERT INTO notification_preferences 
       (user_id, email_registration, email_reminder, email_updates, email_cancellation, email_qa_answer, email_new_poll, email_new_question, in_app_notifications, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET
         email_registration = COALESCE($2, notification_preferences.email_registration),
         email_reminder = COALESCE($3, notification_preferences.email_reminder),
         email_updates = COALESCE($4, notification_preferences.email_updates),
         email_cancellation = COALESCE($5, notification_preferences.email_cancellation),
         email_qa_answer = COALESCE($6, notification_preferences.email_qa_answer),
         email_new_poll = COALESCE($7, notification_preferences.email_new_poll),
         email_new_question = COALESCE($8, notification_preferences.email_new_question),
         in_app_notifications = COALESCE($9, notification_preferences.in_app_notifications),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, email_registration, email_reminder, email_updates, email_cancellation, email_qa_answer, email_new_poll, email_new_question, in_app_notifications]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};

// Send registration notification (called from ticket controller)
const sendRegistrationNotifications = async (userId, eventId, ticketId) => {
  try {
    console.log('=== STARTING REGISTRATION NOTIFICATIONS ===');
    console.log('Parameters:', { userId, eventId, ticketId });
    
    // Get user preferences - create if not exists
    let prefsResult = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );
    
    if (prefsResult.rows.length === 0) {
      console.log('No preferences found, creating defaults...');
      prefsResult = await pool.query(
        `INSERT INTO notification_preferences (user_id) 
         VALUES ($1) 
         RETURNING *`,
        [userId]
      );
    }
    
    const prefs = prefsResult.rows[0];
    console.log('User preferences:', JSON.stringify(prefs, null, 2));

    // Get user, event, and ticket details
    console.log('Fetching user data...');
    const userResult = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error(`User not found: ${userId}`);
    }
    const user = userResult.rows[0];
    console.log('User found:', user.email);

    console.log('Fetching event data...');
    const eventResult = await pool.query('SELECT * FROM events WHERE event_id = $1', [eventId]);
    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];
    console.log('Event found:', event.title);

    console.log('Fetching ticket data...');
    const ticketResult = await pool.query(
      `SELECT t.*, tt.type_name 
       FROM tickets t
       JOIN ticket_types tt ON t.ticket_type_id = tt.ticket_type_id
       WHERE t.ticket_id = $1`,
      [ticketId]
    );
    if (ticketResult.rows.length === 0) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }
    const ticket = ticketResult.rows[0];
    console.log('Ticket found:', ticket.type_name);

    // Send email if enabled
    if (prefs.email_registration !== false) {
      console.log('=== SENDING REGISTRATION EMAIL ===');
      console.log('To:', user.email);
      console.log('Event:', event.title);
      try {
        const emailResult = await sendRegistrationConfirmationEmail(
          user.email,
          user.name,
          event,
          ticket
        );
        console.log('✓ Registration email sent successfully:', emailResult?.messageId);
      } catch (emailError) {
        console.error('✗ REGISTRATION EMAIL FAILED:', emailError.message);
        console.error('Email error details:', emailError);
        throw emailError; // Re-throw to see in main catch
      }
    } else {
      console.log('⊘ Email registration disabled in preferences');
    }

    // Create in-app notification if enabled
    if (prefs.in_app_notifications !== false) {
      console.log('=== CREATING IN-APP NOTIFICATION ===');
      try {
        await createNotification(
          userId,
          'registration',
          'Registration Confirmed',
          `You're registered for ${event.title}`,
          eventId
        );
        console.log('✓ In-app notification created');
      } catch (notifError) {
        console.error('✗ IN-APP NOTIFICATION FAILED:', notifError.message);
      }
    } else {
      console.log('⊘ In-app notifications disabled in preferences');
    }

    // Notify organizer
    console.log('=== NOTIFYING ORGANIZER ===');
    const organizerResult = await pool.query('SELECT * FROM users WHERE user_id = $1', [event.organizer_id]);
    if (organizerResult.rows.length === 0) {
      console.error('Organizer not found:', event.organizer_id);
    } else {
      const organizer = organizerResult.rows[0];
      console.log('Organizer:', organizer.email);
      
      try {
        const orgEmailResult = await sendNewAttendeeNotification(
          organizer.email,
          organizer.name,
          event,
          { name: user.name, email: user.email, ticket_type: ticket.type_name }
        );
        console.log('✓ Organizer email sent:', orgEmailResult?.messageId);

        await createNotification(
          event.organizer_id,
          'new_attendee',
          'New Registration',
          `${user.name} registered for ${event.title}`,
          eventId
        );
        console.log('✓ Organizer in-app notification created');
      } catch (orgError) {
        console.error('✗ ORGANIZER NOTIFICATION FAILED:', orgError.message);
      }
    }

    console.log('=== REGISTRATION NOTIFICATIONS COMPLETE ===');

  } catch (error) {
    console.error('=== REGISTRATION NOTIFICATIONS ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    // Don't throw - notifications are non-critical
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  sendRegistrationNotifications
};
