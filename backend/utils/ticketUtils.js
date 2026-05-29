const pool = require('../config/database');

/**
 * Check if tickets are available for a given ticket type
 * @param {string|number} ticketTypeId - The ID of the ticket type
 * @returns {Promise<{available: boolean, error?: string}>}
 */
const checkTicketAvailability = async (ticketTypeId) => {
    try {
        // Get ticket type details
        const ticketTypeResult = await pool.query(
            'SELECT * FROM ticket_types WHERE ticket_type_id = $1',
            [ticketTypeId]
        );

        if (ticketTypeResult.rows.length === 0) {
            return { available: false, error: 'Ticket type not found' };
        }

        const ticketType = ticketTypeResult.rows[0];

        // Check ticket type quantity limit
        if (ticketType.quantity_available !== null) {
            const soldCountResult = await pool.query(
                'SELECT COUNT(*) FROM tickets WHERE ticket_type_id = $1 AND status = $2',
                [ticketTypeId, 'active']
            );

            const soldCount = parseInt(soldCountResult.rows[0].count);
            const quantityAvailable = parseInt(ticketType.quantity_available);

            if (soldCount >= quantityAvailable) {
                return { available: false, error: `${ticketType.type_name} tickets are sold out` };
            }
        }

        // Check event max attendees limit
        const eventId = ticketType.event_id;
        const eventResult = await pool.query(
            'SELECT max_attendees FROM events WHERE event_id = $1',
            [eventId]
        );

        if (eventResult.rows.length > 0) {
            const event = eventResult.rows[0];
            if (event.max_attendees) {
                const attendeeCountResult = await pool.query(
                    'SELECT COUNT(*) FROM tickets WHERE event_id = $1 AND status = $2',
                    [eventId, 'active']
                );

                const attendeeCount = parseInt(attendeeCountResult.rows[0].count);
                const maxAttendees = parseInt(event.max_attendees);

                if (attendeeCount >= maxAttendees) {
                    return { available: false, error: 'Event is full' };
                }
            }
        }

        return { available: true };
    } catch (error) {
        console.error('Error checking ticket availability:', error);
        throw error;
    }
};

module.exports = {
    checkTicketAvailability
};
