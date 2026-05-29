const pool = require('../config/database');
const { generateSecureQRCode, validateSecureQRCode, getQRStatus: getQRStatusUtil } = require('../utils/qrSecurity');
const crypto = require('crypto');
const { sendRegistrationNotifications } = require('./notificationController');

// Register for an event (create ticket)
const registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticket_type_id, payment_data, quantity = 1 } = req.body; // Add quantity parameter
    const userId = req.user.userId;

    // Validate quantity
    if (!quantity || quantity < 1 || quantity > 10) {
      return res.status(400).json({ error: 'Quantity must be between 1 and 10' });
    }

    // Check if event exists
    const eventCheck = await pool.query(
      'SELECT * FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];

    // Prevent organizer from buying tickets to their own event
    if (event.organizer_id === userId) {
      return res.status(403).json({ error: 'Organizers cannot purchase tickets for their own events' });
    }

    // Get ticket type details
    const ticketTypeCheck = await pool.query(
      'SELECT * FROM ticket_types WHERE ticket_type_id = $1 AND event_id = $2',
      [ticket_type_id, eventId]
    );

    if (ticketTypeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket type not found for this event' });
    }

    const ticketType = ticketTypeCheck.rows[0];

    // Calculate total price for multiple tickets
    const totalPrice = parseFloat(ticketType.price) * quantity;

    // Validate payment for paid tickets only
    if (totalPrice > 0) {
      if (!payment_data || (!payment_data.pidx && !payment_data.transaction_id && !payment_data.transaction_uuid)) {
        return res.status(400).json({ error: 'Payment required for this ticket' });
      }
      console.log('Payment received for', quantity, 'tickets:', payment_data);
    } else {
      // Free event - no payment required
      console.log('Free event registration for', quantity, 'tickets');
    }

    // Check ticket type quantity limit
    if (ticketType.quantity_available !== null) {
      const soldCount = await pool.query(
        'SELECT COUNT(*) FROM tickets WHERE ticket_type_id = $1 AND status = $2',
        [ticket_type_id, 'active']
      );
      
      const available = ticketType.quantity_available - parseInt(soldCount.rows[0].count);
      
      if (available < quantity) {
        return res.status(400).json({ 
          error: `Only ${available} ${ticketType.type_name} tickets available. You requested ${quantity}.` 
        });
      }
    }

    // Check max attendees limit
    if (event.max_attendees) {
      const attendeeCount = await pool.query(
        'SELECT COUNT(*) FROM tickets WHERE event_id = $1 AND status = $2',
        [eventId, 'active']
      );
      
      const available = event.max_attendees - parseInt(attendeeCount.rows[0].count);
      
      if (available < quantity) {
        return res.status(400).json({ 
          error: `Only ${available} spots available for this event. You requested ${quantity} tickets.` 
        });
      }
    }

    // Create multiple tickets
    const createdTickets = [];
    const paymentToken = payment_data?.pidx || payment_data?.transaction_id || payment_data?.transaction_uuid || null;
    
    // Determine payment status and gateway
    let paymentStatus = 'pending';
    let paymentGateway = null;
    
    if (parseFloat(ticketType.price) === 0) {
      paymentStatus = 'free'; // Free tickets
      paymentGateway = 'free';
    } else if (payment_data) {
      if (payment_data.pidx) {
        paymentStatus = 'completed';
        paymentGateway = 'khalti';
      } else if (payment_data.transaction_uuid) {
        paymentStatus = 'completed';
        paymentGateway = 'esewa';
      } else if (payment_data.transaction_id) {
        paymentStatus = 'completed';
        paymentGateway = 'khalti'; // Khalti also uses transaction_id
      }
    }

    // Create tickets in a transaction
    await pool.query('BEGIN');
    
    try {
      for (let i = 0; i < quantity; i++) {
        // Generate secure JWT-based QR code
        const ticketData = {
          ticketId: null, // Will be set after ticket creation
          eventId: parseInt(eventId),
          userId: userId
        };
        
        const tempQrCode = `TEMP-${Date.now()}-${i}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

        // Create individual ticket
        const result = await pool.query(
          `INSERT INTO tickets (user_id, event_id, ticket_type_id, qr_code, price, ticket_type, status, payment_token, payment_status, payment_gateway)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [userId, eventId, ticket_type_id, tempQrCode, ticketType.price, ticketType.type_name, 'active', paymentToken, paymentStatus, paymentGateway]
        );

        const ticket = result.rows[0];

        // Generate secure JWT QR code with actual ticket ID
        ticketData.ticketId = ticket.ticket_id;
        const secureQrCode = generateSecureQRCode(ticketData, event.start_time, event.end_time);
        
        // Update ticket with secure QR code
        await pool.query(
          'UPDATE tickets SET qr_code = $1 WHERE ticket_id = $2',
          [secureQrCode, ticket.ticket_id]
        );
        
        ticket.qr_code = secureQrCode;
        createdTickets.push(ticket);
      }

      await pool.query('COMMIT');

      // Send notifications for the first ticket (represents the purchase)
      try {
        console.log('Sending registration notifications for', quantity, 'tickets');
        await sendRegistrationNotifications(userId, eventId, createdTickets[0].ticket_id);
        console.log('Registration notifications sent successfully');
      } catch (notifError) {
        console.error('Notification error:', notifError);
        // Continue even if notifications fail
      }

      res.status(201).json({
        message: `Successfully registered for event with ${quantity} ticket${quantity > 1 ? 's' : ''}`,
        tickets: createdTickets,
        quantity: quantity,
        total_price: totalPrice
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
};

// Get user's tickets
const getUserTickets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query; // Optional filter by status

    let query = `
      SELECT t.*, e.title, e.description, e.type, e.start_time, e.end_time, 
             e.location, e.streaming_url, u.name as organizer_name
      FROM tickets t
      JOIN events e ON t.event_id = e.event_id
      LEFT JOIN users u ON e.organizer_id = u.user_id
      WHERE t.user_id = $1
    `;
    
    const params = [userId];
    
    if (status) {
      query += ' AND t.status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY e.start_time ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

// Get single ticket details
const getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT t.*, e.title, e.description, e.type, e.start_time, e.end_time,
              e.location, e.streaming_url, u.name as organizer_name, u.email as organizer_email
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       LEFT JOIN users u ON e.organizer_id = u.user_id
       WHERE t.ticket_id = $1 AND t.user_id = $2`,
      [ticketId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
};

// Cancel ticket (update status instead of delete)
const cancelTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.userId;

    // Check if ticket exists and belongs to user
    const ticketCheck = await pool.query(
      'SELECT * FROM tickets WHERE ticket_id = $1 AND user_id = $2',
      [ticketId, userId]
    );

    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticketCheck.rows[0].status === 'cancelled') {
      return res.status(400).json({ error: 'Ticket is already cancelled' });
    }

    if (ticketCheck.rows[0].status === 'used') {
      return res.status(400).json({ error: 'Cannot cancel a used ticket' });
    }

    // Update ticket status to cancelled
    await pool.query(
      'UPDATE tickets SET status = $1 WHERE ticket_id = $2',
      ['cancelled', ticketId]
    );

    res.json({ message: 'Ticket cancelled successfully' });
  } catch (error) {
    console.error('Cancel ticket error:', error);
    res.status(500).json({ error: 'Failed to cancel ticket' });
  }
};

// Delete ticket (only after event has ended)
const deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if ticket exists
    const ticketCheck = await pool.query(
      `SELECT t.*, e.end_time, e.title as event_title
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE t.ticket_id = $1`,
      [ticketId]
    );

    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketCheck.rows[0];

    // Check authorization - user must own the ticket or be admin
    if (ticket.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this ticket' });
    }

    // Check if event has ended
    const now = new Date();
    const eventEnd = new Date(ticket.end_time);

    if (now < eventEnd) {
      return res.status(400).json({ 
        error: 'Cannot delete ticket before event ends. Tickets can only be deleted after the event has finished.',
        eventEndTime: ticket.end_time,
        eventTitle: ticket.event_title
      });
    }

    // Delete the ticket
    await pool.query('DELETE FROM tickets WHERE ticket_id = $1', [ticketId]);

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
};

// Check if user is registered for an event
const checkRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT * FROM tickets WHERE event_id = $1 AND user_id = $2 AND status = $3',
      [eventId, userId, 'active']
    );

    res.json({ 
      isRegistered: result.rows.length > 0,
      ticketCount: result.rows.length,
      tickets: result.rows
    });
  } catch (error) {
    console.error('Check registration error:', error);
    res.status(500).json({ error: 'Failed to check registration' });
  }
};

// Get event attendees (for organizers/admins)
const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user is organizer of this event or admin
    const eventCheck = await pool.query(
      'SELECT * FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view attendees' });
    }

    // Get attendees
    const result = await pool.query(
      `SELECT t.ticket_id, t.qr_code, t.price, t.ticket_type, t.status, t.created_at,
              u.user_id, u.name, u.email
       FROM tickets t
       JOIN users u ON t.user_id = u.user_id
       WHERE t.event_id = $1
       ORDER BY t.created_at DESC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get event attendees error:', error);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
};

// Validate QR code (for entry scanning)
const validateQRCode = async (req, res) => {
  try {
    const { qr_code } = req.body;

    if (!qr_code) {
      return res.status(400).json({ error: 'QR code is required' });
    }

    // Try JWT validation first
    const qrValidation = validateSecureQRCode(qr_code);
    
    if (qrValidation.valid) {
      // JWT QR Code - Enhanced validation
      const qrData = qrValidation.data;

      // Get ticket details from database using the ticket ID from JWT
      const result = await pool.query(
        `SELECT t.*, e.title, e.start_time, e.end_time, e.type, e.location,
                u.name as attendee_name, u.email as attendee_email
         FROM tickets t
         JOIN events e ON t.event_id = e.event_id
         JOIN users u ON t.user_id = u.user_id
         WHERE t.ticket_id = $1 AND t.event_id = $2 AND t.user_id = $3`,
        [qrData.ticketId, qrData.eventId, qrData.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          valid: false,
          error: 'Ticket not found or QR code data mismatch' 
        });
      }

      const ticket = result.rows[0];

      // Check if event has started (allow entry 30 minutes before start time)
      const eventStartTime = new Date(ticket.start_time);
      const entryAllowedTime = new Date(eventStartTime.getTime() - 30 * 60 * 1000); // 30 minutes before
      const currentTime = new Date();
      
      if (currentTime < entryAllowedTime) {
        return res.status(400).json({ 
          valid: false,
          error: 'Event entry not yet available. Entry opens 30 minutes before event start time.',
          event_start: eventStartTime.toLocaleString(),
          entry_opens: entryAllowedTime.toLocaleString(),
          ticket: {
            ticket_id: ticket.ticket_id,
            attendee_name: ticket.attendee_name,
            event_title: ticket.title
          }
        });
      }

      // Check if event has ended
      const eventEndTime = new Date(ticket.end_time);
      if (currentTime > eventEndTime) {
        return res.status(400).json({ 
          valid: false,
          error: 'Event has ended. QR code is no longer valid.',
          event_end: eventEndTime.toLocaleString(),
          ticket: {
            ticket_id: ticket.ticket_id,
            attendee_name: ticket.attendee_name,
            event_title: ticket.title
          }
        });
      }

      // Check if ticket is cancelled
      if (ticket.status === 'cancelled') {
        return res.status(400).json({ 
          valid: false,
          error: 'Ticket has been cancelled',
          ticket: {
            ticket_id: ticket.ticket_id,
            status: ticket.status,
            attendee_name: ticket.attendee_name
          }
        });
      }

      // Check if ticket already used (for single-day events)
      if (ticket.status === 'used' && qrData.eventDurationDays <= 1) {
        return res.status(400).json({ 
          valid: false,
          error: 'Ticket already scanned and used',
          ticket: {
            ticket_id: ticket.ticket_id,
            status: ticket.status,
            attendee_name: ticket.attendee_name,
            event_title: ticket.title,
            scan_count: ticket.scan_count || 0
          }
        });
      }

      // For multi-day events, allow re-entry but track scans
      let newStatus = 'used';
      let scanCount = (ticket.scan_count || 0) + 1;
      
      if (qrData.eventDurationDays > 1) {
        // Multi-day events: keep status as 'active' for re-entry
        newStatus = 'active';
      }

      // Update ticket status and scan count
      await pool.query(
        'UPDATE tickets SET status = $1, scan_count = $2, last_scanned_at = NOW() WHERE ticket_id = $3',
        [newStatus, scanCount, ticket.ticket_id]
      );

      return res.json({
        valid: true,
        qr_type: 'jwt',
        message: qrData.eventDurationDays > 1 
          ? `Entry granted - Multi-day event (Scan #${scanCount})`
          : 'Ticket validated successfully - Entry granted',
        ticket: {
          ticket_id: ticket.ticket_id,
          attendee_name: ticket.attendee_name,
          attendee_email: ticket.attendee_email,
          event_title: ticket.title,
          ticket_type: ticket.ticket_type,
          price: ticket.price,
          start_time: ticket.start_time,
          end_time: ticket.end_time,
          scan_count: scanCount,
          allows_reentry: qrData.eventDurationDays > 1,
          event_duration_days: qrData.eventDurationDays
        }
      });
    } else {
      // JWT validation failed, try simple QR code validation
      console.log('JWT validation failed, trying simple QR code:', qrValidation.error);
      
      const result = await pool.query(
        `SELECT t.*, e.title, e.start_time, e.end_time, e.type, e.location,
                u.name as attendee_name, u.email as attendee_email
         FROM tickets t
         JOIN events e ON t.event_id = e.event_id
         JOIN users u ON t.user_id = u.user_id
         WHERE t.qr_code = $1`,
        [qr_code]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          valid: false,
          error: 'Invalid QR code - Ticket not found' 
        });
      }

      const ticket = result.rows[0];

      // Check if event has started (allow entry 30 minutes before start time)
      const eventStartTime = new Date(ticket.start_time);
      const entryAllowedTime = new Date(eventStartTime.getTime() - 30 * 60 * 1000); // 30 minutes before
      const currentTime = new Date();
      
      if (currentTime < entryAllowedTime) {
        return res.status(400).json({ 
          valid: false,
          error: 'Event entry not yet available. Entry opens 30 minutes before event start time.',
          event_start: eventStartTime.toLocaleString(),
          entry_opens: entryAllowedTime.toLocaleString(),
          ticket: {
            ticket_id: ticket.ticket_id,
            attendee_name: ticket.attendee_name,
            event_title: ticket.title
          }
        });
      }

      // Check if event has ended
      const eventEndTime = new Date(ticket.end_time);
      if (currentTime > eventEndTime) {
        return res.status(400).json({ 
          valid: false,
          error: 'Event has ended. QR code is no longer valid.',
          event_end: eventEndTime.toLocaleString(),
          ticket: {
            ticket_id: ticket.ticket_id,
            attendee_name: ticket.attendee_name,
            event_title: ticket.title
          }
        });
      }

      // Check if ticket is cancelled
      if (ticket.status === 'cancelled') {
        return res.status(400).json({ 
          valid: false,
          error: 'Ticket has been cancelled',
          ticket: {
            ticket_id: ticket.ticket_id,
            status: ticket.status,
            attendee_name: ticket.attendee_name
          }
        });
      }

      // Check if ticket already used (simple QR codes are single-use)
      if (ticket.status === 'used') {
        return res.status(400).json({ 
          valid: false,
          error: 'Ticket already scanned and used',
          ticket: {
            ticket_id: ticket.ticket_id,
            status: ticket.status,
            attendee_name: ticket.attendee_name,
            event_title: ticket.title
          }
        });
      }

      // Mark simple QR ticket as used
      await pool.query(
        'UPDATE tickets SET status = $1, scan_count = COALESCE(scan_count, 0) + 1, last_scanned_at = NOW() WHERE ticket_id = $2',
        ['used', ticket.ticket_id]
      );

      return res.json({
        valid: true,
        qr_type: 'simple',
        message: 'Ticket validated successfully - Entry granted (Legacy QR)',
        ticket: {
          ticket_id: ticket.ticket_id,
          attendee_name: ticket.attendee_name,
          attendee_email: ticket.attendee_email,
          event_title: ticket.title,
          ticket_type: ticket.ticket_type,
          price: ticket.price,
          start_time: ticket.start_time,
          end_time: ticket.end_time,
          scan_count: (ticket.scan_count || 0) + 1,
          allows_reentry: false,
          event_duration_days: 1
        }
      });
    }
  } catch (error) {
    console.error('Validate QR code error:', error);
    res.status(500).json({ error: 'Failed to validate QR code' });
  }
};

