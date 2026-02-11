-- Migration to add language_code to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'uz';
