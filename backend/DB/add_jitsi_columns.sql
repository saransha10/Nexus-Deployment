-- Add Jitsi Meeting columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS jitsi_room VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS jitsi_password VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_jitsi_room ON events(jitsi_room);
