-- Nexus Database Schema - Users Table
-- Run this in DBeaver or psql to create the database structure

-- Create Database (run this first)
-- CREATE DATABASE nexus_db;

-- Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'attendee' CHECK (role IN ('admin', 'organizer', 'attendee')),
    google_id VARCHAR(255) UNIQUE,
    profile_picture VARCHAR(500),
    auth_provider VARCHAR(50) DEFAULT 'local' CHECK (auth_provider IN ('local', 'google')),
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster email lookups
CREATE INDEX idx_users_email ON users(email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@nexus.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'admin'),
('Test Organizer', 'organizer@nexus.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'organizer'),
('Test Attendee', 'attendee@nexus.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'attendee');

-- Verify table creation
SELECT * FROM users;
-- Add new columns for 2FA and password reset
-- Run this if you already have the users table

-- Add 2FA columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);

-- Add password reset columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

