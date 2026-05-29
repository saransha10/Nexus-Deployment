const pool = require('../config/database');
const { sendEmail } = require('../utils/email');
const { generateJitsiCredentials } = require('../utils/jitsiRoom');

// ============================================
// ADMIN DASHBOARD
// ============================================

// Get admin dashboard overview
const getAdminDashboard = async (req, res) => {
  try {
    // Platform statistics
    const stats = await pool.query('SELECT * FROM admin_platform_stats');
    
    // User growth (last 30 days)
    const userGrowth = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Revenue trends (last 30 days)
    const revenueTrends = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as tickets_sold,
        COALESCE(SUM(CAST(price AS DECIMAL)), 0) as revenue
      FROM tickets
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Recent activity
    const recentActivity = await pool.query(`
      SELECT * FROM recent_activity_feed
      LIMIT 20
    `);

    // Pending approvals
    const pendingEvents = await pool.query(`
      SELECT COUNT(*) as count FROM events WHERE approval_status = 'pending'
    `);

    const pendingReports = await pool.query(`
      SELECT COUNT(*) as count FROM user_reports WHERE status = 'pending'
    `);

    // System health
    const systemHealth = {
      database: 'healthy',
      lastBackup: null, // TODO: Implement backup tracking
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };

    res.json({
      stats: stats.rows[0],
      userGrowth: userGrowth.rows,
      revenueTrends: revenueTrends.rows,
      recentActivity: recentActivity.rows,
      pendingApprovals: {
        events: pendingEvents.rows[0].count,
        reports: pendingReports.rows[0].count
      },
      systemHealth
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// ============================================
// EVENT APPROVAL SYSTEM
// ============================================

// Get all events with filters (admin overview)
const getAllEventsAdmin = async (req, res) => {
  try {
    const { status, type, search, organizer_id, page = 1, limit = 20, sort_by = 'created_at', sort_order = 'DESC' } = req.query;

    let query = `
      SELECT e.*, u.name as organizer_name, u.email as organizer_email,
             u.phone as organizer_phone, u.is_verified as organizer_verified,
             u.account_status as organizer_status,
             COUNT(DISTINCT t.ticket_id) as tickets_sold,
             COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.ticket_id END) as active_tickets,
             COALESCE(SUM(CAST(t.price AS DECIMAL)), 0) as revenue,
             COUNT(DISTINCT q.question_id) as questions_count,
             COUNT(DISTINCT p.poll_id) as polls_count
      FROM events e
      JOIN users u ON e.organizer_id = u.user_id
      LEFT JOIN tickets t ON e.event_id = t.event_id AND t.status != 'cancelled'
      LEFT JOIN questions q ON e.event_id = q.event_id
      LEFT JOIN polls p ON e.event_id = p.event_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) { query += ` AND e.approval_status = $${paramCount++}`; params.push(status); }
    if (type)   { query += ` AND e.type = $${paramCount++}`; params.push(type); }
    if (organizer_id) { query += ` AND e.organizer_id = $${paramCount++}`; params.push(organizer_id); }
    if (search) { query += ` AND (e.title ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`; params.push(`%${search}%`); paramCount++; }

    query += ` GROUP BY e.event_id, u.user_id, u.name, u.email, u.phone, u.is_verified, u.account_status`;
    query += ` ORDER BY e.${sort_by} ${sort_order}`;

    const limitValue = parseInt(limit);
    const offsetValue = (parseInt(page) - 1) * limitValue;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM events e WHERE 1=1';
    const countParams = [];
    let cp = 1;
    if (status) { countQuery += ` AND e.approval_status = $${cp++}`; countParams.push(status); }
    if (type)   { countQuery += ` AND e.type = $${cp++}`; countParams.push(type); }
    if (organizer_id) { countQuery += ` AND e.organizer_id = $${cp++}`; countParams.push(organizer_id); }
    if (search) { countQuery += ` AND (e.title ILIKE $${cp} OR e.description ILIKE $${cp})`; countParams.push(`%${search}%`); }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      events: result.rows,
      pagination: { page: parseInt(page), limit: limitValue, total: parseInt(countResult.rows[0].count), totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limitValue) }
    });
  } catch (error) {
    console.error('Get all events admin error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Get comprehensive event details for admin
const getEventDetailsAdmin = async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventResult = await pool.query(`
      SELECT e.*, u.name as organizer_name, u.email as organizer_email,
             u.phone as organizer_phone, u.company as organizer_company,
             u.job_title as organizer_job_title, u.website as organizer_website,
             u.is_verified as organizer_verified, u.account_status as organizer_status,
             approver.name as approved_by_name
      FROM events e
      JOIN users u ON e.organizer_id = u.user_id
      LEFT JOIN users approver ON e.approved_by = approver.user_id
      WHERE e.event_id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const event = eventResult.rows[0];

    const organizerStats = await pool.query(`
      SELECT COUNT(DISTINCT e.event_id) as total_events,
             COUNT(DISTINCT CASE WHEN e.approval_status = 'approved' THEN e.event_id END) as approved_events,
             COUNT(DISTINCT CASE WHEN e.approval_status = 'rejected' THEN e.event_id END) as rejected_events,
             COUNT(DISTINCT CASE WHEN e.approval_status = 'pending'  THEN e.event_id END) as pending_events,
             COUNT(DISTINCT t.ticket_id) as total_tickets_sold,
             COALESCE(SUM(CAST(t.price AS DECIMAL)), 0) as total_revenue
      FROM events e
      LEFT JOIN tickets t ON e.event_id = t.event_id AND t.status != 'cancelled'
      WHERE e.organizer_id = $1
    `, [event.organizer_id]);

    const ticketStats = await pool.query(`
      SELECT COUNT(*) as total_tickets,
             COUNT(CASE WHEN status = 'active'    THEN 1 END) as active_tickets,
             COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_tickets,
             COUNT(CASE WHEN status = 'used'      THEN 1 END) as used_tickets,
             COALESCE(SUM(CAST(price AS DECIMAL)), 0) as total_revenue,
             COALESCE(AVG(CAST(price AS DECIMAL)), 0) as avg_ticket_price,
             COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as paid_tickets,
             COUNT(CASE WHEN payment_status = 'free'      THEN 1 END) as free_tickets
      FROM tickets WHERE event_id = $1
    `, [eventId]);

    const paymentBreakdown = await pool.query(`
      SELECT 
        COALESCE(t.payment_gateway, 'unknown') as gateway,
        COUNT(*) as transaction_count,
        COALESCE(SUM(CAST(t.price AS DECIMAL)), 0) as total_amount,
        COUNT(CASE WHEN t.payment_status = 'completed' THEN 1 END) as successful,
        COUNT(CASE WHEN t.payment_status = 'free'      THEN 1 END) as free_tickets,
        COUNT(CASE WHEN t.payment_status = 'failed'    THEN 1 END) as failed,
        COUNT(CASE WHEN t.payment_status = 'pending'   THEN 1 END) as pending
      FROM tickets t
      WHERE t.event_id = $1 AND t.status != 'cancelled'
      GROUP BY t.payment_gateway
      ORDER BY transaction_count DESC
    `, [eventId]);

    const attendees = await pool.query(`
      SELECT u.user_id, u.name, u.email, u.phone,
             t.ticket_id, t.status as ticket_status, t.payment_status,
             t.price, t.scan_count, t.last_scanned_at, t.created_at as purchased_at
      FROM tickets t
      JOIN users u ON t.user_id = u.user_id
      WHERE t.event_id = $1
      ORDER BY t.created_at DESC LIMIT 50
    `, [eventId]);

    const engagement = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM questions WHERE event_id = $1) as total_questions,
        (SELECT COUNT(*) FROM questions WHERE event_id = $1 AND is_answered = true) as answered_questions,
        (SELECT COUNT(*) FROM polls WHERE event_id = $1) as total_polls,
        (SELECT COUNT(*) FROM messages WHERE event_id = $1) as total_messages,
        (SELECT COUNT(DISTINCT user_id) FROM messages WHERE event_id = $1) as unique_chatters
    `, [eventId]);

    const recentQuestions = await pool.query(`
      SELECT q.*, u.name as user_name, answerer.name as answered_by_name
      FROM questions q
      JOIN users u ON q.user_id = u.user_id
      LEFT JOIN users answerer ON q.answered_by = answerer.user_id
      WHERE q.event_id = $1 ORDER BY q.created_at DESC LIMIT 20
    `, [eventId]);

    let polls = { rows: [] };
    try {
      polls = await pool.query(`
        SELECT p.*, creator.name as created_by_name
        FROM polls p LEFT JOIN users creator ON p.created_by = creator.user_id
        WHERE p.event_id = $1 ORDER BY p.created_at DESC
      `, [eventId]);
    } catch (e) { console.error('Polls query error:', e); }

    res.json({
      event,
      organizerStats: organizerStats.rows[0],
      ticketStats: ticketStats.rows[0],
      paymentBreakdown: paymentBreakdown.rows,
      attendees: { list: attendees.rows, total: parseInt(ticketStats.rows[0].total_tickets) || 0, showing: attendees.rows.length },
      engagement: engagement.rows[0],
      recentQuestions: recentQuestions.rows,
      polls: polls.rows
    });
  } catch (error) {
    console.error('Get event details admin error:', error);
    res.status(500).json({ error: 'Failed to fetch event details', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};
// Get pending events for approval
const getPendingEvents = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const result = await pool.query(`
      SELECT 
        e.*,
        u.name as organizer_name,
        u.email as organizer_email,
        u.is_verified as organizer_verified,
        COUNT(DISTINCT t.ticket_id) as tickets_sold,
        COALESCE(SUM(CAST(t.price AS DECIMAL)), 0) as revenue
      FROM events e
      JOIN users u ON e.organizer_id = u.user_id
      LEFT JOIN tickets t ON e.event_id = t.event_id AND t.status != 'cancelled'
      WHERE e.approval_status = $1
      GROUP BY e.event_id, u.user_id, u.name, u.email, u.is_verified
      ORDER BY e.created_at DESC
    `, [status]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending events error:', error);
    res.status(500).json({ error: 'Failed to fetch pending events' });
  }
};

// Approve event
const approveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const adminId = req.user.userId;

    // Get event details
    const eventCheck = await pool.query(
      'SELECT e.*, u.email as organizer_email, u.name as organizer_name FROM events e JOIN users u ON e.organizer_id = u.user_id WHERE e.event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];

    // Generate Jitsi credentials only if organizer chose Jitsi
    let jitsiRoom = null;
    let jitsiPassword = null;
    
    if (event.meeting_type === 'jitsi') {
      const credentials = generateJitsiCredentials(eventId);
      jitsiRoom = credentials.roomName;
      jitsiPassword = credentials.password;
    }

    // Update event status and add Jitsi credentials (if applicable)
    await pool.query(`
      UPDATE events 
      SET approval_status = 'approved',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          jitsi_room = $3,
          jitsi_password = $4
      WHERE event_id = $2
    `, [adminId, eventId, jitsiRoom, jitsiPassword]);

    // Log admin action
    await pool.query(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES ($1, 'approve_event', 'event', $2, $3)
    `, [adminId, eventId, JSON.stringify({ event_title: event.title })]);

    // Send email to organizer
    try {
      await sendEmail(
        event.organizer_email,
        'Event Approved - NEXUS Events',
        `
          <h2>Your Event Has Been Approved!</h2>
          <p>Hello ${event.organizer_name},</p>
          <p>Great news! Your event "<strong>${event.title}</strong>" has been approved and is now live on the platform.</p>
          <p>Users can now discover and register for your event.</p>
          <p><a href="${process.env.FRONTEND_URL}/events/${eventId}">View Your Event</a></p>
          <p>Best regards,<br/>NEXUS Events Team</p>
        `
      );
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    res.json({ message: 'Event approved successfully' });
  } catch (error) {
    console.error('Approve event error:', error);
    res.status(500).json({ error: 'Failed to approve event' });
  }
};

// Reject event
const rejectEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get event details
    const eventCheck = await pool.query(
      'SELECT e.*, u.email as organizer_email, u.name as organizer_name FROM events e JOIN users u ON e.organizer_id = u.user_id WHERE e.event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];

    // Update event status
    await pool.query(`
      UPDATE events 
      SET approval_status = 'rejected',
          rejection_reason = $1,
          approved_by = $2,
          approved_at = CURRENT_TIMESTAMP
      WHERE event_id = $3
    `, [reason, adminId, eventId]);

    // Log admin action
    await pool.query(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES ($1, 'reject_event', 'event', $2, $3)
    `, [adminId, eventId, JSON.stringify({ event_title: event.title, reason })]);

    // Send email to organizer
    try {
      await sendEmail(
        event.organizer_email,
        'Event Rejected - NEXUS Events',
        `
          <h2>Event Submission Update</h2>
          <p>Hello ${event.organizer_name},</p>
          <p>Unfortunately, your event "<strong>${event.title}</strong>" has not been approved at this time.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>You can edit your event and resubmit it for approval.</p>
          <p><a href="${process.env.FRONTEND_URL}/my-events">Manage Your Events</a></p>
          <p>If you have questions, please contact our support team.</p>
          <p>Best regards,<br/>NEXUS Events Team</p>
        `
      );
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json({ message: 'Event rejected successfully' });
  } catch (error) {
    console.error('Reject event error:', error);
    res.status(500).json({ error: 'Failed to reject event' });
  }
};

// ============================================
// USER MANAGEMENT
// ============================================

// Get all users with filters
const getAllUsers = async (req, res) => {
  try {
    const { 
      role, 
      account_status, 
      search, 
      page = 1, 
      limit = 50,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        u.*,
        COUNT(DISTINCT CASE WHEN u.role = 'organizer' THEN e.event_id END) as events_created,
        COUNT(DISTINCT t.ticket_id) as tickets_purchased,
        COALESCE(SUM(CAST(t.price AS DECIMAL)), 0) as total_spent
      FROM users u
      LEFT JOIN events e ON u.user_id = e.organizer_id
      LEFT JOIN tickets t ON u.user_id = t.user_id AND t.status != 'cancelled'
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (role) {
      query += ` AND u.role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    if (account_status) {
      query += ` AND u.account_status = $${paramCount}`;
      params.push(account_status);
      paramCount++;
    }

    if (search) {
      query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` GROUP BY u.user_id`;
    query += ` ORDER BY u.${sort_by} ${sort_order}`;
    
    // Add pagination parameters
    const limitValue = parseInt(limit);
    const offsetValue = (parseInt(page) - 1) * limitValue;
    
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitValue, offsetValue);

    const result = await pool.query(query, params);

    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    let countParamCount = 1;

    if (role) {
      countQuery += ` AND role = $${countParamCount}`;
      countParams.push(role);
      countParamCount++;
    }

    if (account_status) {
      countQuery += ` AND account_status = $${countParamCount}`;
      countParams.push(account_status);
      countParamCount++;
    }

    if (search) {
      countQuery += ` AND (name ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalUsers = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: limitValue,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limitValue)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user details
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    // User basic info
    const userResult = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // User activity
    const eventsCreated = await pool.query(
      'SELECT COUNT(*) as count FROM events WHERE organizer_id = $1',
      [userId]
    );

    const ticketsPurchased = await pool.query(
      'SELECT COUNT(*) as count FROM tickets WHERE user_id = $1',
      [userId]
    );

    const totalSpent = await pool.query(
      'SELECT COALESCE(SUM(CAST(price AS DECIMAL)), 0) as total FROM tickets WHERE user_id = $1 AND status != \'cancelled\'',
      [userId]
    );

    // Recent tickets
    const recentTickets = await pool.query(`
      SELECT t.*, e.title as event_title, e.start_time
      FROM tickets t
      JOIN events e ON t.event_id = e.event_id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [userId]);

    // Recent events (if organizer)
    let recentEvents = [];
    if (user.role === 'organizer' || user.role === 'admin') {
      const eventsResult = await pool.query(`
        SELECT e.*, COUNT(t.ticket_id) as tickets_sold
        FROM events e
        LEFT JOIN tickets t ON e.event_id = t.event_id AND t.status != 'cancelled'
        WHERE e.organizer_id = $1
        GROUP BY e.event_id
        ORDER BY e.created_at DESC
        LIMIT 10
      `, [userId]);
      recentEvents = eventsResult.rows;
    }

    // Reports filed by user
    const reportsFiled = await pool.query(
      'SELECT COUNT(*) as count FROM user_reports WHERE reporter_id = $1',
      [userId]
    );

    // Reports against user
    const reportsAgainst = await pool.query(
      'SELECT COUNT(*) as count FROM user_reports WHERE reported_user_id = $1',
      [userId]
    );

    res.json({
      user,
      stats: {
        eventsCreated: eventsCreated.rows[0].count,
        ticketsPurchased: ticketsPurchased.rows[0].count,
        totalSpent: totalSpent.rows[0].total,
        reportsFiled: reportsFiled.rows[0].count,
        reportsAgainst: reportsAgainst.rows[0].count
      },
      recentTickets: recentTickets.rows,
      recentEvents: recentEvents
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminId = req.user.userId;

    if (!['admin', 'organizer', 'attendee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Cannot change own role
    if (parseInt(userId) === adminId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    await pool.query('UPDATE users SET role = $1 WHERE user_id = $2', [role, userId]);

    // Log action
    await pool.query(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES ($1, 'update_user_role', 'user', $2, $3)
    `, [adminId, userId, JSON.stringify({ new_role: role })]);

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

// Suspend user
const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, duration_days } = req.body;
    const adminId = req.user.userId;

    if (!reason) {
      return res.status(400).json({ error: 'Suspension reason is required' });
    }

    // Cannot suspend yourself
    if (parseInt(userId) === adminId) {
      return res.status(400).json({ error: 'Cannot suspend yourself' });
    }

    const suspendedUntil = duration_days 
      ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000)
      : null;

    await pool.query(`
      UPDATE users 
      SET account_status = 'suspended',
          suspension_reason = $1,
          suspended_until = $2,
          suspended_by = $3,
          suspended_at = CURRENT_TIMESTAMP
      WHERE user_id = $4
    `, [reason, suspendedUntil, adminId, userId]);

    // Log action
    await pool.query(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES ($1, 'suspend_user', 'user', $2, $3)
    `, [adminId, userId, JSON.stringify({ reason, duration_days })]);

    // Get user email
    const userResult = await pool.query('SELECT email, name FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      try {
        await sendEmail(
          user.email,
          'Account Suspended - NEXUS Events',
          `
            <h2>Account Suspension Notice</h2>
            <p>Hello ${user.name},</p>
            <p>Your account has been suspended.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            ${suspendedUntil ? `<p><strong>Suspension Duration:</strong> Until ${suspendedUntil.toLocaleDateString()}</p>` : '<p><strong>Duration:</strong> Indefinite</p>'}
            <p>If you believe this is a mistake, please contact our support team.</p>
            <p>Best regards,<br/>NEXUS Events Team</p>
          `
        );
      } catch (emailError) {
        console.error('Failed to send suspension email:', emailError);
      }
    }

    res.json({ message: 'User suspended successfully' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
};

// Reactivate user
const reactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.userId;

    await pool.query(`
      UPDATE users 
      SET account_status = 'active',
          suspension_reason = NULL,
          suspended_until = NULL,
          suspended_by = NULL,
          suspended_at = NULL
      WHERE user_id = $1
    `, [userId]);

    // Log action
    await pool.query(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES ($1, 'reactivate_user', 'user', $2, NULL)
    `, [adminId, userId]);

    res.json({ message: 'User reactivated successfully' });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.userId;

    // Cannot delete yourself
    if (parseInt(userId) === adminId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Check if user has active events
    const activeEvents = await pool.query(
      'SELECT COUNT(*) as count FROM events WHERE organizer_id = $1 AND end_time > CURRENT_TIMESTAMP',
      [userId]
    );

    if (parseInt(activeEvents.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with active events. Please cancel or reassign their events first.' 
      });
    }

    // Soft delete by setting account status to banned
    await pool.query(`
      UPDATE users 
      SET account_status = 'banned',
          suspension_reason = 'Account deleted by admin'
      WHERE user_id = $1
    `, [userId]);

    // Log action
    await pool.query(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES ($1, 'delete_user', 'user', $2, NULL)
    `, [adminId, userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// ============================================
// ORGANIZER MONITORING
// ============================================

// Get organizer performance
const getOrganizerPerformance = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM organizer_performance
      ORDER BY total_revenue DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get organizer performance error:', error);
    res.status(500).json({ error: 'Failed to fetch organizer performance' });
  }
};

// ============================================
// USER REPORTS
// ============================================

// Get all reports
const getAllReports = async (req, res) => {
  try {
    const { status = 'pending', report_type } = req.query;

    let query = `
      SELECT 
        r.*,
        reporter.name as reporter_name,
        reporter.email as reporter_email,
        reported.name as reported_user_name,
        reported.email as reported_user_email
      FROM user_reports r
      JOIN users reporter ON r.reporter_id = reporter.user_id
      LEFT JOIN users reported ON r.reported_user_id = reported.user_id
      WHERE r.status = $1
    `;

    const params = [status];

    if (report_type) {
      query += ' AND r.report_type = $2';
      params.push(report_type);
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Resolve report
const resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { resolution_notes, action_taken } = req.body;
    const adminId = req.user.userId;

    await pool.query(`
      UPDATE user_reports 
      SET status = 'resolved',
          reviewed_by = $1,
          reviewed_at = CURRENT_TIMESTAMP,
          resolution_notes = $2
      WHERE report_id = $3
    `, [adminId, resolution_notes, reportId]);

    // Log action
    await pool.query(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES ($1, 'resolve_report', 'report', $2, $3)
    `, [adminId, reportId, JSON.stringify({ action_taken, resolution_notes })]);

    res.json({ message: 'Report resolved successfully' });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
};

// ============================================
// SYSTEM SETTINGS
// ============================================

// Get system settings
const getSystemSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings ORDER BY setting_key');
    res.json(result.rows);
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
};

// Update system setting
const updateSystemSetting = async (req, res) => {
  try {
    const { settingKey } = req.params;
    const { setting_value } = req.body;
    const adminId = req.user.userId;

    await pool.query(`
      UPDATE system_settings 
      SET setting_value = $1,
          updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE setting_key = $3
    `, [setting_value, adminId, settingKey]);

    // Log action
    await pool.query(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES ($1, 'update_setting', 'setting', 0, $2)
    `, [adminId, JSON.stringify({ setting_key: settingKey, new_value: setting_value })]);

    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Update system setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

// ============================================
// AUDIT LOGS
// ============================================

// Get audit logs
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, admin_id, action } = req.query;

    let query = `
      SELECT 
        l.*,
        u.name as admin_name,
        u.email as admin_email
      FROM admin_audit_logs l
      JOIN users u ON l.admin_id = u.user_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (admin_id) {
      query += ` AND l.admin_id = $${paramCount}`;
      params.push(admin_id);
      paramCount++;
    }

    if (action) {
      query += ` AND l.action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    query += ` ORDER BY l.created_at DESC`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM admin_audit_logs');
    const totalLogs = parseInt(countResult.rows[0].count);

    res.json({
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalLogs,
        totalPages: Math.ceil(totalLogs / limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// Manually verify a user's email
const verifyUserEmail = async (req, res) => {
  try {
    const { userId } = req.params;

    // Update user to verified
    const result = await pool.query(
      `UPDATE users 
       SET email_verified = true, 
           verification_token = NULL, 
           verification_token_expiry = NULL 
       WHERE user_id = $1 
       RETURNING user_id, name, email, email_verified`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      message: 'User email verified successfully',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified
      }
    });
  } catch (error) {
    console.error('Verify user email error:', error);
    res.status(500).json({ error: 'Failed to verify user email' });
  }
};

// Get unverified users
const getUnverifiedUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, created_at, 
              verification_token_expiry,
              CASE 
                WHEN verification_token_expiry < NOW() THEN true 
                ELSE false 
              END as token_expired
       FROM users 
       WHERE email_verified = false 
       ORDER BY created_at DESC`
    );

    res.json({
      unverifiedUsers: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get unverified users error:', error);
    res.status(500).json({ error: 'Failed to fetch unverified users' });
  }
};

module.exports = {
  getAdminDashboard,
  getAllEventsAdmin,
  getPendingEvents,
  getEventDetailsAdmin,
  approveEvent,
  rejectEvent,
  getAllUsers, getUserDetails, updateUserRole, suspendUser, reactivateUser, deleteUser, verifyUserEmail, getUnverifiedUsers,
  getOrganizerPerformance,
  getAllReports, resolveReport,
  getSystemSettings, updateSystemSetting,
  getAuditLogs
};
