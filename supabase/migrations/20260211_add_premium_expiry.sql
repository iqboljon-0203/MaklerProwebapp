-- Add premium_expires_at column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Create an index for faster queries on expiration
CREATE INDEX IF NOT EXISTS idx_users_premium_expires_at ON public.users(premium_expires_at);
