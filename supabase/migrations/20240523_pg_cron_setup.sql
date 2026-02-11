-- ===================================
-- pg_cron Setup for Automated Storage Cleanup
-- ===================================
-- 
-- Prerequisites:
-- 1. Enable pg_cron extension in Supabase Dashboard:
--    Database > Extensions > Search "pg_cron" > Enable
--
-- 2. Edge Function must be deployed:
--    supabase functions deploy storage-cleanup
--
-- 3. Set CRON_SECRET in Edge Function secrets:
--    supabase secrets set CRON_SECRET=your_secret_here
--
-- ===================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- ===================================
-- Schedule: Daily Cleanup (DRY-RUN at 3 AM)
-- ===================================

-- First, schedule a dry-run to see what would be deleted
SELECT cron.schedule(
    'storage-cleanup-dry-run',
    '0 3 * * *',  -- Every day at 3:00 AM UTC
    $$
    SELECT net.http_post(
        url := 'https://otgrmquipyhwwfbicgbq.supabase.co/functions/v1/storage-cleanup',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
            'X-Cron-Secret', current_setting('app.settings.cron_secret')
        ),
        body := jsonb_build_object(
            'dryRun', true,
            'maxAgeHours', 24
        )
    );
    $$
);

-- ===================================
-- Schedule: Weekly LIVE Cleanup (Sunday 4 AM)
-- ===================================

-- Live cleanup runs weekly (after reviewing dry-run logs)
SELECT cron.schedule(
    'storage-cleanup-live',
    '0 4 * * 0',  -- Every Sunday at 4:00 AM UTC
    $$
    SELECT net.http_post(
        url := 'https://otgrmquipyhwwfbicgbq.supabase.co/functions/v1/storage-cleanup',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
            'X-Cron-Secret', current_setting('app.settings.cron_secret')
        ),
        body := jsonb_build_object(
            'dryRun', false,
            'maxAgeHours', 48
        )
    );
    $$
);

-- ===================================
-- View Scheduled Jobs
-- ===================================

-- Check scheduled jobs
SELECT * FROM cron.job;

-- ===================================
-- Manage Jobs
-- ===================================

-- Disable a job temporarily
-- SELECT cron.alter_job(job_id, active := false) FROM cron.job WHERE jobname = 'storage-cleanup-live';

-- Re-enable a job
-- SELECT cron.alter_job(job_id, active := true) FROM cron.job WHERE jobname = 'storage-cleanup-live';

-- Delete a job
-- SELECT cron.unschedule('storage-cleanup-dry-run');
-- SELECT cron.unschedule('storage-cleanup-live');

-- ===================================
-- View Job History
-- ===================================

-- Check recent job runs
SELECT 
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
