-- ===================================
-- Custom Watermark Support
-- ===================================

-- Add custom_watermark_url column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS custom_watermark_url TEXT;

-- Add watermark settings column (stores position, opacity, etc.)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS watermark_settings JSONB DEFAULT '{
  "type": "text",
  "position": "bottom-right",
  "opacity": 0.8,
  "scale": 15,
  "enabled": true
}'::jsonb;

-- ===================================
-- Watermarks Storage Bucket
-- ===================================

-- Create watermarks bucket (public for easy access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'watermarks', 
    'watermarks', 
    true,
    5242880, -- 5MB max file size
    ARRAY['image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ===================================
-- Storage Policies for Watermarks
-- ===================================

-- Anyone can view watermarks
DROP POLICY IF EXISTS "Anyone can view watermarks" ON storage.objects;
CREATE POLICY "Anyone can view watermarks"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'watermarks');

-- Users can upload to their own folder
DROP POLICY IF EXISTS "Users can upload watermarks" ON storage.objects;
CREATE POLICY "Users can upload watermarks"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'watermarks');

-- Users can update their own watermarks
DROP POLICY IF EXISTS "Users can update watermarks" ON storage.objects;
CREATE POLICY "Users can update watermarks"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'watermarks');

-- Users can delete their own watermarks
DROP POLICY IF EXISTS "Users can delete watermarks" ON storage.objects;
CREATE POLICY "Users can delete watermarks"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'watermarks');

-- ===================================
-- Index for faster lookups
-- ===================================

CREATE INDEX IF NOT EXISTS idx_users_watermark 
    ON public.users(custom_watermark_url) 
    WHERE custom_watermark_url IS NOT NULL;
