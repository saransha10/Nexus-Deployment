-- Admin Panel Database Schema Updates
-- Run this to add admin functionality to existing database

-- ============================================
-- 1. EVENT APPROVAL SYSTEM
-- ============================================

-- Add approval columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(user_id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Create index for faster approval status queries
CREATE INDEX IF NOT EXISTS idx_events_approval_status ON events(approval_status);

-- ============================================
-- 2. USER ACCOUNT STATUS
-- ============================================

-- Add account status columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active' 
    CHECK (account_status IN ('active', 'suspended', 'banned'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by INTEGER REFERENCES users(user_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;

-- Create index for account status
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

-- ============================================
-- 3. ORGANIZER VERIFICATION
-- ============================================

-- Add organizer verification columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'unverified' 
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_documents TEXT; -- JSON array of document URLs
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(user_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- ============================================
-- 4. ADMIN AUDIT LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    log_id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL, -- e.g., 'approve_event', 'suspend_user', 'delete_event'
    target_type VARCHAR(50) NOT NULL, -- e.g., 'event', 'user', 'ticket'
    target_id INTEGER NOT NULL,
    details JSONB, -- Additional details about the action
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at);

-- ============================================
-- 5. USER REPORTS & COMPLAINTS
-- ============================================

CREATE TABLE IF NOT EXISTS user_reports (
    report_id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(user_id),
    reported_user_id INTEGER REFERENCES users(user_id),
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('user', 'event', 'message', 'question', 'other')),
    target_id INTEGER, -- ID of the reported item (event_id, message_id, etc.)
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    reviewed_by INTEGER REFERENCES users(user_id),
    reviewed_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON user_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON user_reports(reported_user_id);

-- ============================================
-- 6. SYSTEM SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
    setting_id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    updated_by INTEGER REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
    ('platform_name', 'NEXUS Event Management', 'string', 'Platform display name'),
    ('require_event_approval', 'true', 'boolean', 'Require admin approval for new events'),
    ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode'),
    ('registration_enabled', 'true', 'boolean', 'Allow new user registrations'),
    ('platform_fee_percentage', '5', 'number', 'Platform fee percentage on ticket sales'),
    ('max_events_per_organizer', '50', 'number', 'Maximum events an organizer can create'),
    ('email_notifications_enabled', 'true', 'boolean', 'Enable email notifications'),
    ('support_email', 'support@nexus-events.com', 'string', 'Support contact email')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- 7. PLATFORM ANNOUNCEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS announcements (
    announcement_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
    target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'organizers', 'attendees', 'admins')),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create index for active announcements
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, expires_at);

-- ============================================
-- 8. REFUND REQUESTS
-- ============================================

CREATE TABLE IF NOT EXISTS refund_requests (
    refund_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    event_id INTEGER NOT NULL REFERENCES events(event_id),
    reason TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    reviewed_by INTEGER REFERENCES users(user_id),
    reviewed_at TIMESTAMP,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for refund requests
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON refund_requests(user_id);

-- ============================================
-- 9. FEATURED EVENTS
-- ============================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS featured_order INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP;

-- Create index for featured events
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured, featured_order);

-- ============================================
-- 10. ORGANIZER RATINGS
-- ============================================

CREATE TABLE IF NOT EXISTS organizer_ratings (
    rating_id SERIAL PRIMARY KEY,
    organizer_id INTEGER NOT NULL REFERENCES users(user_id),
    event_id INTEGER NOT NULL REFERENCES events(event_id),
    attendee_id INTEGER NOT NULL REFERENCES users(user_id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, attendee_id) -- One rating per attendee per event
);

-- Create indexes for ratings
CREATE INDEX IF NOT EXISTS idx_ratings_organizer ON organizer_ratings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_ratings_event ON organizer_ratings(event_id);

-- ============================================
-- VIEWS FOR ADMIN DASHBOARD
-- ============================================

-- View: Platform Statistics
CREATE OR REPLACE VIEW admin_platform_stats AS
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE role = 'organizer') as total_organizers,
    (SELECT COUNT(*) FROM users WHERE role = 'attendee') as total_attendees,
    (SELECT COUNT(*) FROM users WHERE account_status = 'active') as active_users,
    (SELECT COUNT(*) FROM events) as total_events,
    (SELECT COUNT(*) FROM events WHERE approval_status = 'approved') as approved_events,
    (SELECT COUNT(*) FROM events WHERE approval_status = 'pending') as pending_events,
    (SELECT COUNT(*) FROM tickets) as total_tickets,
    (SELECT COUNT(DISTINCT user_id) FROM tickets WHERE status != 'cancelled') as unique_ticket_buyers,
    (SELECT COUNT(*) FROM tickets WHERE status IN ('active', 'used')) as valid_tickets,
    (SELECT COUNT(*) FROM tickets WHERE status = 'active' AND (scan_count = 0 OR scan_count IS NULL)) as unused_tickets,
    (SELECT COUNT(*) FROM tickets WHERE scan_count > 0 OR last_scanned_at IS NOT NULL) as scanned_tickets,
    (SELECT COALESCE(SUM(CAST(price AS DECIMAL)), 0) FROM tickets WHERE status != 'cancelled') as total_revenue,
    (SELECT COUNT(*) FROM user_reports WHERE status = 'pending') as pending_reports;

-- View: Organizer Performance
CREATE OR REPLACE VIEW organizer_performance AS
SELECT 
    u.user_id,
    u.name,
    u.email,
    u.is_verified,
    COUNT(DISTINCT e.event_id) as total_events,
    COUNT(DISTINCT CASE WHEN e.approval_status = 'approved' THEN e.event_id END) as approved_events,
    COUNT(DISTINCT t.ticket_id) as total_tickets_sold,
    COALESCE(SUM(CAST(t.price AS DECIMAL)), 0) as total_revenue,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(DISTINCT r.rating_id) as total_ratings
FROM users u
LEFT JOIN events e ON u.user_id = e.organizer_id
LEFT JOIN tickets t ON e.event_id = t.event_id AND t.status != 'cancelled'
LEFT JOIN organizer_ratings r ON u.user_id = r.organizer_id
WHERE u.role = 'organizer'
GROUP BY u.user_id, u.name, u.email, u.is_verified;

-- View: Recent Activity Feed
CREATE OR REPLACE VIEW recent_activity_feed AS
(
    SELECT 
        'user_registered' as activity_type,
        user_id as entity_id,
        name as entity_name,
        NULL as secondary_info,
        created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 10
)
UNION ALL
(
    SELECT 
        'event_created' as activity_type,
        event_id as entity_id,
        title as entity_name,
        approval_status as secondary_info,
        created_at
    FROM events
    ORDER BY created_at DESC
    LIMIT 10
)
UNION ALL
(
    SELECT 
        'ticket_purchased' as activity_type,
        ticket_id as entity_id,
        CAST(ticket_id AS VARCHAR) as entity_name,
        ticket_type as secondary_info,
        created_at
    FROM tickets
    ORDER BY created_at DESC
    LIMIT 10
)
ORDER BY created_at DESC
LIMIT 50;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to automatically update event approval status
CREATE OR REPLACE FUNCTION check_event_auto_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- If event approval is not required, auto-approve
    IF (SELECT setting_value FROM system_settings WHERE setting_key = 'require_event_approval') = 'false' THEN
        NEW.approval_status = 'approved';
        NEW.approved_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-approval
DROP TRIGGER IF EXISTS event_auto_approval ON events;
CREATE TRIGGER event_auto_approval
    BEFORE INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION check_event_auto_approval();

-- Function to check user suspension
CREATE OR REPLACE FUNCTION check_user_suspension()
RETURNS TRIGGER AS $$
BEGIN
    -- If suspension period has expired, reactivate account
    IF NEW.account_status = 'suspended' AND NEW.suspended_until IS NOT NULL AND NEW.suspended_until < CURRENT_TIMESTAMP THEN
        NEW.account_status = 'active';
        NEW.suspension_reason = NULL;
        NEW.suspended_until = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for suspension check
DROP TRIGGER IF EXISTS user_suspension_check ON users;
CREATE TRIGGER user_suspension_check
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_user_suspension();

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify all tables and columns were created
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('events', 'users', 'admin_audit_logs', 'user_reports', 'system_settings', 'announcements', 'refund_requests', 'organizer_ratings')
ORDER BY table_name, ordinal_position;

-- Check views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'admin%' OR table_name LIKE '%performance%' OR table_name LIKE '%activity%';

-- Display platform stats
SELECT * FROM admin_platform_stats;

COMMENT ON TABLE admin_audit_logs IS 'Tracks all admin actions for accountability';
COMMENT ON TABLE user_reports IS 'User-submitted reports and complaints';
COMMENT ON TABLE system_settings IS 'Platform-wide configuration settings';
COMMENT ON TABLE announcements IS 'Platform announcements for users';
COMMENT ON TABLE refund_requests IS 'Ticket refund requests from users';
COMMENT ON TABLE organizer_ratings IS 'Attendee ratings for organizers';
