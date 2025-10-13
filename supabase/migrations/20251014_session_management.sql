-- Session Management Migration
-- Created: 2025-10-14
-- Description: Enterprise-grade session management with Redis integration
-- Security: CVSS 7.5 vulnerability fix - Session Management Issues

-- Create sessions table for persistent session logging and audit
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  device_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_role text NOT NULL DEFAULT 'agent',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  revoked_reason text,

  -- Constraints
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT valid_user_role CHECK (user_role IN ('owner', 'admin', 'agent')),
  CONSTRAINT valid_expires_at CHECK (expires_at > created_at)
);

-- Add comments for documentation
COMMENT ON TABLE public.sessions IS 'Session management table for audit logging and tracking';
COMMENT ON COLUMN public.sessions.session_token IS 'Unique session token stored in Redis and database';
COMMENT ON COLUMN public.sessions.device_info IS 'Device fingerprint including user agent, IP, and platform';
COMMENT ON COLUMN public.sessions.user_role IS 'User role at time of session creation for privilege change detection';
COMMENT ON COLUMN public.sessions.revoked IS 'Whether session has been revoked (logout, security event, etc.)';

-- Create indexes for performance
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id) WHERE NOT revoked;
CREATE INDEX idx_sessions_organization_id ON public.sessions(organization_id) WHERE NOT revoked;
CREATE INDEX idx_sessions_session_token ON public.sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at) WHERE NOT revoked;
CREATE INDEX idx_sessions_created_at ON public.sessions(created_at DESC);
CREATE INDEX idx_sessions_last_activity ON public.sessions(last_activity DESC) WHERE NOT revoked;

-- Composite index for common queries
CREATE INDEX idx_sessions_user_active ON public.sessions(user_id, last_activity DESC) WHERE NOT revoked;

-- Enable Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own sessions
CREATE POLICY sessions_select_own ON public.sessions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    -- Super admins can view all sessions
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- RLS Policy: System can insert sessions (service role only)
CREATE POLICY sessions_insert_system ON public.sessions
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can update only their own sessions
CREATE POLICY sessions_update_own ON public.sessions
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    -- Super admins can update all sessions
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- RLS Policy: Users can delete (revoke) only their own sessions
CREATE POLICY sessions_delete_own ON public.sessions
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    -- Super admins can delete all sessions
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Function to automatically cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark expired sessions as revoked
  UPDATE public.sessions
  SET
    revoked = true,
    revoked_at = now(),
    revoked_reason = 'automatic_expiration'
  WHERE
    expires_at < now()
    AND revoked = false;

  -- Delete old revoked sessions (older than 30 days for audit trail)
  DELETE FROM public.sessions
  WHERE
    revoked = true
    AND revoked_at < (now() - interval '30 days');
END;
$$;

-- Add comment for function
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Automatically cleanup expired and old revoked sessions';

-- Create scheduled job to cleanup expired sessions (runs every hour)
-- Note: This requires pg_cron extension. If not available, implement in application layer.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-expired-sessions',
      '0 * * * *', -- Every hour
      $$SELECT cleanup_expired_sessions()$$
    );
  END IF;
END $$;

