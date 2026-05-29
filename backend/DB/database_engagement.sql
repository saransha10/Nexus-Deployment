-- Engagement & Interaction System Tables
-- Run this after your main database.sql

-- Messages Table (Live Chat)
CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Polls Table
CREATE TABLE polls (
    poll_id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
    question VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Poll Options Table
CREATE TABLE poll_options (
    option_id SERIAL PRIMARY KEY,
    poll_id INTEGER REFERENCES polls(poll_id) ON DELETE CASCADE,
    option_text VARCHAR(200) NOT NULL,
    vote_count INTEGER DEFAULT 0
);

-- Poll Votes Table
CREATE TABLE poll_votes (
    vote_id SERIAL PRIMARY KEY,
    option_id INTEGER REFERENCES poll_options(option_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    poll_id INTEGER REFERENCES polls(poll_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, user_id) -- One vote per user per poll
);

-- Q&A Table
CREATE TABLE questions (
    question_id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    answered_by INTEGER REFERENCES users(user_id),
    is_answered BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_messages_event_id ON messages(event_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_polls_event_id ON polls(event_id);
CREATE INDEX idx_questions_event_id ON questions(event_id);
CREATE INDEX idx_poll_votes_poll_id ON poll_votes(poll_id);

-- Sample data for testing
INSERT INTO messages (user_id, event_id, content) VALUES
(1, 1, 'Welcome to the event!'),
(2, 1, 'Excited to be here!'),
(1, 1, 'Let''s get started with the presentation.');

INSERT INTO polls (event_id, question, created_by) VALUES
(1, 'What programming language do you prefer?', 1);

INSERT INTO poll_options (poll_id, option_text) VALUES
(1, 'JavaScript'),
(1, 'Python'),
(1, 'Java'),
(1, 'Other');

INSERT INTO questions (event_id, user_id, question_text, is_approved) VALUES
(1, 2, 'What are the prerequisites for this workshop?', TRUE),
(1, 3, 'Will the recording be available later?', TRUE);