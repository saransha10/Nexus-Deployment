-- Notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'registration', 'reminder', 'update', 'cancellation', 'new_attendee', 'qa_answer', 'new_poll'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  preference_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  email_registration BOOLEAN DEFAULT TRUE,
  email_reminder BOOLEAN DEFAULT TRUE,
  email_updates BOOLEAN DEFAULT TRUE,
  email_cancellation BOOLEAN DEFAULT TRUE,
  email_qa_answer BOOLEAN DEFAULT TRUE,
  email_new_poll BOOLEAN DEFAULT TRUE,
  in_app_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Insert default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT user_id FROM users
WHERE user_id NOT IN (SELECT user_id FROM notification_preferences);
