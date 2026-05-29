-- Add email_new_question preference to notification_preferences table
-- This allows organizers to control whether they receive email notifications for new questions

ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS email_new_question BOOLEAN DEFAULT TRUE;

-- Update the comment on the notifications type column to include 'new_question'
COMMENT ON COLUMN notifications.type IS 'Notification type: registration, reminder, update, cancellation, new_attendee, qa_answer, new_poll, new_question';

-- Set default to TRUE for all existing users
UPDATE notification_preferences 
SET email_new_question = TRUE 
WHERE email_new_question IS NULL;
