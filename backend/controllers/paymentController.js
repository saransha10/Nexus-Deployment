const pool = require('../config/database');

// Create payment record (Step 1 of payment flow)
const createPayment = async (req, res) => {
  try {
    const { ticket_id, gateway, amount } = req.body;

    if (!ticket_id || !gateway || amount === undefined) {
      return res.status(400).json({ error: 'ticket_id, gateway, and amount are required' });
    }

    // Validate gateway
    const validGateways = ['khalti', 'esewa', 'free'];
    if (!validGateways.includes(gateway)) {
      return res.status(400).json({ error: 'Invalid payment gateway' });
    }

    // Create payment record
    const result = await pool.query(
      `INSERT INTO payments (ticket_id, gateway, amount, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [ticket_id, gateway, amount]
    );

    res.status(201).json({
      message: 'Payment record created',
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment record' });
  }
};

// Complete payment (Step 2 of payment flow)
const completePayment = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { transaction_id, gateway_response } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ error: 'transaction_id is required' });
    }

    // Update payment record
    const paymentResult = await pool.query(
      `UPDATE payments 
       SET status = 'completed', 
           transaction_id = $1, 
           gateway_response = $2,
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE payment_id = $3
       RETURNING *`,
      [transaction_id, JSON.stringify(gateway_response), payment_id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const payment = paymentResult.rows[0];

    // Update corresponding ticket
    await pool.query(
      `UPDATE tickets 
       SET payment_status = 'completed',
           payment_token = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE ticket_id = $2`,
      [transaction_id, payment.ticket_id]
    );

    res.json({
      message: 'Payment completed successfully',
      payment
    });
  } catch (error) {
    console.error('Complete payment error:', error);
    res.status(500).json({ error: 'Failed to complete payment' });
  }
};

// Fail payment (Handle payment failures)
const failPayment = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { failure_reason, gateway_response } = req.body;

    // Update payment record
    const paymentResult = await pool.query(
      `UPDATE payments 
       SET status = 'failed', 
           failure_reason = $1,
           gateway_response = $2,
           retry_count = retry_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE payment_id = $3
       RETURNING *`,
      [failure_reason, JSON.stringify(gateway_response), payment_id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const payment = paymentResult.rows[0];

    // Update corresponding ticket
    await pool.query(
      `UPDATE tickets 
       SET payment_status = 'failed',
           updated_at = CURRENT_TIMESTAMP
       WHERE ticket_id = $1`,
      [payment.ticket_id]
    );

    res.json({
      message: 'Payment failure recorded',
      payment
    });
  } catch (error) {
    console.error('Fail payment error:', error);
    res.status(500).json({ error: 'Failed to record payment failure' });
  }
};

// Get payment history for a user
const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT 
         p.*,
         t.ticket_id,
         t.ticket_type,
         e.title as event_title,
         e.start_time as event_date
       FROM payments p
       JOIN tickets t ON p.ticket_id = t.ticket_id
       JOIN events e ON t.event_id = e.event_id
       WHERE t.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json({
      payments: result.rows
    });
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};

// Get payment analytics for an event (organizer only)
const getEventPaymentAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    // Check if user is the organizer
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_id !== userId) {
      return res.status(403).json({ error: 'Access denied. Only event organizers can view payment analytics.' });
    }

    // Get payment summary using the database function
    const summaryResult = await pool.query(
      'SELECT * FROM get_event_payment_summary($1)',
      [eventId]
    );

    // Get detailed payment breakdown
    const detailsResult = await pool.query(
      `SELECT 
         p.gateway,
         p.status,
         COUNT(*) as count,
         SUM(p.amount) as total_amount,
         AVG(p.amount) as avg_amount
       FROM payments p
       JOIN tickets t ON p.ticket_id = t.ticket_id
       WHERE t.event_id = $1
       GROUP BY p.gateway, p.status
       ORDER BY p.gateway, p.status`,
      [eventId]
    );

    // Get recent failed payments
    const failedResult = await pool.query(
      `SELECT 
         p.payment_id,
         p.gateway,
         p.amount,
         p.failure_reason,
         p.retry_count,
         p.created_at,
         u.email as user_email
       FROM payments p
       JOIN tickets t ON p.ticket_id = t.ticket_id
       JOIN users u ON t.user_id = u.user_id
       WHERE t.event_id = $1 AND p.status = 'failed'
       ORDER BY p.created_at DESC
       LIMIT 10`,
      [eventId]
    );

    // Get payment timeline (last 30 days)
    const timelineResult = await pool.query(
      `SELECT 
         DATE(p.created_at) as date,
         p.gateway,
         COUNT(*) as transactions,
         SUM(p.amount) as revenue
       FROM payments p
       JOIN tickets t ON p.ticket_id = t.ticket_id
       WHERE t.event_id = $1 
         AND p.status = 'completed'
         AND p.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(p.created_at), p.gateway
       ORDER BY date DESC`,
      [eventId]
    );

    res.json({
      summary: summaryResult.rows,
      details: detailsResult.rows,
      recent_failures: failedResult.rows,
      timeline: timelineResult.rows
    });
  } catch (error) {
    console.error('Get event payment analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch payment analytics' });
  }
};

// Get failed payments (admin/support function)
const getFailedPayments = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT * FROM failed_payments
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM payments WHERE status = \'failed\''
    );

    res.json({
      failed_payments: result.rows,
      total_count: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get failed payments error:', error);
    res.status(500).json({ error: 'Failed to fetch failed payments' });
  }
};

module.exports = {
  createPayment,
  completePayment,
  failPayment,
  getUserPayments,
  getEventPaymentAnalytics,
  getFailedPayments
};