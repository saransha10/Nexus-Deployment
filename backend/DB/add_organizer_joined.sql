-- Add organizer_joined column to track when organizer joins meeting
-- This ensures organizer becomes moderator by joining first

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS organizer_joined BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN events.organizer_joined IS 'Tracks if organizer has joined the meeting. Participants blocked until true.';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_events_organizer_joined ON events(organizer_joined) WHERE organizer_joined = FALSE;
