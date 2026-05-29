-- Add payment_gateway column to tickets table
-- This will help properly identify which payment gateway was used

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50);

-- Update existing records based on payment_token pattern
-- Khalti tokens typically contain transaction IDs from Khalti
-- eSewa tokens contain transaction UUIDs from eSewa
UPDATE tickets 
SET payment_gateway = CASE
    WHEN payment_token IS NULL AND (price = 0 OR payment_status = 'free') THEN 'free'
    WHEN payment_token IS NOT NULL AND payment_status = 'completed' THEN 'khalti'
    ELSE NULL
END
WHERE payment_gateway IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tickets_payment_gateway ON tickets(payment_gateway);