// Check ticket availability before payment
const checkTicketAvailability = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticket_type_id } = req.body;

    // Check if event exists
    const eventCheck = await pool.query(
      'SELECT * FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];

    // Get ticket type details
    const ticketTypeCheck = await pool.query(
      'SELECT * FROM ticket_types WHERE ticket_type_id = $1 AND event_id = $2',
      [ticket_type_id, eventId]
    );

    if (ticketTypeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket type not found for this event' });
    }

    const ticketType = ticketTypeCheck.rows[0];

    // Check ticket type quantity limit
    if (ticketType.quantity_available !== null) {
      const soldCount = await pool.query(
        'SELECT COUNT(*) FROM tickets WHERE ticket_type_id = $1 AND status = $2',
        [ticket_type_id, 'active']
      );
      
      const available = ticketType.quantity_available - parseInt(soldCount.rows[0].count);
      
      if (available <= 0) {
        return res.status(400).json({ 
          available: false,
          error: `${ticketType.type_name} tickets are sold out` 
        });
      }

      return res.json({
        available: true,
        remaining: available,
        ticket_type: ticketType.type_name,
        price: ticketType.price
      });
    }

    // Check max attendees limit
    if (event.max_attendees) {
      const attendeeCount = await pool.query(
        'SELECT COUNT(*) FROM tickets WHERE event_id = $1 AND status = $2',
        [eventId, 'active']
      );
      
      const available = event.max_attendees - parseInt(attendeeCount.rows[0].count);
      
      if (available <= 0) {
        return res.status(400).json({ 
          available: false,
          error: 'Event is full. No more tickets available.' 
        });
      }

      return res.json({
        available: true,
        remaining: available,
        ticket_type: ticketType.type_name,
        price: ticketType.price
      });
    }

    // No limits - always available
    res.json({
      available: true,
      ticket_type: ticketType.type_name,
      price: ticketType.price
    });

  } catch (error) {
    console.error('Check ticket availability error:', error);
    res.status(500).json({ error: 'Failed to check ticket availability' });
  }
};

