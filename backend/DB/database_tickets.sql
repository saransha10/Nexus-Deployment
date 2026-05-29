-- Tickets/Registrations Table for Nexus Event Management System
-- Combined schema with pricing, ticket types, and status tracking
-- UPDATED: Removed UNIQUE constraint to allow multiple tickets per user
-- UPDATED: Added payment_token for Khalti payment tracking

CREATE TABLE tickets (
    ticket_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
    ticket_type_id INTEGER REFERENCES ticket_types(ticket_type_id) ON DELETE SET NULL,
    qr_code VARCHAR(500) UNIQUE NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0.00,
    ticket_type VARCHAR(50) DEFAULT 'Regular',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'used')),
    payment_token VARCHAR(500),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_gateway VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_qr ON tickets(qr_code);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_type ON tickets(ticket_type_id);
CREATE INDEX idx_tickets_payment_gateway ON tickets(payment_gateway);

-- Trigger for updated_at
CREATE TRIGGER update_tickets_updated_at 
BEFORE UPDATE ON tickets
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add payment columns to existing table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_token VARCHAR(500);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50);

-- Sample tickets (adjust IDs to match your data)
-- INSERT INTO tickets (user_id, event_id, ticket_type_id, qr_code, price, ticket_type, status) VALUES
-- (3, 1, 1, 'QR-1234567890-ABC', 99.99, 'VIP', 'active'),
-- (3, 1, 2, 'QR-1234567890-DEF', 49.99, 'Regular', 'active'),
-- (3, 2, 4, 'QR-0987654321-XYZ', 0.00, 'Regular', 'active'),
-- (4, 1, 3, 'QR-1111222233-DEF', 24.99, 'Student', 'active');
