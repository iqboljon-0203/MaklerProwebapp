-- ===================================
-- Share Analytics Table
-- ===================================

CREATE TABLE IF NOT EXISTS public.share_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id TEXT NOT NULL,
    platform TEXT NOT NULL, -- 'telegram', 'olx', 'instagram', 'copy'
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_share_analytics_telegram_id 
    ON public.share_analytics(telegram_id);
CREATE INDEX IF NOT EXISTS idx_share_analytics_platform 
    ON public.share_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_share_analytics_created_at 
    ON public.share_analytics(created_at DESC);

-- Enable RLS
ALTER TABLE public.share_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert own events
DROP POLICY IF EXISTS "Users can insert own share events" ON public.share_analytics;
CREATE POLICY "Users can insert own share events"
    ON public.share_analytics
    FOR INSERT
    WITH CHECK (true);

-- Policy: Service role can read all
DROP POLICY IF EXISTS "Service role can read share analytics" ON public.share_analytics;
CREATE POLICY "Service role can read share analytics"
    ON public.share_analytics
    FOR SELECT
    USING (true);

-- ===================================
-- Add Share Counters to Users Table
-- ===================================

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS telegram_shares INTEGER DEFAULT 0;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS olx_shares INTEGER DEFAULT 0;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS instagram_shares INTEGER DEFAULT 0;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS copy_shares INTEGER DEFAULT 0;

-- ===================================
-- Increment Share Count Function
-- ===================================

CREATE OR REPLACE FUNCTION increment_share_count(
    p_telegram_id TEXT,
    p_platform TEXT
) RETURNS void AS $$
BEGIN
    CASE p_platform
        WHEN 'telegram' THEN
            UPDATE public.users 
            SET telegram_shares = COALESCE(telegram_shares, 0) + 1
            WHERE telegram_id = p_telegram_id;
        WHEN 'olx' THEN
            UPDATE public.users 
            SET olx_shares = COALESCE(olx_shares, 0) + 1
            WHERE telegram_id = p_telegram_id;
        WHEN 'instagram' THEN
            UPDATE public.users 
            SET instagram_shares = COALESCE(instagram_shares, 0) + 1
            WHERE telegram_id = p_telegram_id;
        WHEN 'copy' THEN
            UPDATE public.users 
            SET copy_shares = COALESCE(copy_shares, 0) + 1
            WHERE telegram_id = p_telegram_id;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Analytics Summary View
-- ===================================

CREATE OR REPLACE VIEW public.share_analytics_summary AS
SELECT 
    platform,
    COUNT(*) as total_shares,
    COUNT(DISTINCT telegram_id) as unique_users,
    COUNT(*) FILTER (WHERE success = true) as successful_shares,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7_days,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as last_30_days
FROM public.share_analytics
GROUP BY platform
ORDER BY total_shares DESC;

-- ===================================
-- Daily Share Stats View
-- ===================================

CREATE OR REPLACE VIEW public.daily_share_stats AS
SELECT 
    DATE(created_at) as share_date,
    platform,
    COUNT(*) as shares
FROM public.share_analytics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), platform
ORDER BY share_date DESC, shares DESC;
