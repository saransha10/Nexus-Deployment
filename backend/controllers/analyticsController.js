const pool = require('../config/database');

// Get event analytics overview
const getEventAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user is organizer or admin
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view analytics' });
    }

    // Get ticket statistics - Fixed for multi-day events + unique users tracking
    const ticketStats = await pool.query(
      `SELECT 
        COUNT(*) as total_tickets,
        COUNT(DISTINCT user_id) as unique_attendees,
        COUNT(CASE WHEN status = 'active' OR status = 'used' THEN 1 END) as active_tickets,
        COUNT(CASE WHEN scan_count > 0 OR last_scanned_at IS NOT NULL THEN 1 END) as checked_in,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COALESCE(SUM(CAST(price AS DECIMAL)), 0) as total_revenue,
        COALESCE(SUM(scan_count), 0) as total_scans,
        ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT user_id), 0), 2) as avg_tickets_per_user
       FROM tickets
       WHERE event_id = $1`,
      [eventId]
    );

    // Get ticket sales by type
    const ticketsByType = await pool.query(
      `SELECT 
        t.ticket_type,
        COUNT(*) as count,
        COALESCE(SUM(CAST(t.price AS DECIMAL)), 0) as revenue
       FROM tickets t
       WHERE t.event_id = $1 AND t.status != 'cancelled'
       GROUP BY t.ticket_type
       ORDER BY count DESC`,
      [eventId]
    );

    // Get registration timeline (last 30 days)
    const registrationTimeline = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as registrations
       FROM tickets
       WHERE event_id = $1 AND status != 'cancelled'
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`,
      [eventId]
    );

    // Get engagement statistics - Enhanced with engagement rate
    const engagementStats = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM messages WHERE event_id = $1) as total_messages,
        (SELECT COUNT(DISTINCT user_id) FROM messages WHERE event_id = $1) as unique_chatters,
        (SELECT COUNT(*) FROM polls WHERE event_id = $1) as total_polls,
        (SELECT COUNT(*) FROM votes v 
         JOIN polloptions po ON v.option_id = po.option_id 
         JOIN polls p ON po.poll_id = p.poll_id 
         WHERE p.event_id = $1) as total_votes,
        (SELECT COUNT(DISTINCT v.user_id) FROM votes v
         JOIN polloptions po ON v.option_id = po.option_id
         JOIN polls p ON po.poll_id = p.poll_id
         WHERE p.event_id = $1) as unique_voters,
        (SELECT COUNT(*) FROM questions WHERE event_id = $1) as total_questions,
        (SELECT COUNT(*) FROM questions WHERE event_id = $1 AND is_answered = true) as answered_questions,
        (SELECT COUNT(DISTINCT user_id) FROM questions WHERE event_id = $1) as unique_askers,
        (SELECT COUNT(DISTINCT user_id) FROM (
          SELECT user_id FROM messages WHERE event_id = $1
          UNION
          SELECT v.user_id FROM votes v
          JOIN polloptions po ON v.option_id = po.option_id
          JOIN polls p ON po.poll_id = p.poll_id
          WHERE p.event_id = $1
          UNION
          SELECT user_id FROM questions WHERE event_id = $1
        ) as engaged_users) as unique_engaged_users`,
      [eventId]
    );

    // Get top attendees by engagement
    const topAttendees = await pool.query(
      `SELECT 
        u.name,
        u.email,
        COUNT(DISTINCT m.message_id) as messages_sent,
        COUNT(DISTINCT q.question_id) as questions_asked
       FROM users u
       LEFT JOIN messages m ON u.user_id = m.user_id AND m.event_id = $1
       LEFT JOIN questions q ON u.user_id = q.user_id AND q.event_id = $1
       WHERE u.user_id IN (SELECT user_id FROM tickets WHERE event_id = $1)
       GROUP BY u.user_id, u.name, u.email
       HAVING COUNT(DISTINCT m.message_id) > 0 OR COUNT(DISTINCT q.question_id) > 0
       ORDER BY (COUNT(DISTINCT m.message_id) + COUNT(DISTINCT q.question_id)) DESC
       LIMIT 10`,
      [eventId]
    );

    // Get payment methods breakdown
    const paymentMethods = await pool.query(
      `SELECT 
        CASE 
          WHEN payment_gateway = 'khalti' THEN 'khalti'
          WHEN payment_gateway = 'esewa' THEN 'esewa'
          WHEN CAST(price AS DECIMAL) = 0 OR payment_status = 'free' THEN 'free'
          WHEN payment_status = 'completed' THEN 'completed'
          ELSE 'unpaid'
        END as payment_method,
        COUNT(*) as count,
        COALESCE(SUM(CAST(price AS DECIMAL)), 0) as total_revenue
       FROM tickets
       WHERE event_id = $1 AND status != 'cancelled'
       GROUP BY payment_method
       ORDER BY total_revenue DESC`,
      [eventId]
    );

    res.json({
      tickets: ticketStats.rows[0],
      ticketsByType: ticketsByType.rows,
      registrationTimeline: registrationTimeline.rows,
      engagement: engagementStats.rows[0],
      topAttendees: topAttendees.rows,
      paymentMethods: paymentMethods.rows
    });
  } catch (error) {
    console.error('Get event analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Get revenue analytics
const getRevenueAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check authorization
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Revenue summary - New section for overall metrics + unique users
    const revenueSummary = await pool.query(
      `SELECT 
        COUNT(*) as total_tickets,
        COUNT(DISTINCT user_id) as unique_buyers,
        COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as active_tickets,
        COALESCE(SUM(CAST(price AS DECIMAL)), 0) as total_revenue,
        AVG(CAST(price AS DECIMAL)) as avg_ticket_price,
        COUNT(CASE WHEN CAST(price AS DECIMAL) = 0 THEN 1 END) as free_tickets,
        COUNT(CASE WHEN CAST(price AS DECIMAL) > 0 THEN 1 END) as paid_tickets,
        MAX(CAST(price AS DECIMAL)) as highest_ticket_price,
        MIN(CASE WHEN CAST(price AS DECIMAL) > 0 THEN CAST(price AS DECIMAL) END) as lowest_paid_ticket_price,
        ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT user_id), 0), 2) as avg_tickets_per_buyer,
        CASE 
          WHEN SUM(CAST(price AS DECIMAL)) = 0 THEN 'Free Event'
          WHEN COUNT(CASE WHEN CAST(price AS DECIMAL) = 0 THEN 1 END) > 0 THEN 'Mixed (Free & Paid)'
          ELSE 'Paid Event'
        END as event_type
       FROM tickets
       WHERE event_id = $1`,
      [eventId]
    );

    // Revenue by ticket type - Enhanced for free events
    const revenueByType = await pool.query(
      `SELECT 
        ticket_type,
        COUNT(*) as tickets_sold,
        COALESCE(SUM(CAST(price AS DECIMAL)), 0) as revenue,
        AVG(CAST(price AS DECIMAL)) as avg_price,
        COUNT(CASE WHEN CAST(price AS DECIMAL) = 0 THEN 1 END) as free_tickets,
        COUNT(CASE WHEN CAST(price AS DECIMAL) > 0 THEN 1 END) as paid_tickets,
        CASE 
          WHEN SUM(CAST(price AS DECIMAL)) = 0 THEN 'Free'
          ELSE 'Paid'
        END as ticket_category
       FROM tickets
       WHERE event_id = $1 AND status != 'cancelled'
       GROUP BY ticket_type
       ORDER BY revenue DESC, tickets_sold DESC`,
      [eventId]
    );

    // Revenue over time - Enhanced for free events
    const revenueTimeline = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as tickets_sold,
        COALESCE(SUM(CAST(price AS DECIMAL)), 0) as revenue,
        COUNT(CASE WHEN CAST(price AS DECIMAL) = 0 THEN 1 END) as free_tickets,
        COUNT(CASE WHEN CAST(price AS DECIMAL) > 0 THEN 1 END) as paid_tickets
       FROM tickets
       WHERE event_id = $1 AND status != 'cancelled'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [eventId]
    );

    // Payment method breakdown - Enhanced for free events
    const paymentMethods = await pool.query(
      `SELECT 
        CASE 
          WHEN payment_gateway = 'khalti' THEN 'Khalti'
          WHEN payment_gateway = 'esewa' THEN 'eSewa'
          WHEN CAST(price AS DECIMAL) = 0 OR payment_status = 'free' THEN 'Free'
          WHEN payment_status = 'completed' THEN 'Other Payment'
          ELSE 'Unpaid'
        END as payment_method,
        COUNT(*) as count,
        COALESCE(SUM(CAST(price AS DECIMAL)), 0) as total_revenue,
        ROUND(
          (COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM tickets WHERE event_id = $1 AND status != 'cancelled'), 0)) * 100,
          2
        ) as percentage
       FROM tickets
       WHERE event_id = $1 AND status != 'cancelled'
       GROUP BY payment_method
       ORDER BY total_revenue DESC, count DESC`,
      [eventId]
    );

    res.json({
      summary: revenueSummary.rows[0],
      revenueByType: revenueByType.rows,
      revenueTimeline: revenueTimeline.rows,
      paymentMethods: paymentMethods.rows
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
};

// Get attendance analytics
const getAttendanceAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check authorization
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Attendance summary - Fixed for multi-day events + unique users
    const attendanceSummary = await pool.query(
      `SELECT 
        COUNT(*) as total_registered,
        COUNT(DISTINCT user_id) as unique_attendees,
        COUNT(CASE WHEN scan_count > 0 OR last_scanned_at IS NOT NULL THEN 1 END) as checked_in,
        COUNT(DISTINCT CASE WHEN scan_count > 0 OR last_scanned_at IS NOT NULL THEN user_id END) as unique_checked_in,
        COUNT(CASE WHEN (scan_count = 0 OR scan_count IS NULL) AND status = 'active' THEN 1 END) as not_checked_in,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        ROUND(
          (COUNT(CASE WHEN scan_count > 0 OR last_scanned_at IS NOT NULL THEN 1 END)::DECIMAL / 
           NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0)) * 100, 
          2
        ) as attendance_rate,
        ROUND(
          (COUNT(DISTINCT CASE WHEN scan_count > 0 OR last_scanned_at IS NOT NULL THEN user_id END)::DECIMAL / 
           NULLIF(COUNT(DISTINCT user_id), 0)) * 100, 
          2
        ) as unique_attendance_rate,
        COALESCE(SUM(scan_count), 0) as total_scans,
        ROUND(
          COALESCE(SUM(scan_count), 0)::DECIMAL / 
          NULLIF(COUNT(CASE WHEN scan_count > 0 THEN 1 END), 0),
          2
        ) as avg_scans_per_attendee,
        ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT user_id), 0), 2) as avg_tickets_per_user
       FROM tickets
       WHERE event_id = $1`,
      [eventId]
    );

    // Attendance by ticket type - Fixed for multi-day events
    const attendanceByType = await pool.query(
      `SELECT 
        ticket_type,
        COUNT(*) as total,
        COUNT(CASE WHEN scan_count > 0 OR last_scanned_at IS NOT NULL THEN 1 END) as checked_in,
        COUNT(CASE WHEN (scan_count = 0 OR scan_count IS NULL) AND status = 'active' THEN 1 END) as not_checked_in,
        COALESCE(SUM(scan_count), 0) as total_scans
       FROM tickets
       WHERE event_id = $1 AND status != 'cancelled'
       GROUP BY ticket_type
       ORDER BY total DESC`,
      [eventId]
    );

    // Check-in timeline - Fixed to use last_scanned_at for accurate timestamps
    const checkinTimeline = await pool.query(
      `SELECT 
        DATE_TRUNC('hour', last_scanned_at) as hour,
        COUNT(DISTINCT ticket_id) as unique_attendees,
        COUNT(*) as total_scans
       FROM (
         SELECT ticket_id, last_scanned_at
         FROM tickets
         WHERE event_id = $1 AND last_scanned_at IS NOT NULL
       ) as scanned_tickets
       GROUP BY DATE_TRUNC('hour', last_scanned_at)
       ORDER BY hour ASC`,
      [eventId]
    );

    res.json({
      summary: attendanceSummary.rows[0],
      byType: attendanceByType.rows,
      checkinTimeline: checkinTimeline.rows
    });
  } catch (error) {
    console.error('Get attendance analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance analytics' });
  }
};

