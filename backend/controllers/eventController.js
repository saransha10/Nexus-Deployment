const pool = require('../config/database');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');

// Get all events
const getAllEvents = async (req, res) => {
  try {
    const { type, search } = req.query;
    const userRole = req.user?.role; // Get user role if authenticated
    
    let query = `
      SELECT e.*, 
             u.name as organizer_name, 
             u.email as organizer_email, 
             u.phone as organizer_phone,
             u.website as organizer_website,
             u.linkedin as organizer_linkedin,
             u.twitter as organizer_twitter
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.user_id
      WHERE e.end_time >= NOW()
    `;
    const params = [];
    let paramCount = 1;

    // Only show approved events to non-admin users
    // Admins can see all events for management purposes
    if (userRole !== 'admin') {
      query += ` AND (e.approval_status = 'approved' OR e.approval_status IS NULL)`;
    }

    if (type) {
      query += ` AND e.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (search) {
      query += ` AND (e.title ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY e.start_time ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Get single event
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const result = await pool.query(
      `SELECT e.*, 
              u.name as organizer_name, 
              u.email as organizer_email, 
              u.phone as organizer_phone,
              u.website as organizer_website,
              u.linkedin as organizer_linkedin,
              u.twitter as organizer_twitter
       FROM events e
       LEFT JOIN users u ON e.organizer_id = u.user_id
       WHERE e.event_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = result.rows[0];

    // Check if user can view this event
    // Allow if: admin, organizer of the event, or event is approved
    const isAdmin = userRole === 'admin';
    const isOrganizer = event.organizer_id === userId;
    const isApproved = event.approval_status === 'approved' || event.approval_status === null;

    if (!isAdmin && !isOrganizer && !isApproved) {
      return res.status(403).json({ error: 'This event is pending approval and not yet available' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

// Create event (organizer/admin only)
const createEvent = async (req, res) => {
  let event_image = null;
  let cloudinary_public_id = null;
  try {
    const {
      title,
      description,
      type,
      start_time,
      end_time,
      location,
      streaming_url,
      ticket_price,
      max_attendees,
      is_free,
      meeting_type, // NEW: organizer's choice
      // Registration fields (now supported in database)
      registration_start_time,
      registration_end_time,
      // Location fields (now supported in database)
      location_name,
      location_address,
      location_lat,
      location_lng,
      location_place_id,
      location_formatted_address
    } = req.body;

    const organizer_id = req.user.userId;

    // Handle uploaded image — upload to Cloudinary
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.path, 'nexus/events');
      event_image = uploaded.url;
      cloudinary_public_id = uploaded.public_id;
    }

    // Enhanced validation with detailed error messages
    if (!title) {
      return res.status(400).json({ error: 'Event title is required' });
    }
    if (!type) {
      return res.status(400).json({ error: 'Event type is required' });
    }
    if (!start_time) {
      return res.status(400).json({ error: 'Event start time is required' });
    }
    if (!end_time) {
      return res.status(400).json({ error: 'Event end time is required' });
    }

    // Date validation
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Registration date validation if provided
    if (registration_start_time && registration_end_time) {
      const regStart = new Date(registration_start_time);
      const regEnd = new Date(registration_end_time);
      
      if (regStart >= regEnd) {
        return res.status(400).json({ error: 'Registration end time must be after registration start time' });
      }
      
      if (regEnd > startDate) {
        return res.status(400).json({ error: 'Registration must close before or when the event starts' });
      }
    }

    // Use the formatted address if available, otherwise use the basic location
    const eventLocation = location_formatted_address || location || null;

    const result = await pool.query(
      `INSERT INTO events (
        title, description, type, start_time, end_time, 
        location, streaming_url, organizer_id, ticket_price, max_attendees, is_free, event_image,
        registration_start_time, registration_end_time,
        location_name, location_address, location_lat, location_lng, 
        location_place_id, location_formatted_address, meeting_type, cloudinary_public_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        title, description, type, start_time, end_time,
        eventLocation, streaming_url, organizer_id,
        ticket_price || 0, max_attendees, is_free !== false,
        event_image,
        registration_start_time, registration_end_time,
        location_name, location_address, location_lat, location_lng,
        location_place_id, location_formatted_address,
        meeting_type || 'none',
        cloudinary_public_id
      ]
    );

    res.status(201).json({
      message: 'Event created successfully',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Create event error:', error);
    console.error('Request body:', req.body);
    
    // Cleanup Cloudinary image if database insert fails
    if (cloudinary_public_id) {
      try {
        await deleteFromCloudinary(cloudinary_public_id);
      } catch (cleanupError) {
        console.error('Failed to cleanup Cloudinary image:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to create event',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update event (with restrictions for events with sold tickets)
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if event exists and user is organizer or admin
    const eventCheck = await pool.query(
      'SELECT * FROM events WHERE event_id = $1',
      [id]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];

    if (event.organizer_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this event' });
    }

    // Check if event is currently live
    const now = new Date();
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    const isEventLive = now >= eventStart && now <= eventEnd;

    if (isEventLive) {
      return res.status(400).json({ 
        error: 'Cannot edit event while it is live. Please wait until the event ends.' 
      });
    }

    // Check if event has already ended
    const isEventPast = now > eventEnd;

    if (isEventPast) {
      return res.status(400).json({ 
        error: 'Cannot edit past events' 
      });
    }

    // Check if tickets have been sold
    const ticketCheck = await pool.query(
      'SELECT COUNT(*) as count FROM tickets WHERE event_id = $1',
      [id]
    );
    const hasTicketsSold = parseInt(ticketCheck.rows[0].count) > 0;

    const {
      description,
      type,
      start_time,
      end_time,
      location,
      streaming_url,
      meeting_type
    } = req.body;

    let event_image = undefined;
    let cloudinary_public_id = undefined;

    // Handle uploaded image — upload to Cloudinary
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.path, 'nexus/events');
      event_image = uploaded.url;
      cloudinary_public_id = uploaded.public_id;

      // Delete old image if it existed
      if (event.cloudinary_public_id) {
        await deleteFromCloudinary(event.cloudinary_public_id);
      }
    }

    // ALWAYS prevent date/time changes after event creation
    if (start_time !== undefined || end_time !== undefined) {
      return res.status(400).json({ 
        error: 'Cannot change event date/time after event creation' 
      });
    }

    // Build update query dynamically based on what can be updated
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Always allow these fields to be updated
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (type !== undefined) {
      updates.push(`type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }

    if (location !== undefined) {
      updates.push(`location = $${paramCount}`);
      values.push(location);
      paramCount++;
    }

    if (streaming_url !== undefined) {
      updates.push(`streaming_url = $${paramCount}`);
      values.push(streaming_url);
      paramCount++;
    }

    if (meeting_type !== undefined) {
      updates.push(`meeting_type = $${paramCount}`);
      values.push(meeting_type);
      paramCount++;
    }

    if (event_image !== undefined) {
      updates.push(`event_image = $${paramCount}`);
      values.push(event_image);
      paramCount++;
    }

    if (cloudinary_public_id !== undefined) {
      updates.push(`cloudinary_public_id = $${paramCount}`);
      values.push(cloudinary_public_id);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE events SET ${updates.join(', ')} WHERE event_id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    res.json({
      message: 'Event updated successfully',
      event: result.rows[0],
      hasTicketsSold
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

// Delete event
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if event exists and user is organizer or admin
    const eventCheck = await pool.query(
      'SELECT * FROM events WHERE event_id = $1',
      [id]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];

    if (event.organizer_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    // Check if event has ended
    const now = new Date();
    const eventEnd = new Date(event.end_time);

    if (now < eventEnd) {
      return res.status(400).json({ 
        error: 'Cannot delete event before it ends. Events can only be deleted after the end time.',
        eventEndTime: event.end_time
      });
    }

    // Delete event image from Cloudinary if it exists
    if (event.cloudinary_public_id) {
      await deleteFromCloudinary(event.cloudinary_public_id);
    }

    await pool.query('DELETE FROM events WHERE event_id = $1', [id]);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

// Get events by organizer
const getOrganizerEvents = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT 
        e.*,
        COUNT(DISTINCT t.ticket_id) as attendee_count,
        COALESCE(SUM(CAST(t.price AS DECIMAL)), 0) as total_revenue
       FROM events e
       LEFT JOIN tickets t ON e.event_id = t.event_id AND t.status != 'cancelled'
       WHERE e.organizer_id = $1 
       GROUP BY e.event_id
       ORDER BY e.start_time DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get organizer events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Email all attendees of an event
const emailAttendees = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Validation
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Email subject is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Email message is required' });
    }

    // Check if event exists and user is organizer or admin
    const eventCheck = await pool.query(
      'SELECT * FROM events WHERE event_id = $1',
      [id]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];

    if (event.organizer_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to email attendees of this event' });
    }

    // Get all attendees with active tickets
    const attendeesResult = await pool.query(
      `SELECT DISTINCT u.email, u.name, t.ticket_id
       FROM tickets t
       JOIN users u ON t.user_id = u.user_id
       WHERE t.event_id = $1 AND t.status = 'active'`,
      [id]
    );

    if (attendeesResult.rows.length === 0) {
      return res.status(400).json({ error: 'No attendees found for this event' });
    }

    // Import email utility
    const { sendAttendeeEmail } = require('../utils/email');

    // Send emails to all attendees
    const emailPromises = attendeesResult.rows.map(attendee => 
      sendAttendeeEmail(
        attendee.email,
        attendee.name,
        event,
        subject.trim(),
        message.trim()
      ).catch(error => {
        console.error(`Failed to send email to ${attendee.email}:`, error);
        return { error: true, email: attendee.email };
      })
    );

    const results = await Promise.all(emailPromises);
    const failedEmails = results.filter(r => r && r.error);

    if (failedEmails.length > 0) {
      console.warn(`Failed to send ${failedEmails.length} emails`);
    }

    res.json({
      message: 'Emails sent successfully',
      totalSent: attendeesResult.rows.length - failedEmails.length,
      totalFailed: failedEmails.length,
      totalAttendees: attendeesResult.rows.length
    });
  } catch (error) {
    console.error('Email attendees error:', error);
    res.status(500).json({ error: 'Failed to send emails to attendees' });
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getOrganizerEvents,
  emailAttendees
};
