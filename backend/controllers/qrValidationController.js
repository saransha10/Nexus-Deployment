const pool = require('../config/database');
const { validateSecureQRCode } = require('../utils/qrSecurity');

const validateQRCodeEnhanced = async (req, res) => {
  try {
    const { qr_code } = req.body;
    const scannerUserId = req.user.userId;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    if (!qr_code) {
      return res.status(400).json({ error: 'QR code is required' });
    }

    console.log('Received QR code:', qr_code.substring(0, 50) + '...');
    console.log('QR code length:', qr_code.length);
    console.log('Scanner user ID:', scannerUserId);

    // Try different QR code formats
    let qrValidation;
    let isLegacyFormat = false;

    // Format 1: Check if it's the old simple format (QR-timestamp-hash)
    if (qr_code.startsWith('QR-')) {
      console.log('Detected legacy QR format');
      isLegacyFormat = true;
      
      // For legacy format, look up directly in database
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
        await logScanAttempt(null, scannerUserId, 'not_found', ipAddress, userAgent);
        return res.status(404).json({ 
          valid: false,
          error: 'Ticket not found' 
        });
      }

      const ticket = result.rows[0];

      // Check ticket status and payment status
      if (ticket.status === 'cancelled') {
        await logScanAttempt(ticket.ticket_id, scannerUserId, 'cancelled', ipAddress, userAgent);
        return res.status(400).json({ 
          valid: false,
          error: 'Ticket has been cancelled'
        });
      }

      // Check payment status - ticket must be paid for
      if (ticket.payment_status !== 'completed' && ticket.payment_status !== 'free') {
        await logScanAttempt(ticket.ticket_id, scannerUserId, 'unpaid', ipAddress, userAgent);
        return res.status(400).json({ 
          valid: false,
          error: 'Ticket payment not completed - Entry denied'
        });
      }

      // Validate event timing - prevent scanning before event starts
      const now = Date.now();
      const eventStart = new Date(ticket.start_time).getTime();
      const eventEnd = new Date(ticket.end_time).getTime();
      const eventDurationMs = eventEnd - eventStart;
      const eventDurationDays = Math.ceil(eventDurationMs / (1000 * 60 * 60 * 24));
      const isMultiDayEvent = eventDurationDays > 1;
      
      // Entry window: 2 hours before for single-day, 4 hours before for multi-day
      const entryWindowHours = isMultiDayEvent ? 4 : 2;
      const entryWindowStart = eventStart - (entryWindowHours * 60 * 60 * 1000);
      
      if (now < entryWindowStart) {
        const hoursUntilEntry = Math.ceil((entryWindowStart - now) / (1000 * 60 * 60));
        await logScanAttempt(ticket.ticket_id, scannerUserId, 'too_early', ipAddress, userAgent);
        return res.status(400).json({ 
          valid: false,
          error: `Event entry not yet available. Entry opens ${hoursUntilEntry} hour${hoursUntilEntry > 1 ? 's' : ''} before event start.`,
          event_start: new Date(eventStart).toLocaleString(),
          entry_opens: new Date(entryWindowStart).toLocaleString()
        });
      }
      
      // Check if event has ended
      const gracePeriodHours = isMultiDayEvent ? 24 : 6;
      const eventEndWithGrace = eventEnd + (gracePeriodHours * 60 * 60 * 1000);
      
      if (now > eventEndWithGrace) {
        await logScanAttempt(ticket.ticket_id, scannerUserId, 'event_ended', ipAddress, userAgent);
        return res.status(400).json({ 
          valid: false,
          error: 'Event has ended. QR code is no longer valid.',
          event_end: new Date(eventEnd).toLocaleString()
        });
      }

      // Check if ticket already used (with multi-day support)
      if (ticket.status === 'used') {
        // Multi-day event re-entry logic
        if (isMultiDayEvent) {
          const dailyScanLimit = 5;
          const todayScansResult = await pool.query(
            `SELECT COUNT(*) as today_scans 
             FROM qr_scan_logs 
             WHERE ticket_id = $1 
             AND DATE(scan_timestamp) = CURRENT_DATE 
             AND (scan_result = 'success' OR scan_result = 're_entry')`,
            [ticket.ticket_id]
          );
          
          const todayScans = parseInt(todayScansResult.rows[0]?.today_scans || 0);
          
          if (todayScans >= dailyScanLimit) {
            await logScanAttempt(ticket.ticket_id, scannerUserId, 'daily_limit_exceeded', ipAddress, userAgent);
            return res.status(400).json({ 
              valid: false,
              error: `Daily scan limit reached (${dailyScanLimit} scans per day)`
            });
          }
          
          await logScanAttempt(ticket.ticket_id, scannerUserId, 're_entry', ipAddress, userAgent);
          await pool.query(
            `UPDATE tickets 
             SET scan_count = COALESCE(scan_count, 0) + 1, last_scanned_at = CURRENT_TIMESTAMP 
             WHERE ticket_id = $1`,
            [ticket.ticket_id]
          );
          
          return res.json({
            valid: true,
            message: `Re-entry granted for multi-day event (Day ${Math.min((ticket.scan_count || 0) + 1, eventDurationDays)} of ${eventDurationDays})`,
            reEntry: true,
            isMultiDay: true,
            ticket: {
              ticket_id: ticket.ticket_id,
              attendee_name: ticket.attendee_name,
              attendee_email: ticket.attendee_email,
              event_title: ticket.title,
              ticket_type: ticket.ticket_type,
              price: ticket.price,
              start_time: ticket.start_time,
              end_time: ticket.end_time,
              event_duration_days: eventDurationDays
            }
          });
        } else {
          await logScanAttempt(ticket.ticket_id, scannerUserId, 'already_used', ipAddress, userAgent);
          return res.status(400).json({ 
            valid: false,
            error: 'Ticket already scanned and used'
          });
        }
      }

      // Mark as used (or keep active for multi-day) and return success
      const newStatus = isMultiDayEvent ? 'active' : 'used';
      await pool.query(
        `UPDATE tickets 
         SET status = $1, scan_count = COALESCE(scan_count, 0) + 1, last_scanned_at = CURRENT_TIMESTAMP 
         WHERE ticket_id = $2`,
        [newStatus, ticket.ticket_id]
      );

      await logScanAttempt(ticket.ticket_id, scannerUserId, 'success', ipAddress, userAgent);

      return res.json({
        valid: true,
        message: isMultiDayEvent 
          ? `Entry granted - Multi-day event (Day 1 of ${eventDurationDays})`
          : 'Ticket validated successfully - Entry granted',
        firstEntry: true,
        isMultiDay: isMultiDayEvent,
        ticket: {
          ticket_id: ticket.ticket_id,
          attendee_name: ticket.attendee_name,
          attendee_email: ticket.attendee_email,
          event_title: ticket.title,
          ticket_type: ticket.ticket_type,
          price: ticket.price,
          start_time: ticket.start_time,
          end_time: ticket.end_time,
          event_duration_days: eventDurationDays
        }
      });
    }

    // Format 2: Try JWT format (new secure format)
    console.log('Trying JWT validation...');
    qrValidation = validateSecureQRCode(qr_code);
    console.log('JWT validation result:', qrValidation);
    console.log('QR data:', qrValidation.valid ? qrValidation.data : 'Invalid JWT');
    
    if (!qrValidation.valid) {
      // Format 3: Try base64 JSON format (legacy format)
      try {
        const decodedData = JSON.parse(Buffer.from(qr_code, 'base64').toString());
        console.log('Detected base64 JSON QR format');
        
        // Look up ticket by decoded data
        const result = await pool.query(
          `SELECT t.*, e.title, e.start_time, e.end_time, e.type, e.location,
                  u.name as attendee_name, u.email as attendee_email
           FROM tickets t
           JOIN events e ON t.event_id = e.event_id
           JOIN users u ON t.user_id = u.user_id
           WHERE t.user_id = $1 AND t.event_id = $2`,
          [decodedData.userId, decodedData.eventId]
        );

        if (result.rows.length === 0) {
          await logScanAttempt(null, scannerUserId, 'not_found', ipAddress, userAgent);
          return res.status(404).json({ 
            valid: false,
            error: 'Ticket not found' 
          });
        }

        const ticket = result.rows[0];

        // Check ticket status and payment status (same logic as legacy format)
        if (ticket.status === 'cancelled') {
          await logScanAttempt(ticket.ticket_id, scannerUserId, 'cancelled', ipAddress, userAgent);
          return res.status(400).json({ 
            valid: false,
            error: 'Ticket has been cancelled'
          });
        }

        // Check payment status - ticket must be paid for
        if (ticket.payment_status !== 'completed' && ticket.payment_status !== 'free') {
          await logScanAttempt(ticket.ticket_id, scannerUserId, 'unpaid', ipAddress, userAgent);
          return res.status(400).json({ 
            valid: false,
            error: 'Ticket payment not completed - Entry denied'
          });
        }

        // Validate event timing
        const now = Date.now();
        const eventStart = new Date(ticket.start_time).getTime();
        const eventEnd = new Date(ticket.end_time).getTime();
        const eventDurationMs = eventEnd - eventStart;
        const eventDurationDays = Math.ceil(eventDurationMs / (1000 * 60 * 60 * 24));
        const isMultiDayEvent = eventDurationDays > 1;
        
        const entryWindowHours = isMultiDayEvent ? 4 : 2;
        const entryWindowStart = eventStart - (entryWindowHours * 60 * 60 * 1000);
        
        if (now < entryWindowStart) {
          const hoursUntilEntry = Math.ceil((entryWindowStart - now) / (1000 * 60 * 60));
          await logScanAttempt(ticket.ticket_id, scannerUserId, 'too_early', ipAddress, userAgent);
          return res.status(400).json({ 
            valid: false,
            error: `Event entry not yet available. Entry opens ${hoursUntilEntry} hour${hoursUntilEntry > 1 ? 's' : ''} before event start.`
          });
        }
        
        const gracePeriodHours = isMultiDayEvent ? 24 : 6;
        const eventEndWithGrace = eventEnd + (gracePeriodHours * 60 * 60 * 1000);
        
        if (now > eventEndWithGrace) {
          await logScanAttempt(ticket.ticket_id, scannerUserId, 'event_ended', ipAddress, userAgent);
          return res.status(400).json({ 
            valid: false,
            error: 'Event has ended. QR code is no longer valid.'
          });
        }

        // Check if already used (with multi-day support)
        if (ticket.status === 'used') {
          if (isMultiDayEvent) {
            const dailyScanLimit = 5;
            const todayScansResult = await pool.query(
              `SELECT COUNT(*) as today_scans 
               FROM qr_scan_logs 
               WHERE ticket_id = $1 
               AND DATE(scan_timestamp) = CURRENT_DATE 
               AND (scan_result = 'success' OR scan_result = 're_entry')`,
              [ticket.ticket_id]
            );
            
            const todayScans = parseInt(todayScansResult.rows[0]?.today_scans || 0);
            
            if (todayScans >= dailyScanLimit) {
              await logScanAttempt(ticket.ticket_id, scannerUserId, 'daily_limit_exceeded', ipAddress, userAgent);
              return res.status(400).json({ 
                valid: false,
                error: `Daily scan limit reached (${dailyScanLimit} scans per day)`
              });
            }
            
            await logScanAttempt(ticket.ticket_id, scannerUserId, 're_entry', ipAddress, userAgent);
            await pool.query(
              `UPDATE tickets 
               SET scan_count = COALESCE(scan_count, 0) + 1, last_scanned_at = CURRENT_TIMESTAMP 
               WHERE ticket_id = $1`,
              [ticket.ticket_id]
            );
            
            return res.json({
              valid: true,
              message: `Re-entry granted for multi-day event (Day ${Math.min((ticket.scan_count || 0) + 1, eventDurationDays)} of ${eventDurationDays})`,
              reEntry: true,
              isMultiDay: true,
              ticket: {
                ticket_id: ticket.ticket_id,
                attendee_name: ticket.attendee_name,
                attendee_email: ticket.attendee_email,
                event_title: ticket.title,
                ticket_type: ticket.ticket_type,
                price: ticket.price,
                start_time: ticket.start_time,
                end_time: ticket.end_time
              }
            });
          } else {
            await logScanAttempt(ticket.ticket_id, scannerUserId, 'already_used', ipAddress, userAgent);
            return res.status(400).json({ 
              valid: false,
              error: 'Ticket already scanned and used'
            });
          }
        }

        // Mark as used (or keep active for multi-day)
        const newStatus = isMultiDayEvent ? 'active' : 'used';
        await pool.query(
          `UPDATE tickets 
           SET status = $1, scan_count = COALESCE(scan_count, 0) + 1, last_scanned_at = CURRENT_TIMESTAMP 
           WHERE ticket_id = $2`,
          [newStatus, ticket.ticket_id]
        );

        await logScanAttempt(ticket.ticket_id, scannerUserId, 'success', ipAddress, userAgent);

        return res.json({
          valid: true,
          message: isMultiDayEvent 
            ? `Entry granted - Multi-day event (Day 1 of ${eventDurationDays})`
            : 'Ticket validated successfully - Entry granted',
          firstEntry: true,
          isMultiDay: isMultiDayEvent,
          ticket: {
            ticket_id: ticket.ticket_id,
            attendee_name: ticket.attendee_name,
            attendee_email: ticket.attendee_email,
            event_title: ticket.title,
            ticket_type: ticket.ticket_type,
            price: ticket.price,
            start_time: ticket.start_time,
            end_time: ticket.end_time,
            event_duration_days: eventDurationDays
          }
        });

      } catch (base64Error) {
        // All formats failed
        await logScanAttempt(null, scannerUserId, 'invalid', ipAddress, userAgent);
        return res.status(400).json({ 
          valid: false,
          error: 'Invalid QR code format - Unable to decode' 
        });
      }
    }

    // Continue with JWT validation (existing code)
    const qrData = qrValidation.data;

    // Get ticket from database
    let result;
    
    // Handle both integer and string ticket IDs
    if (typeof qrData.ticketId === 'string' && qrData.ticketId.includes('-')) {
      // This is a legacy string-based ticket ID, try to find by QR code instead
      result = await pool.query(
        `SELECT t.*, e.title, e.start_time, e.end_time, e.type, e.location,
                u.name as attendee_name, u.email as attendee_email
         FROM tickets t
         JOIN events e ON t.event_id = e.event_id
         JOIN users u ON t.user_id = u.user_id
         WHERE t.user_id = $1 AND t.event_id = $2 AND t.status != 'cancelled'
         ORDER BY t.created_at DESC
         LIMIT 1`,
        [qrData.userId, qrData.eventId]
      );
    } else {
      // Standard integer ticket ID lookup
      result = await pool.query(
        `SELECT t.*, e.title, e.start_time, e.end_time, e.type, e.location,
                u.name as attendee_name, u.email as attendee_email
         FROM tickets t
         JOIN events e ON t.event_id = e.event_id
         JOIN users u ON t.user_id = u.user_id
         WHERE t.ticket_id = $1 AND t.user_id = $2 AND t.event_id = $3`,
        [qrData.ticketId, qrData.userId, qrData.eventId]
      );
    }

    if (result.rows.length === 0) {
      await logScanAttempt(null, scannerUserId, 'not_found', ipAddress, userAgent);
      return res.status(404).json({ 
        valid: false,
        error: 'Ticket not found' 
      });
    }

    const ticket = result.rows[0];

    // Check if ticket is cancelled
    if (ticket.status === 'cancelled') {
      await logScanAttempt(ticket.ticket_id, scannerUserId, 'cancelled', ipAddress, userAgent);
      return res.status(400).json({ 
        valid: false,
        error: 'Ticket has been cancelled'
      });
    }

    // Check payment status - ticket must be paid for
    if (ticket.payment_status !== 'completed' && ticket.payment_status !== 'free') {
      await logScanAttempt(ticket.ticket_id, scannerUserId, 'unpaid', ipAddress, userAgent);
      return res.status(400).json({ 
        valid: false,
        error: 'Ticket payment not completed - Entry denied'
      });
    }

    // Check if ticket already used (different logic for multi-day events)
    if (ticket.status === 'used') {
      console.log('Ticket already used, checking multi-day logic...');
      
      // Calculate event duration from ticket data
      const eventStart = new Date(ticket.start_time).getTime();
      const eventEnd = new Date(ticket.end_time).getTime();
      const eventDurationMs = eventEnd - eventStart;
      const eventDurationDays = Math.ceil(eventDurationMs / (1000 * 60 * 60 * 24));
      const isMultiDayEvent = eventDurationDays > 1;
      
      console.log('Event duration days:', eventDurationDays);
      console.log('Allows re-entry:', isMultiDayEvent);
      
      // ONLY multi-day events allow re-entry
      if (isMultiDayEvent) {
        console.log('Multi-day event detected, checking scan limits...');
        
        // Check daily scan limit for multi-day events (prevent abuse)
        const dailyScanLimit = 5; // Max 5 scans per day
        
        // Get today's scan count from qr_scan_logs table
        const todayScansResult = await pool.query(
          `SELECT COUNT(*) as today_scans 
           FROM qr_scan_logs 
           WHERE ticket_id = $1 
           AND DATE(scan_timestamp) = CURRENT_DATE 
           AND (scan_result = 'success' OR scan_result = 're_entry')`,
          [ticket.ticket_id]
        );
        
        const todayScans = parseInt(todayScansResult.rows[0]?.today_scans || 0);
        
        console.log(`Today's scans for ticket ${ticket.ticket_id}: ${todayScans}/${dailyScanLimit}`);
        
        if (todayScans >= dailyScanLimit) {
          await logScanAttempt(ticket.ticket_id, scannerUserId, 'daily_limit_exceeded', ipAddress, userAgent);
          return res.status(400).json({ 
            valid: false,
            error: `Daily scan limit reached (${dailyScanLimit} scans per day). Try again tomorrow.`
          });
        }
        
        // Log re-entry attempt
        await logScanAttempt(ticket.ticket_id, scannerUserId, 're_entry', ipAddress, userAgent);
        
        // Update scan count for re-entry
        await pool.query(
          `UPDATE tickets 
           SET scan_count = COALESCE(scan_count, 0) + 1, last_scanned_at = CURRENT_TIMESTAMP 
           WHERE ticket_id = $1`,
          [ticket.ticket_id]
        );
        
        const scanCount = (ticket.scan_count || 0) + 1;
        
        return res.json({
          valid: true,
          message: `Re-entry granted for multi-day event (Day ${Math.min(scanCount, eventDurationDays)} of ${eventDurationDays}, Today: ${todayScans + 1}/${dailyScanLimit})`,
          reEntry: true,
          isMultiDay: true,
          ticket: {
            ticket_id: ticket.ticket_id,
            attendee_name: ticket.attendee_name,
            attendee_email: ticket.attendee_email,
            event_title: ticket.title,
            ticket_type: ticket.ticket_type,
            price: ticket.price,
            start_time: ticket.start_time,
            end_time: ticket.end_time,
            previous_scans: ticket.scan_count || 0,
            event_duration_days: eventDurationDays,
            scan_count: scanCount,
            daily_scans: todayScans + 1,
            daily_limit: dailyScanLimit
          }
        });
      } else {
        console.log('Single-day event, no re-entry allowed');
        // Single-day events don't allow re-entry
        await logScanAttempt(ticket.ticket_id, scannerUserId, 'already_used', ipAddress, userAgent);
        return res.status(400).json({ 
          valid: false,
          error: `Ticket already scanned and used - Single-day event only`
        });
      }
    }

    // Check time-based validity - Event must have started or be within entry window
    const now = Date.now();
    const eventStart = new Date(ticket.start_time).getTime();
    const eventEnd = new Date(ticket.end_time).getTime();
    
    // Calculate event duration
    const eventDurationMs = eventEnd - eventStart;
    const eventDurationDays = Math.ceil(eventDurationMs / (1000 * 60 * 60 * 24));
    const isMultiDayEvent = eventDurationDays > 1;
    
    // Entry window: 2 hours before for single-day, 4 hours before for multi-day
    const entryWindowHours = isMultiDayEvent ? 4 : 2;
    const entryWindowStart = eventStart - (entryWindowHours * 60 * 60 * 1000);
    
    // Check if trying to scan too early
    if (now < entryWindowStart) {
      const hoursUntilEntry = Math.ceil((entryWindowStart - now) / (1000 * 60 * 60));
      await logScanAttempt(ticket.ticket_id, scannerUserId, 'too_early', ipAddress, userAgent);
      return res.status(400).json({ 
        valid: false,
        error: `Event entry not yet available. Entry opens ${hoursUntilEntry} hour${hoursUntilEntry > 1 ? 's' : ''} before event start.`,
        event_start: new Date(eventStart).toLocaleString(),
        entry_opens: new Date(entryWindowStart).toLocaleString()
      });
    }
    
    // Check if event has ended (with grace period)
    const gracePeriodHours = isMultiDayEvent ? 24 : 6;
    const eventEndWithGrace = eventEnd + (gracePeriodHours * 60 * 60 * 1000);
    
    if (now > eventEndWithGrace) {
      await logScanAttempt(ticket.ticket_id, scannerUserId, 'event_ended', ipAddress, userAgent);
      return res.status(400).json({ 
        valid: false,
        error: 'Event has ended. QR code is no longer valid.',
        event_end: new Date(eventEnd).toLocaleString()
      });
    }

    // Check if QR has time restrictions (from JWT)
    if (qrData.validFrom && now < qrData.validFrom) {
      await logScanAttempt(ticket.ticket_id, scannerUserId, 'too_early', ipAddress, userAgent);
      return res.status(400).json({ 
        valid: false,
        error: 'QR code not yet valid for this event'
      });
    }

    // Mark ticket as used and update scan count (or just increment for multi-day re-entry)
    if (ticket.status !== 'used') {
      // First-time entry
      // For multi-day events, keep status as 'active' to allow re-entry
      // For single-day events, mark as 'used'
      const newStatus = isMultiDayEvent ? 'active' : 'used';
      
      await pool.query(
        `UPDATE tickets 
         SET status = $1, scan_count = COALESCE(scan_count, 0) + 1, last_scanned_at = CURRENT_TIMESTAMP 
         WHERE ticket_id = $2`,
        [newStatus, ticket.ticket_id]
      );
      
      // Log successful scan
      await logScanAttempt(ticket.ticket_id, scannerUserId, 'success', ipAddress, userAgent);
      
      res.json({
        valid: true,
        message: isMultiDayEvent 
          ? `Entry granted - Multi-day event (Day 1 of ${eventDurationDays}). You can re-enter each day.`
          : 'Ticket validated successfully - Entry granted',
        firstEntry: true,
        isMultiDay: isMultiDayEvent,
        ticket: {
          ticket_id: ticket.ticket_id,
          attendee_name: ticket.attendee_name,
          attendee_email: ticket.attendee_email,
          event_title: ticket.title,
          ticket_type: ticket.ticket_type,
          price: ticket.price,
          start_time: ticket.start_time,
          end_time: ticket.end_time,
          event_duration_days: eventDurationDays,
          scan_count: 1
        }
      });
    } else {
      // Re-entry for multi-day event (already handled above)
      await pool.query(
        `UPDATE tickets 
         SET scan_count = COALESCE(scan_count, 0) + 1, last_scanned_at = CURRENT_TIMESTAMP 
         WHERE ticket_id = $1`,
        [ticket.ticket_id]
      );
    }
  } catch (error) {
    console.error('Validate QR code error:', error);
    res.status(500).json({ error: 'Failed to validate QR code' });
  }
};