// Get engagement analytics
const getEngagementAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check authorization
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Chat activity over time
    const chatActivity = await pool.query(
      `SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as messages
       FROM messages
       WHERE event_id = $1
       GROUP BY DATE_TRUNC('hour', created_at)
       ORDER BY hour ASC`,
      [eventId]
    );

    // Poll participation
    const pollParticipation = await pool.query(
      `SELECT 
        p.question,
        p.poll_id,
        COUNT(DISTINCT v.user_id) as participants,
        COUNT(v.vote_id) as total_votes
       FROM polls p
       LEFT JOIN polloptions po ON p.poll_id = po.poll_id
       LEFT JOIN votes v ON po.option_id = v.option_id
       WHERE p.event_id = $1
       GROUP BY p.poll_id, p.question
       ORDER BY participants DESC`,
      [eventId]
    );

    // Q&A statistics
    const qaStats = await pool.query(
      `SELECT 
        COUNT(*) as total_questions,
        COUNT(CASE WHEN is_answered = true THEN 1 END) as answered,
        COUNT(CASE WHEN is_approved = true THEN 1 END) as approved,
        COUNT(DISTINCT user_id) as unique_askers,
        ROUND(
          (COUNT(CASE WHEN is_answered = true THEN 1 END)::DECIMAL / 
           NULLIF(COUNT(*), 0)) * 100, 
          2
        ) as answer_rate
       FROM questions
       WHERE event_id = $1`,
      [eventId]
    );

    // Most active participants
    const activeParticipants = await pool.query(
      `SELECT 
        u.name,
        COUNT(DISTINCT m.message_id) as messages,
        COUNT(DISTINCT v.vote_id) as votes,
        COUNT(DISTINCT q.question_id) as questions
       FROM users u
       LEFT JOIN messages m ON u.user_id = m.user_id AND m.event_id = $1
       LEFT JOIN votes v ON u.user_id = v.user_id
       LEFT JOIN questions q ON u.user_id = q.user_id AND q.event_id = $1
       WHERE u.user_id IN (SELECT user_id FROM tickets WHERE event_id = $1)
       GROUP BY u.user_id, u.name
       HAVING COUNT(DISTINCT m.message_id) + COUNT(DISTINCT v.vote_id) + COUNT(DISTINCT q.question_id) > 0
       ORDER BY (COUNT(DISTINCT m.message_id) + COUNT(DISTINCT v.vote_id) + COUNT(DISTINCT q.question_id)) DESC
       LIMIT 10`,
      [eventId]
    );

    res.json({
      chatActivity: chatActivity.rows,
      pollParticipation: pollParticipation.rows,
      qaStats: qaStats.rows[0],
      activeParticipants: activeParticipants.rows
    });
  } catch (error) {
    console.error('Get engagement analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch engagement analytics' });
  }
};