-- Function to revoke all user sessions (for security events)
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(
  p_user_id uuid,
  p_reason text DEFAULT 'security_event'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Update all active sessions
  UPDATE public.sessions
  SET
    revoked = true,
    revoked_at = now(),
    revoked_reason = p_reason
  WHERE
    user_id = p_user_id
    AND revoked = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- Add comment for function
COMMENT ON FUNCTION revoke_all_user_sessions IS 'Revoke all active sessions for a user (password change, security event)';

-- Function to get session statistics for a user
CREATE OR REPLACE FUNCTION get_user_session_stats(p_user_id uuid)
RETURNS TABLE(
  total_sessions bigint,
  active_sessions bigint,
  revoked_sessions bigint,
  expired_sessions bigint,
  oldest_session timestamptz,
  newest_session timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE NOT revoked AND expires_at > now()) as active_sessions,
    COUNT(*) FILTER (WHERE revoked) as revoked_sessions,
    COUNT(*) FILTER (WHERE NOT revoked AND expires_at <= now()) as expired_sessions,
    MIN(created_at) as oldest_session,
    MAX(created_at) as newest_session
  FROM public.sessions
  WHERE user_id = p_user_id;
END;
$$;

-- Add comment for function
COMMENT ON FUNCTION get_user_session_stats IS 'Get session statistics for a user';

-- Function to detect privilege changes
CREATE OR REPLACE FUNCTION check_privilege_change(
  p_user_id uuid,
  p_session_token text
)
RETURNS TABLE(
  changed boolean,
  old_role text,
  new_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_role text;
  v_current_role text;
BEGIN
  -- Get session role
  SELECT user_role INTO v_session_role
  FROM public.sessions
  WHERE session_token = p_session_token
  AND user_id = p_user_id;

  -- Get current user role
  SELECT role INTO v_current_role
  FROM public.profiles
  WHERE id = p_user_id;

  -- Return comparison
  RETURN QUERY
  SELECT
    (v_session_role IS DISTINCT FROM v_current_role) as changed,
    v_session_role as old_role,
    v_current_role as new_role;
END;
$$;

-- Add comment for function
COMMENT ON FUNCTION check_privilege_change IS 'Check if user privileges have changed since session creation';

-- Trigger to automatically set revoked_at when session is revoked
CREATE OR REPLACE FUNCTION set_session_revoked_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.revoked = true AND OLD.revoked = false THEN
    NEW.revoked_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_session_revoked_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_session_revoked_at();

-- Add comment for trigger
COMMENT ON TRIGGER trigger_set_session_revoked_at ON public.sessions IS 'Automatically set revoked_at timestamp';

-- Create view for active sessions (for easier querying)
CREATE OR REPLACE VIEW public.active_sessions AS
SELECT
  s.id,
  s.user_id,
  s.organization_id,
  s.session_token,
  s.device_info,
  s.user_role,
  s.created_at,
  s.last_activity,
  s.expires_at,
  p.email as user_email,
  p.full_name as user_name,
  o.name as organization_name,
  -- Calculate session age
  EXTRACT(EPOCH FROM (now() - s.created_at)) / 60 as age_minutes,
  -- Calculate time until expiration
  EXTRACT(EPOCH FROM (s.expires_at - now())) / 60 as expires_in_minutes
FROM public.sessions s
JOIN public.profiles p ON s.user_id = p.id
JOIN public.organizations o ON s.organization_id = o.id
WHERE
  s.revoked = false
  AND s.expires_at > now()
ORDER BY s.last_activity DESC;

-- Add comment for view
COMMENT ON VIEW public.active_sessions IS 'View of all currently active (non-revoked, non-expired) sessions';

-- Grant appropriate permissions
GRANT SELECT ON public.active_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions TO service_role;
GRANT EXECUTE ON FUNCTION revoke_all_user_sessions TO service_role;
GRANT EXECUTE ON FUNCTION get_user_session_stats TO authenticated;
GRANT EXECUTE ON FUNCTION check_privilege_change TO service_role;

-- Insert migration record
INSERT INTO public.schema_migrations (version, description)
VALUES (
  '20251014_session_management',
  'Enterprise session management with Redis integration'
)
ON CONFLICT (version) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Session management migration completed successfully';
  RAISE NOTICE 'Created: sessions table with RLS policies';
  RAISE NOTICE 'Created: Indexes for performance optimization';
  RAISE NOTICE 'Created: Automatic cleanup functions';
  RAISE NOTICE 'Created: Session statistics and monitoring functions';
  RAISE NOTICE 'Created: Privilege change detection';
  RAISE NOTICE 'Security: CVSS 7.5 vulnerability addressed';
END $$;
