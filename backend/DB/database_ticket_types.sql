-- Ticket Types Table - Organizers can define multiple ticket types per event

CREATE TABLE ticket_types (
    ticket_type_id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
    type_name VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity_available INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, type_name)
);

-- Create index
CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);

-- Sample ticket types
-- INSERT INTO ticket_types (event_id, type_name, price, quantity_available, description) VALUES
-- (1, 'VIP', 99.99, 50, 'VIP access with premium seating and networking'),
-- (1, 'Regular', 49.99, 200, 'Standard admission'),
-- (1, 'Student', 24.99, 100, 'Discounted price for students with valid ID'),
-- (2, 'Regular', 0.00, NULL, 'Free workshop for all');
