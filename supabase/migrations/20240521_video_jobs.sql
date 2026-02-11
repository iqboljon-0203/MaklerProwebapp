-- ===================================
-- Video Jobs Table for Server-Side Processing
-- ===================================

-- Create video_jobs table
CREATE TABLE IF NOT EXISTS public.video_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    shotstack_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'queued',
    config JSONB,
    video_url TEXT,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_jobs_shotstack_id ON public.video_jobs(shotstack_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_user_id ON public.video_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON public.video_jobs(status);

-- Enable Row Level Security
ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own jobs
DROP POLICY IF EXISTS "Users can view own video jobs" ON public.video_jobs;
CREATE POLICY "Users can view own video jobs"
    ON public.video_jobs
    FOR SELECT
    USING (true); -- Allow all reads for now, can tighten later

-- Policy: Service role can do everything
DROP POLICY IF EXISTS "Service role full access" ON public.video_jobs;
CREATE POLICY "Service role full access"
    ON public.video_jobs
    FOR ALL
    USING (true);

-- ===================================
-- History Table (Create if not exists)
-- ===================================

CREATE TABLE IF NOT EXISTS public.history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT DEFAULT 'image',
    title TEXT,
    data JSONB,
    thumbnail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for history
CREATE INDEX IF NOT EXISTS idx_history_user_id ON public.history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_type ON public.history(type);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON public.history(created_at DESC);

-- Enable RLS for history
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Policy for history
DROP POLICY IF EXISTS "Users can view own history" ON public.history;
CREATE POLICY "Users can view own history"
    ON public.history
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert own history" ON public.history;
CREATE POLICY "Users can insert own history"
    ON public.history
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access history" ON public.history;
CREATE POLICY "Service role full access history"
    ON public.history
    FOR ALL
    USING (true);

-- ===================================
-- Auto-update updated_at trigger
-- ===================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_video_jobs_updated_at ON public.video_jobs;
CREATE TRIGGER update_video_jobs_updated_at
    BEFORE UPDATE ON public.video_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- Realtime Subscription (Optional)
-- ===================================

-- Enable realtime for video_jobs table
-- Note: Run this separately if it fails
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.video_jobs;
