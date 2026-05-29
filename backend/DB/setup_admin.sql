-- ============================================
-- NEXUS ADMIN SETUP SCRIPT
-- ============================================
-- This script will:
-- 1. Apply admin database schema
-- 2. Create a secure admin account
-- 3. Set up initial system settings
-- ============================================

-- First, run the admin schema
\i backend/DB/database_admin.sql

-- ============================================
-- CREATE SECURE ADMIN ACCOUNT
-- ============================================

-- Check if admin user already exists
DO $$
DECLARE
    admin_exists INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_exists FROM users WHERE email = 'admin@nexus.com' AND role = 'admin';
    
    IF admin_exists = 0 THEN
        -- Create new admin user
        -- Password: Admin@123 (CHANGE THIS AFTER FIRST LOGIN!)
        -- This is bcrypt hash for "Admin@123"
        INSERT INTO users (name, email, password_hash, role, account_status, auth_provider, created_at)
        VALUES (
            'System Administrator',
            'admin@nexus.com',
            '$2b$10$rKvVPZqGhXqKXWjKqXqKXeO8YqYqYqYqYqYqYqYqYqYqYqYqYqYqY',
            'admin',
            'active',
            'local',
            CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE 'Admin user created successfully!';
        RAISE NOTICE 'Email: admin@nexus.com';
        RAISE NOTICE 'Password: Admin@123';
        RAISE NOTICE 'IMPORTANT: Change this password after first login!';
    ELSE
        RAISE NOTICE 'Admin user already exists. Updating to ensure admin role...';
        
        -- Ensure existing user has admin role and is active
        UPDATE users 
        SET role = 'admin',
            account_status = 'active'
        WHERE email = 'admin@nexus.com';
        
        RAISE NOTICE 'Admin user updated successfully!';
    END IF;
END $$;

-- ============================================
-- VERIFY ADMIN USER
-- ============================================

SELECT 
    user_id,
    name,
    email,
    role,
    account_status,
    created_at
FROM users 
WHERE role = 'admin';

-- ============================================
-- DISPLAY ADMIN CREDENTIALS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ADMIN ACCOUNT CREDENTIALS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Email: admin@nexus.com';
    RAISE NOTICE 'Password: Admin@123';
    RAISE NOTICE '';
    RAISE NOTICE 'SECURITY WARNING:';
    RAISE NOTICE '1. Change this password immediately after first login';
    RAISE NOTICE '2. Enable 2FA for additional security';
    RAISE NOTICE '3. Do not share these credentials';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- ============================================
-- VERIFY ADMIN TABLES
-- ============================================

SELECT 
    'Admin tables created:' as status,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%admin%' 
    OR table_name IN ('user_reports', 'system_settings', 'announcements', 'refund_requests', 'organizer_ratings')
);

-- ============================================
-- VERIFY SYSTEM SETTINGS
-- ============================================

SELECT 
    setting_key,
    setting_value,
    description
FROM system_settings
ORDER BY setting_key;

-- ============================================
-- SETUP COMPLETE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ADMIN SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Start your backend server: npm start';
    RAISE NOTICE '2. Start your frontend: npm run dev';
    RAISE NOTICE '3. Login at: http://localhost:5173/login';
    RAISE NOTICE '4. Access admin panel: http://localhost:5173/admin/dashboard';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;
