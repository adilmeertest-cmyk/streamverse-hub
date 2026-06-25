-- Create sync_logs table for TMDb content synchronization tracking
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL CHECK (sync_type IN ('genres', 'movie', 'tv', 'trending_movies', 'trending_tv', 'popular_movies', 'popular_tv')),
  status text NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  items_synced integer DEFAULT 0,
  items_failed integer DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create index on sync_type for filtering
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON public.sync_logs(sync_type);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs(status);

-- Create index on started_at for sorting
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at DESC);

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read sync logs
CREATE POLICY IF NOT EXISTS "Admins can read sync logs"
  ON public.sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'content_manager')
    )
  );

-- Allow admins to insert sync logs (for sync operations)
CREATE POLICY IF NOT EXISTS "Admins can insert sync logs"
  ON public.sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'content_manager')
    )
  );

-- Allow admins to update sync logs (for status updates)
CREATE POLICY IF NOT EXISTS "Admins can update sync logs"
  ON public.sync_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'content_manager')
    )
  );