// Get organizer dashboard analytics (all events)
const getOrganizerAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Total events
    const eventStats = await pool.query(
      `SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN start_time > NOW() THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN end_time < NOW() THEN 1 END) as past_events
       FROM events
       WHERE organizer_id = $1`,
      [userId]
    );

    // Total revenue
    const revenueStats = await pool.query(
      `SELECT 
        COALESCE(SUM(CAST(t.price AS DECIMAL)), 0) as total_revenue,
        COUNT(t.ticket_id) as total_tickets_sold
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE e.organizer_id = $1 AND t.status != 'cancelled'`,
      [userId]
    );

    // Total attendees
    const attendeeStats = await pool.query(
      `SELECT 
        COUNT(DISTINCT t.user_id) as unique_attendees,
        COUNT(t.ticket_id) as total_registrations
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE e.organizer_id = $1 AND t.status != 'cancelled'`,
      [userId]
    );

    // Recent events performance
    const recentEvents = await pool.query(
      `SELECT 
        e.event_id,
        e.title,
        e.start_time,
        COUNT(t.ticket_id) as registrations,
        COALESCE(SUM(CAST(t.price AS DECIMAL)), 0) as revenue
       FROM events e
       LEFT JOIN tickets t ON e.event_id = t.event_id AND t.status != 'cancelled'
       WHERE e.organizer_id = $1
       GROUP BY e.event_id, e.title, e.start_time
       ORDER BY e.start_time DESC
       LIMIT 5`,
      [userId]
    );

    res.json({
      events: eventStats.rows[0],
      revenue: revenueStats.rows[0],
      attendees: attendeeStats.rows[0],
      recentEvents: recentEvents.rows
    });
  } catch (error) {
    console.error('Get organizer analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch organizer analytics' });
  }
};

module.exports = {
  getEventAnalytics,
  getRevenueAnalytics,
  getAttendanceAnalytics,
  getEngagementAnalytics,
  getOrganizerAnalytics
};