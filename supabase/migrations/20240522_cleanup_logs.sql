-- ===================================
-- Cleanup Logs Table
-- ===================================

CREATE TABLE IF NOT EXISTS public.cleanup_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dry_run BOOLEAN DEFAULT true,
    scanned INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    deleted_files TEXT[] DEFAULT '{}',
    error_details JSONB DEFAULT '[]',
    execution_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying logs
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_created_at 
    ON public.cleanup_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access
DROP POLICY IF EXISTS "Service role access cleanup logs" ON public.cleanup_logs;
CREATE POLICY "Service role access cleanup logs"
    ON public.cleanup_logs
    FOR ALL
    USING (true);

-- ===================================
-- Storage Statistics View
-- ===================================

CREATE OR REPLACE VIEW public.storage_stats AS
SELECT 
    bucket_id,
    COUNT(*) as file_count,
    SUM((metadata->>'size')::bigint) as total_bytes,
    pg_size_pretty(SUM((metadata->>'size')::bigint)) as total_size,
    MIN(created_at) as oldest_file,
    MAX(created_at) as newest_file
FROM storage.objects
GROUP BY bucket_id;

-- ===================================
-- Orphaned Files View (Files not in database)
-- ===================================

-- This view helps identify potentially orphaned files
-- Run manually to check before cleanup
CREATE OR REPLACE VIEW public.orphaned_files_candidates AS
SELECT 
    o.bucket_id,
    o.name as file_path,
    o.created_at,
    pg_size_pretty((o.metadata->>'size')::bigint) as file_size,
    CASE 
        WHEN o.name LIKE 'temp/%' THEN 'temp'
        WHEN o.name LIKE 'slideshow/%' THEN 'slideshow'
        WHEN o.name LIKE 'processing/%' THEN 'processing'
        ELSE 'other'
    END as folder_type,
    EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 3600 as age_hours
FROM storage.objects o
WHERE 
    -- Only temp folders
    (o.name LIKE 'temp/%' OR o.name LIKE 'slideshow/%' OR o.name LIKE 'processing/%')
    -- Older than 24 hours
    AND o.created_at < NOW() - INTERVAL '24 hours'
ORDER BY o.created_at ASC;

-- ===================================
-- Cleanup Summary View
-- ===================================

CREATE OR REPLACE VIEW public.cleanup_summary AS
SELECT 
    DATE(created_at) as cleanup_date,
    COUNT(*) as runs,
    SUM(CASE WHEN dry_run THEN 1 ELSE 0 END) as dry_runs,
    SUM(CASE WHEN NOT dry_run THEN 1 ELSE 0 END) as live_runs,
    SUM(scanned) as total_scanned,
    SUM(deleted) as total_deleted,
    SUM(skipped) as total_skipped,
    SUM(errors) as total_errors,
    AVG(execution_time_ms)::integer as avg_execution_ms
FROM public.cleanup_logs
GROUP BY DATE(created_at)
ORDER BY cleanup_date DESC;
