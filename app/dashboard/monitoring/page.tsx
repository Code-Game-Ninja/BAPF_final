"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  XCircle,
  Zap,
  Database,
  Server,
  Users,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { pageTransition } from "@/lib/helpers/animations";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ErrorSummary {
  severity: string;
  count: number;
  resolved_count: number;
  unresolved_count: number;
}

interface PerformanceSummary {
  operation: string;
  count: number;
  avg_duration: number;
  min_duration: number;
  max_duration: number;
  p95_duration: number;
}

interface RecentError {
  id: string;
  timestamp: string;
  severity: string;
  message: string;
  endpoint: string;
  method: string;
  user_email: string;
  resolved: boolean;
}

interface SystemStats {
  total_errors_today: number;
  unresolved_errors: number;
  avg_response_time: number;
  slow_requests_count: number;
  total_requests_today: number;
  error_rate: number;
}

export default function MonitoringDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorSummary, setErrorSummary] = useState<ErrorSummary[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary[]>([]);
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    total_errors_today: 0,
    unresolved_errors: 0,
    avg_response_time: 0,
    slow_requests_count: 0,
    total_requests_today: 0,
    error_rate: 0,
  });

  const fetchData = async () => {
    try {
      // Fetch error summary
      const { data: errors } = await supabase.rpc('get_error_summary', {
        start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString(),
      });
      if (errors) setErrorSummary(errors as ErrorSummary[]);

      // Fetch performance summary
      const { data: perf } = await supabase.rpc('get_performance_summary', {
        start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString(),
      });
      if (perf) setPerformanceSummary((perf as PerformanceSummary[]).slice(0, 10)); // Top 10

      // Fetch recent errors
      const { data: recent } = await supabase
        .from('error_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
      if (recent) setRecentErrors(recent as RecentError[]);

      // Calculate system stats
      const totalErrors = errors?.reduce((sum: number, e: ErrorSummary) => sum + e.count, 0) || 0;
      const unresolvedErrors = errors?.reduce((sum: number, e: ErrorSummary) => sum + e.unresolved_count, 0) || 0;
      
      const { data: perfLogs } = await supabase
        .from('performance_logs')
        .select('duration')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      const castPerfLogs = (perfLogs || []) as { duration: number }[];
      
      const avgResponseTime = castPerfLogs.length > 0
        ? Math.round(castPerfLogs.reduce((sum: number, p: { duration: number }) => sum + p.duration, 0) / castPerfLogs.length)
        : 0;
      
      const slowRequests = castPerfLogs.filter((p: { duration: number }) => p.duration > 1000).length || 0;
      const totalRequests = castPerfLogs.length || 0;
      const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

      setSystemStats({
        total_errors_today: totalErrors,
        unresolved_errors: unresolvedErrors,
        avg_response_time: avgResponseTime,
        slow_requests_count: slowRequests,
        total_requests_today: totalRequests,
        error_rate: Math.round(errorRate * 100) / 100,
      });
    } catch (error: unknown) {
      console.error('[Monitoring] Failed to fetch data:', error);
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'fatal': return 'text-red-600 bg-red-50 border-red-200';
      case 'error': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'fatal': return <XCircle className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      default: return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-8 pb-20"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Real-time application health and performance metrics
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-3xl font-bold mt-2">{systemStats.total_requests_today.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            </div>
            <Activity className="h-10 w-10 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
              <p className="text-3xl font-bold mt-2">{systemStats.avg_response_time}ms</p>
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                {systemStats.avg_response_time < 500 ? 'Excellent' : 'Good'}
              </p>
            </div>
            <Zap className="h-10 w-10 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Errors</p>
              <p className="text-3xl font-bold mt-2">{systemStats.total_errors_today}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {systemStats.unresolved_errors} unresolved
              </p>
            </div>
            <AlertTriangle className={`h-10 w-10 ${systemStats.total_errors_today > 10 ? 'text-red-500' : 'text-yellow-500'}`} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Error Rate</p>
              <p className="text-3xl font-bold mt-2">{systemStats.error_rate}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {systemStats.slow_requests_count} slow requests
              </p>
            </div>
            <TrendingUp className={`h-10 w-10 ${systemStats.error_rate > 5 ? 'text-red-500' : 'text-green-500'}`} />
          </div>
        </Card>
      </div>

      {/* Error Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Error Summary (Last 24 Hours)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {errorSummary.map((error) => (
            <div
              key={error.severity}
              className={`p-4 rounded-lg border ${getSeverityColor(error.severity)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium uppercase">{error.severity}</span>
                {getSeverityIcon(error.severity)}
              </div>
              <p className="text-2xl font-bold">{error.count}</p>
              <p className="text-xs mt-1">
                {error.resolved_count} resolved • {error.unresolved_count} pending
              </p>
            </div>
          ))}
          {errorSummary.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No errors in the last 24 hours! 🎉</p>
            </div>
          )}
        </div>
      </Card>

      {/* Performance Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Zap className="h-5 w-5 mr-2" />
          Slowest Operations (Last 24 Hours)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Operation</th>
                <th className="text-right py-3 px-4 font-medium">Count</th>
                <th className="text-right py-3 px-4 font-medium">Avg</th>
                <th className="text-right py-3 px-4 font-medium">Min</th>
                <th className="text-right py-3 px-4 font-medium">Max</th>
                <th className="text-right py-3 px-4 font-medium">P95</th>
              </tr>
            </thead>
            <tbody>
              {performanceSummary.map((perf, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4 font-mono text-sm">{perf.operation}</td>
                  <td className="py-3 px-4 text-right">{perf.count}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={perf.avg_duration > 1000 ? 'text-red-600 font-semibold' : ''}>
                      {Math.round(perf.avg_duration)}ms
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">{perf.min_duration}ms</td>
                  <td className="py-3 px-4 text-right text-muted-foreground">{perf.max_duration}ms</td>
                  <td className="py-3 px-4 text-right">
                    <span className={perf.p95_duration > 2000 ? 'text-orange-600' : ''}>
                      {Math.round(perf.p95_duration)}ms
                    </span>
                  </td>
                </tr>
              ))}
              {performanceSummary.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No performance data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Errors */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Recent Errors
        </h2>
        <div className="space-y-3">
          {recentErrors.map((error) => (
            <div
              key={error.id}
              className={`p-4 rounded-lg border ${getSeverityColor(error.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getSeverityIcon(error.severity)}
                    <span className="text-sm font-medium uppercase">{error.severity}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(error.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium mb-1">{error.message}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-mono">{error.method} {error.endpoint}</span>
                    {error.user_email && <span>User: {error.user_email}</span>}
                  </div>
                </div>
                {error.resolved ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                )}
              </div>
            </div>
          ))}
          {recentErrors.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No recent errors! System is running smoothly.</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
