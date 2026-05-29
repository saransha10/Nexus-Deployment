-- Events Table for Nexus Event Management System
-- This matches your existing schema

-- If you need to create the table (skip if already exists):
/*
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) CHECK (type IN ('online', 'offline', 'hybrid')) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location VARCHAR(500),
    streaming_url VARCHAR(500),
    organizer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_start_time ON events(start_time);

-- Trigger for updated_at
CREATE TRIGGER update_events_updated_at 
BEFORE UPDATE ON events
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
*/

-- Add ticket pricing fields to existing events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_price DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_attendees INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;

-- Sample events (adjust organizer_id to match your users)
INSERT INTO events (title, description, type, start_time, end_time, location, streaming_url, organizer_id, ticket_price, is_free) VALUES
('Tech Conference 2025', 'Annual technology conference featuring latest innovations', 'hybrid', '2025-03-15 09:00:00', '2025-03-15 17:00:00', 'Convention Center, NYC', 'https://zoom.us/j/123456', 2, 99.99, false),
('Web Development Workshop', 'Learn modern web development with React and Node.js', 'online', '2025-02-20 14:00:00', '2025-02-20 18:00:00', NULL, 'https://meet.google.com/abc-defg-hij', 2, 0.00, true),
('Startup Networking Event', 'Connect with entrepreneurs and investors', 'offline', '2025-04-10 18:00:00', '2025-04-10 21:00:00', 'Innovation Hub, SF', NULL, 2, 25.00, false);
