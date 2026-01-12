-- 1. Create a Secure RPC Function to get System Metrics
-- This function queries internal Postgres tables to get real-time health data
-- SECURITY DEFINER allows it to run with higher privileges to see system views

CREATE OR REPLACE FUNCTION get_system_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
        'total_connections', (SELECT count(*) FROM pg_stat_activity),
        'idle_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'),
        'db_size_bytes', (SELECT pg_database_size(current_database())),
        'cache_hit_ratio', (
            SELECT 
                CASE WHEN sum(blks_hit) + sum(blks_read) = 0 THEN 0
                ELSE trunc((sum(blks_hit)::numeric / (sum(blks_hit) + sum(blks_read))) * 100, 2)
                END
            FROM pg_stat_database WHERE datname = current_database()
        ),
        'server_version', (SELECT version()),
        'uptime', (SELECT now() - pg_postmaster_start_time())
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 2. Create System Alerts Table
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged')),
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 3. RLS for System Alerts
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Only Super Admins can manage system alerts
CREATE POLICY "Super Admins can manage system alerts" ON public.system_alerts
    FOR ALL TO authenticated
    USING (
         EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- 4. Create Index for Alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON public.system_alerts(status);

-- 5. Insert some Initial "Mock" Alerts (to test the UI)
INSERT INTO public.system_alerts (title, message, severity, status, created_at)
SELECT 'High Memory Usage Detected', 'Database memory usage peaked at 85% for 5 minutes.', 'medium', 'active', NOW() - interval '2 hours'
WHERE NOT EXISTS (SELECT 1 FROM public.system_alerts WHERE title = 'High Memory Usage Detected');

INSERT INTO public.system_alerts (title, message, severity, status, created_at)
SELECT 'API Latency Spike', 'Response times for /api/v1/companies endpoint exceeded 500ms.', 'high', 'active', NOW() - interval '30 minutes'
WHERE NOT EXISTS (SELECT 1 FROM public.system_alerts WHERE title = 'API Latency Spike');
