-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid(), -- Internal ID
    telegram_id TEXT PRIMARY KEY, -- Telegram ID as main identifier
    is_premium BOOLEAN DEFAULT FALSE,
    daily_generations INTEGER DEFAULT 0,
    max_daily_generations INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add premium_until column to users if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(telegram_id), -- Assuming telegram_id is the key used in users table
    provider TEXT NOT NULL CHECK (provider IN ('click', 'payme', 'test')),
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'UZS',
    external_id TEXT, -- ID from the payment provider
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON public.payments(external_id);

-- Optional: Create a function to check premium status automatically
-- (This allows you to just check is_premium() in RLS policies without manual updates)
CREATE OR REPLACE FUNCTION public.is_user_premium(check_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE telegram_id = check_user_id
    AND is_premium = true
    AND (premium_until IS NULL OR premium_until > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function to increment daily usage (Required for AI Logic)
CREATE OR REPLACE FUNCTION public.increment_daily_usage(user_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET daily_generations = daily_generations + 1
  WHERE telegram_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (Recommended)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow public read access to users (needed since we don't use Supabase Auth for simple Telegram login)
-- WARNING: In a production app with sensitive data, you should implement proper Authentication.
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.users FOR UPDATE USING (true);

