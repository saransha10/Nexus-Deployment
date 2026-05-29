-- Add meeting_type column to events table
-- This allows organizers to choose between Jitsi or external streaming

ALTER TABLE events ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(50) 
  CHECK (meeting_type IN ('jitsi', 'external', 'none')) 
  DEFAULT 'none';

-- Add comment for documentation
COMMENT ON COLUMN events.meeting_type IS 'Type of video meeting: jitsi (integrated), external (streaming_url), or none';

-- Update existing events with streaming_url to use 'external'
UPDATE events 
SET meeting_type = 'external' 
WHERE streaming_url IS NOT NULL AND streaming_url != '';

-- Update existing events with jitsi_room to use 'jitsi'
UPDATE events 
SET meeting_type = 'jitsi' 
WHERE jitsi_room IS NOT NULL AND jitsi_room != '';
