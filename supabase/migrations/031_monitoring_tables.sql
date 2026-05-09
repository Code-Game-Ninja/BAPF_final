-- ============================================================================
-- Monitoring & Error Tracking Tables
-- Created: 2025-01-XX
-- ============================================================================

-- ============================================================================
-- ERROR LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL CHECK (severity IN ('fatal', 'error', 'warning', 'info', 'debug')),
  message TEXT NOT NULL,
  stack TEXT,
  endpoint TEXT,
  method TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  request_data JSONB,
  response_data JSONB,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for error_logs
CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_endpoint ON error_logs(endpoint);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);

-- ============================================================================
-- PERFORMANCE LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operation TEXT NOT NULL,
  duration INTEGER NOT NULL, -- milliseconds
  endpoint TEXT,
  method TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance_logs
CREATE INDEX idx_performance_logs_timestamp ON performance_logs(timestamp DESC);
CREATE INDEX idx_performance_logs_operation ON performance_logs(operation);
CREATE INDEX idx_performance_logs_endpoint ON performance_logs(endpoint);
CREATE INDEX idx_performance_logs_duration ON performance_logs(duration DESC);
CREATE INDEX idx_performance_logs_user_id ON performance_logs(user_id);
CREATE INDEX idx_performance_logs_created_at ON performance_logs(created_at DESC);

-- ============================================================================
-- API METRICS TABLE (Aggregated stats)
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour < 24),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  avg_duration INTEGER, -- milliseconds
  min_duration INTEGER,
  max_duration INTEGER,
  p50_duration INTEGER, -- median
  p95_duration INTEGER,
  p99_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, hour, endpoint, method)
);

-- Indexes for api_metrics
CREATE INDEX idx_api_metrics_date ON api_metrics(date DESC);
CREATE INDEX idx_api_metrics_endpoint ON api_metrics(endpoint);
CREATE INDEX idx_api_metrics_method ON api_metrics(method);

-- ============================================================================
-- SYSTEM HEALTH TABLE (Overall system status)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  cpu_usage DECIMAL(5,2), -- percentage
  memory_usage DECIMAL(5,2), -- percentage
  disk_usage DECIMAL(5,2), -- percentage
  active_users INTEGER,
  total_errors_last_hour INTEGER,
  avg_response_time INTEGER, -- milliseconds
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for system_health
CREATE INDEX idx_system_health_timestamp ON system_health(timestamp DESC);
CREATE INDEX idx_system_health_status ON system_health(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Policies for error_logs (Admin and Manager can view)
CREATE POLICY "Admin and Manager can view error logs"
  ON error_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin can insert error logs"
  ON error_logs FOR INSERT
  WITH CHECK (true); -- Allow system to insert

CREATE POLICY "Admin can update error logs"
  ON error_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policies for performance_logs (Admin and Manager can view)
CREATE POLICY "Admin and Manager can view performance logs"
  ON performance_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin can insert performance logs"
  ON performance_logs FOR INSERT
  WITH CHECK (true); -- Allow system to insert

-- Policies for api_metrics (Admin and Manager can view)
CREATE POLICY "Admin and Manager can view api metrics"
  ON api_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can insert/update api metrics"
  ON api_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for system_health (Admin and Manager can view)
CREATE POLICY "Admin and Manager can view system health"
  ON system_health FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can insert system health"
  ON system_health FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to clean up old logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Delete error logs older than 30 days
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Delete performance logs older than 30 days
  DELETE FROM performance_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Delete system health logs older than 30 days
  DELETE FROM system_health
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Keep api_metrics for 90 days
  DELETE FROM api_metrics
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get error summary
CREATE OR REPLACE FUNCTION get_error_summary(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  severity TEXT,
  count BIGINT,
  resolved_count BIGINT,
  unresolved_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.severity,
    COUNT(*)::BIGINT as count,
    COUNT(*) FILTER (WHERE e.resolved = true)::BIGINT as resolved_count,
    COUNT(*) FILTER (WHERE e.resolved = false)::BIGINT as unresolved_count
  FROM error_logs e
  WHERE e.timestamp BETWEEN start_date AND end_date
  GROUP BY e.severity
  ORDER BY
    CASE e.severity
      WHEN 'fatal' THEN 1
      WHEN 'error' THEN 2
      WHEN 'warning' THEN 3
      WHEN 'info' THEN 4
      WHEN 'debug' THEN 5
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get performance summary
CREATE OR REPLACE FUNCTION get_performance_summary(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  operation TEXT,
  count BIGINT,
  avg_duration NUMERIC,
  min_duration INTEGER,
  max_duration INTEGER,
  p95_duration NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.operation,
    COUNT(*)::BIGINT as count,
    ROUND(AVG(p.duration)::NUMERIC, 2) as avg_duration,
    MIN(p.duration) as min_duration,
    MAX(p.duration) as max_duration,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY p.duration)::NUMERIC, 2) as p95_duration
  FROM performance_logs p
  WHERE p.timestamp BETWEEN start_date AND end_date
  GROUP BY p.operation
  ORDER BY avg_duration DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE error_logs IS 'Stores all application errors for monitoring and debugging';
COMMENT ON TABLE performance_logs IS 'Stores performance metrics for all operations';
COMMENT ON TABLE api_metrics IS 'Aggregated API metrics by hour';
COMMENT ON TABLE system_health IS 'Overall system health status';

COMMENT ON FUNCTION cleanup_old_logs() IS 'Cleans up logs older than retention period';
COMMENT ON FUNCTION get_error_summary(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns error summary for date range';
COMMENT ON FUNCTION get_performance_summary(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns performance summary for date range';
