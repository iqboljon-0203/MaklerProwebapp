
-- ==========================================
-- Security Hardening: Backend-Only Writes
-- ==========================================

-- 1. Enable Row Level Security (RLS) on 'users' table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- 2. Grant Full Access to Service Role (Backend API / Bot)
-- This allows our API and Bot to do everything.
DROP POLICY IF EXISTS "Service Role Full Access" ON "users";
CREATE POLICY "Service Role Full Access" ON "users"
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Restrict Anon (Frontend) to Read-Only
-- Frontend can SELECT (read) but CANNOT INSERT/UPDATE/DELETE.
-- User creation/updates must go through /api/user (which uses service_role).
DROP POLICY IF EXISTS "Public Read Access" ON "users";
CREATE POLICY "Public Read Access" ON "users"
AS PERMISSIVE FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Update 'increment_daily_usage' function to bypass RLS
-- This is critical so that frontend can trigger usage increment without write access.
-- SECURITY DEFINER makes it run with the privileges of the creator (Admin).
CREATE OR REPLACE FUNCTION increment_daily_usage(user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE "users"
  SET daily_generations = daily_generations + 1,
      updated_at = NOW()
  WHERE telegram_id = user_id;
END;
$$;
