const pool = require('../config/database');

// Get ticket types for an event
const getEventTicketTypes = async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `SELECT 
        tt.*,
        COALESCE(COUNT(t.ticket_id) FILTER (WHERE t.status IN ('active', 'used') AND t.payment_status IN ('completed', 'free')), 0)::integer as sold,
        CASE 
          WHEN tt.quantity_available IS NULL THEN NULL
          ELSE GREATEST(0, tt.quantity_available - COALESCE(COUNT(t.ticket_id) FILTER (WHERE t.status IN ('active', 'used') AND t.payment_status IN ('completed', 'free')), 0))
        END::integer as remaining
       FROM ticket_types tt
       LEFT JOIN tickets t ON tt.ticket_type_id = t.ticket_type_id
       WHERE tt.event_id = $1
       GROUP BY tt.ticket_type_id
       ORDER BY tt.price ASC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get ticket types error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket types' });
  }
};

// Create ticket types for an event (organizer only)
const createTicketTypes = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticketTypes, type_name, price, quantity_available, description } = req.body;
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
      return res.status(403).json({ error: 'Not authorized to manage this event' });
    }

    // Handle single ticket type creation
    if (type_name) {
      const result = await pool.query(
        `INSERT INTO ticket_types (event_id, type_name, price, quantity_available, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [eventId, type_name, price, quantity_available || null, description || null]
      );

      return res.status(201).json({
        message: 'Ticket type created successfully',
        ticketType: result.rows[0]
      });
    }

    // Handle batch ticket types creation
    if (!ticketTypes || !Array.isArray(ticketTypes)) {
      return res.status(400).json({ error: 'ticketTypes array is required' });
    }

    // Delete existing ticket types for this event
    await pool.query('DELETE FROM ticket_types WHERE event_id = $1', [eventId]);

    // Insert new ticket types
    const createdTypes = [];
    for (const type of ticketTypes) {
      const result = await pool.query(
        `INSERT INTO ticket_types (event_id, type_name, price, quantity_available, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [eventId, type.type_name, type.price, type.quantity_available || null, type.description || null]
      );
      createdTypes.push(result.rows[0]);
    }

    res.status(201).json({
      message: 'Ticket types created successfully',
      ticketTypes: createdTypes
    });
  } catch (error) {
    console.error('Create ticket types error:', error);
    res.status(500).json({ error: 'Failed to create ticket types' });
  }
};

// Update ticket type (with restrictions for sold tickets)
const updateTicketType = async (req, res) => {
  try {
    const { ticketTypeId } = req.params;
    const { type_name, price, quantity_available, description } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if ticket type exists and user is authorized
    const typeCheck = await pool.query(
      `SELECT tt.*, e.organizer_id,
        COALESCE(COUNT(t.ticket_id) FILTER (WHERE t.status IN ('active', 'used') AND t.payment_status IN ('completed', 'free')), 0)::integer as sold
       FROM ticket_types tt
       JOIN events e ON tt.event_id = e.event_id
       LEFT JOIN tickets t ON tt.ticket_type_id = t.ticket_type_id
       WHERE tt.ticket_type_id = $1
       GROUP BY tt.ticket_type_id, e.organizer_id`,
      [ticketTypeId]
    );

    if (typeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket type not found' });
    }

    const ticketType = typeCheck.rows[0];

    if (ticketType.organizer_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if trying to decrease quantity below sold tickets
    if (quantity_available !== undefined && quantity_available < ticketType.sold) {
      return res.status(400).json({ 
        error: `Cannot set quantity below ${ticketType.sold} (tickets already sold)` 
      });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (type_name !== undefined) {
      updates.push(`type_name = $${paramCount}`);
      values.push(type_name);
      paramCount++;
    }

    if (price !== undefined) {
      updates.push(`price = $${paramCount}`);
      values.push(price);
      paramCount++;
    }

    if (quantity_available !== undefined) {
      updates.push(`quantity_available = $${paramCount}`);
      values.push(quantity_available);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(ticketTypeId);
    const query = `UPDATE ticket_types SET ${updates.join(', ')} WHERE ticket_type_id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    res.json({
      message: 'Ticket type updated successfully',
      ticketType: result.rows[0]
    });
  } catch (error) {
    console.error('Update ticket type error:', error);
    res.status(500).json({ error: 'Failed to update ticket type' });
  }
};

// Delete ticket type
const deleteTicketType = async (req, res) => {
  try {
    const { ticketTypeId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check authorization
    const typeCheck = await pool.query(
      `SELECT tt.*, e.organizer_id 
       FROM ticket_types tt
       JOIN events e ON tt.event_id = e.event_id
       WHERE tt.ticket_type_id = $1`,
      [ticketTypeId]
    );

    if (typeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket type not found' });
    }

    if (typeCheck.rows[0].organizer_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM ticket_types WHERE ticket_type_id = $1', [ticketTypeId]);

    res.json({ message: 'Ticket type deleted successfully' });
  } catch (error) {
    console.error('Delete ticket type error:', error);
    res.status(500).json({ error: 'Failed to delete ticket type' });
  }
};

module.exports = {
  getEventTicketTypes,
  createTicketTypes,
  updateTicketType,
  deleteTicketType
};