// Get QR code status and validity info
const getQRStatus = async (req, res) => {
  try {
    const { qr_code } = req.body;

    if (!qr_code) {
      return res.status(400).json({ error: 'QR code is required' });
    }

    // Try JWT validation first
    const qrStatus = getQRStatusUtil(qr_code);
    
    if (qrStatus.status !== 'invalid') {
      // JWT QR Code - Get enhanced status
      try {
        const qrValidation = validateSecureQRCode(qr_code);
        if (qrValidation.valid) {
          const qrData = qrValidation.data;
          
          // Get ticket details
          const result = await pool.query(
            `SELECT t.*, e.title, e.start_time, e.end_time
             FROM tickets t
             JOIN events e ON t.event_id = e.event_id
             WHERE t.ticket_id = $1`,
            [qrData.ticketId]
          );

          if (result.rows.length > 0) {
            const ticket = result.rows[0];
            qrStatus.qr_type = 'jwt';
            qrStatus.ticket = {
              ticket_id: ticket.ticket_id,
              event_title: ticket.title,
              ticket_type: ticket.ticket_type,
              status: ticket.status,
              scan_count: ticket.scan_count || 0
            };
          }
        }
      } catch (error) {
        console.log('Could not fetch JWT ticket details:', error.message);
      }

      return res.json(qrStatus);
    } else {
      // JWT validation failed, try simple QR code
      try {
        const result = await pool.query(
          `SELECT t.*, e.title, e.start_time, e.end_time
           FROM tickets t
           JOIN events e ON t.event_id = e.event_id
           WHERE t.qr_code = $1`,
          [qr_code]
        );

        if (result.rows.length > 0) {
          const ticket = result.rows[0];
          const now = new Date();
          const eventStart = new Date(ticket.start_time);
          const eventEnd = new Date(ticket.end_time);
          
          let status = 'valid';
          let message = 'Simple QR code is valid';
          
          if (ticket.status === 'cancelled') {
            status = 'cancelled';
            message = 'Ticket has been cancelled';
          } else if (ticket.status === 'used') {
            status = 'used';
            message = 'Ticket has already been used';
          } else if (now > eventEnd) {
            status = 'expired';
            message = 'Event has ended';
          } else if (now < eventStart) {
            const hoursUntilEvent = Math.ceil((eventStart - now) / (1000 * 60 * 60));
            if (hoursUntilEvent > 2) {
              status = 'too_early';
              message = `Event starts in ${hoursUntilEvent} hours`;
            } else {
              status = 'active';
              message = 'QR code is ready for entry';
            }
          } else {
            status = 'active';
            message = 'QR code is active for entry';
          }

          return res.json({
            status,
            message,
            qr_type: 'simple',
            eventDuration: 1,
            allowsReEntry: false,
            eventStart: eventStart.toISOString(),
            eventEnd: eventEnd.toISOString(),
            ticket: {
              ticket_id: ticket.ticket_id,
              event_title: ticket.title,
              ticket_type: ticket.ticket_type,
              status: ticket.status,
              scan_count: ticket.scan_count || 0
            }
          });
        } else {
          return res.status(404).json({
            valid: false,
            error: 'QR code not found'
          });
        }
      } catch (error) {
        console.error('Simple QR validation error:', error);
        return res.status(500).json({ error: 'Failed to validate QR code' });
      }
    }
  } catch (error) {
    console.error('Get QR status error:', error);
    res.status(500).json({ error: 'Failed to get QR status' });
  }
};

module.exports = {
  registerForEvent,
  getUserTickets,
  getTicketById,
  cancelTicket,
  deleteTicket,
  checkRegistration,
  getEventAttendees,
  validateQRCode,
  checkTicketAvailability,
  getQRStatus
};