// Helper function to log scan attempts
const logScanAttempt = async (ticketId, scannedBy, result, ipAddress, userAgent) => {
  try {
    await pool.query(
      `INSERT INTO qr_scan_logs (ticket_id, scanned_by, scan_result, ip_address, user_agent, scan_timestamp)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [ticketId, scannedBy, result, ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Failed to log scan attempt:', error);
  }
};

// Get scan analytics for organizers
const getScanAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const analytics = await pool.query(`
      SELECT 
        COUNT(*) as total_scans,
        COUNT(CASE WHEN scan_result = 'success' THEN 1 END) as successful_scans,
        COUNT(CASE WHEN scan_result = 'invalid' THEN 1 END) as invalid_attempts,
        COUNT(CASE WHEN scan_result = 'already_used' THEN 1 END) as duplicate_attempts,
        DATE_TRUNC('hour', scan_timestamp) as scan_hour,
        COUNT(*) as scans_per_hour
      FROM qr_scan_logs qsl
      JOIN tickets t ON qsl.ticket_id = t.ticket_id
      WHERE t.event_id = $1
      GROUP BY scan_hour
      ORDER BY scan_hour
    `, [eventId]);

    res.json({
      analytics: analytics.rows,
      summary: {
        total_scans: analytics.rows.reduce((sum, row) => sum + parseInt(row.total_scans), 0),
        successful_scans: analytics.rows.reduce((sum, row) => sum + parseInt(row.successful_scans), 0),
        security_incidents: analytics.rows.reduce((sum, row) => sum + parseInt(row.invalid_attempts), 0)
      }
    });
  } catch (error) {
    console.error('Get scan analytics error:', error);
    res.status(500).json({ error: 'Failed to get scan analytics' });
  }
};

module.exports = {
  validateQRCodeEnhanced,
  getScanAnalytics
};