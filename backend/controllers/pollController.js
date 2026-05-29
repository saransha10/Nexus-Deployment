const pool = require('../config/database');
const { emitPollUpdate } = require('../utils/socket');

// Get polls for an event
const getEventPolls = async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `SELECT p.poll_id, p.question, p.is_active, p.created_at,
              u.name as created_by_name,
              json_agg(
                json_build_object(
                  'option_id', po.option_id,
                  'option_text', po.option_text,
                  'vote_count', COALESCE(v.vote_count, 0)
                ) ORDER BY po.option_id
              ) as options
       FROM polls p
       LEFT JOIN users u ON p.created_by = u.user_id
       LEFT JOIN polloptions po ON p.poll_id = po.poll_id
       LEFT JOIN (
         SELECT option_id, COUNT(*) as vote_count
         FROM votes
         GROUP BY option_id
       ) v ON po.option_id = v.option_id
       WHERE p.event_id = $1
       GROUP BY p.poll_id, p.question, p.is_active, p.created_at, u.name
       ORDER BY p.created_at DESC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get polls error:', error);
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
};

// Create a new poll (organizer only)
const createPoll = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { question, options } = req.body;
    const userId = req.user.userId;

    if (!question || !options || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least 2 options are required' });
    }

    if (options.length > 6) {
      return res.status(400).json({ error: 'Maximum 6 options allowed' });
    }

    // Check if user is organizer of this event
    const eventCheck = await pool.query(
      'SELECT organizer_id, title FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only event organizers can create polls' });
    }

    const eventTitle = eventCheck.rows[0].title;

    // Create poll
    const pollResult = await pool.query(
      `INSERT INTO polls (event_id, question, created_by)
       VALUES ($1, $2, $3)
       RETURNING poll_id, question, is_active, created_at`,
      [eventId, question, userId]
    );

    const pollId = pollResult.rows[0].poll_id;

    // Create poll options
    const optionPromises = options.map((option, index) => 
      pool.query(
        'INSERT INTO polloptions (poll_id, option_text) VALUES ($1, $2) RETURNING *',
        [pollId, option.trim()]
      )
    );

    const optionResults = await Promise.all(optionPromises);
    const createdOptions = optionResults.map(result => result.rows[0]);

    // Notify all attendees about new poll
    try {
      const { createNotification } = require('./notificationController');
      const { sendNewPollEmail } = require('../utils/email');
      
      // Get all attendees with their preferences
      const attendees = await pool.query(
        `SELECT DISTINCT t.user_id, u.email, u.name, np.email_new_poll, np.in_app_notifications
         FROM tickets t
         JOIN users u ON t.user_id = u.user_id
         LEFT JOIN notification_preferences np ON t.user_id = np.user_id
         WHERE t.event_id = $1 AND t.status = $2`,
        [eventId, 'active']
      );

      // Send notifications to each attendee based on their preferences
      for (const attendee of attendees.rows) {
        // In-app notification
        if (attendee.in_app_notifications !== false) {
          await createNotification(
            attendee.user_id,
            'new_poll',
            'New Poll Available',
            `New poll in "${eventTitle}": ${question}`,
            eventId
          );
        }

        // Email notification
        if (attendee.email_new_poll !== false) {
          await sendNewPollEmail(
            attendee.email,
            attendee.name,
            { title: eventTitle, event_id: eventId },
            question
          );
        }
      }
    } catch (notifError) {
      console.error('Failed to send poll notifications:', notifError);
    }

    res.status(201).json({
      ...pollResult.rows[0],
      options: createdOptions
    });
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
};

// Vote on a poll
const votePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionId } = req.body;
    const userId = req.user.userId;

    if (!optionId) {
      return res.status(400).json({ error: 'Option ID is required' });
    }

    // Check if poll exists and is active
    const pollCheck = await pool.query(
      `SELECT p.*, e.event_id 
       FROM polls p
       JOIN events e ON p.event_id = e.event_id
       WHERE p.poll_id = $1 AND p.is_active = true`,
      [pollId]
    );

    if (pollCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Poll not found or inactive' });
    }

    const eventId = pollCheck.rows[0].event_id;

    // Check if user has access to this event
    const accessCheck = await pool.query(
      `SELECT 1 FROM tickets WHERE user_id = $1 AND event_id = $2 AND status = 'active'
       UNION
       SELECT 1 FROM events WHERE organizer_id = $1 AND event_id = $2`,
      [userId, eventId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Check if option belongs to this poll
    const optionCheck = await pool.query(
      'SELECT option_id FROM polloptions WHERE option_id = $1 AND poll_id = $2',
      [optionId, pollId]
    );

    if (optionCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid option for this poll' });
    }

    // Check if user already voted
    const existingVote = await pool.query(
      'SELECT vote_id FROM votes WHERE option_id = $1 AND user_id = $2',
      [optionId, userId]
    );

    if (existingVote.rows.length > 0) {
      return res.status(400).json({ error: 'You have already voted on this poll' });
    }

    // Record the vote
    await pool.query(
      'INSERT INTO votes (option_id, user_id) VALUES ($1, $2)',
      [optionId, userId]
    );

    // Emit real-time poll update
    const io = req.app.get('io');
    if (io) {
      emitPollUpdate(io, eventId, { pollId, optionId, userId });
    }

    res.json({ message: 'Vote recorded successfully' });
  } catch (error) {
    console.error('Vote poll error:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
};

// Close/activate poll (organizer only)
const togglePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const userId = req.user.userId;

    // Check if user is organizer of the event containing this poll
    const pollCheck = await pool.query(
      `SELECT p.*, e.organizer_id 
       FROM polls p
       JOIN events e ON p.event_id = e.event_id
       WHERE p.poll_id = $1`,
      [pollId]
    );

    if (pollCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (pollCheck.rows[0].organizer_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only event organizers can manage polls' });
    }

    const newStatus = !pollCheck.rows[0].is_active;

    await pool.query(
      'UPDATE polls SET is_active = $1 WHERE poll_id = $2',
      [newStatus, pollId]
    );

    res.json({ 
      message: `Poll ${newStatus ? 'activated' : 'closed'} successfully`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('Toggle poll error:', error);
    res.status(500).json({ error: 'Failed to update poll status' });
  }
};

// Get poll results
const getPollResults = async (req, res) => {
  try {
    const { pollId } = req.params;

    const result = await pool.query(
      `SELECT p.question, p.is_active,
              po.option_text, COALESCE(v.vote_count, 0) as vote_count,
              (SELECT COUNT(*) FROM votes vt 
               JOIN polloptions pot ON vt.option_id = pot.option_id 
               WHERE pot.poll_id = p.poll_id) as total_votes
       FROM polls p
       JOIN polloptions po ON p.poll_id = po.poll_id
       LEFT JOIN (
         SELECT option_id, COUNT(*) as vote_count
         FROM votes
         GROUP BY option_id
       ) v ON po.option_id = v.option_id
       WHERE p.poll_id = $1
       ORDER BY COALESCE(v.vote_count, 0) DESC`,
      [pollId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const totalVotes = result.rows[0].total_votes;
    const pollData = {
      question: result.rows[0].question,
      is_active: result.rows[0].is_active,
      total_votes: totalVotes,
      options: result.rows.map(row => ({
        option_text: row.option_text,
        vote_count: row.vote_count,
        percentage: totalVotes > 0 ? Math.round((row.vote_count / totalVotes) * 100) : 0
      }))
    };

    res.json(pollData);
  } catch (error) {
    console.error('Get poll results error:', error);
    res.status(500).json({ error: 'Failed to fetch poll results' });
  }
};

module.exports = {
  getEventPolls,
  createPoll,
  votePoll,
  togglePoll,
  getPollResults
};