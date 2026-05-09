/**
 * Enhanced Error Tracking & Monitoring System
 * Complete monitoring with database logging, alerts, and dashboards
 */

 

import * as Sentry from '@sentry/nextjs';
import { supabase } from '@/lib/supabase/client';

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';
export type AlertChannel = 'email' | 'slack' | 'console';

export interface ErrorContext {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  request?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: unknown;
    params?: Record<string, string>;
  };
  response?: {
    status: number;
    body?: unknown;
  };
  extra?: Record<string, unknown>;
}

export interface ErrorLog {
  id?: string;
  timestamp: Date;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  user_id?: string;
  user_email?: string;
  request_data?: unknown;
  response_data?: unknown;
  metadata?: Record<string, unknown>;
  resolved: boolean;
}

export interface PerformanceLog {
  id?: string;
  timestamp: Date;
  operation: string;
  duration: number;
  endpoint?: string;
  method?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// DATABASE LOGGING
// ============================================================================

/**
 * Log error to database for dashboard
 */
async function logErrorToDatabase(errorLog: ErrorLog): Promise<void> {
  try {
    const { error } = await (supabase as any).from('error_logs').insert({
      timestamp: errorLog.timestamp.toISOString(),
      severity: errorLog.severity,
      message: errorLog.message,
      stack: errorLog.stack,
      endpoint: errorLog.endpoint,
      method: errorLog.method,
      user_id: errorLog.user_id,
      user_email: errorLog.user_email,
      request_data: errorLog.request_data,
      response_data: errorLog.response_data,
      metadata: errorLog.metadata,
      resolved: false,
    });

    if (error) {
      console.error('[Error Logger] Failed to log to database:', error);
    }
  } catch (err) {
    console.error('[Error Logger] Database logging failed:', err);
  }
}

/**
 * Log performance metric to database
 */
async function logPerformanceToDatabase(perfLog: PerformanceLog): Promise<void> {
  try {
    const { error } = await (supabase as any).from('performance_logs').insert({
      timestamp: perfLog.timestamp.toISOString(),
      operation: perfLog.operation,
      duration: perfLog.duration,
      endpoint: perfLog.endpoint,
      method: perfLog.method,
      user_id: perfLog.user_id,
      metadata: perfLog.metadata,
    });

    if (error) {
      console.error('[Performance Logger] Failed to log to database:', error);
    }
  } catch (err) {
    console.error('[Performance Logger] Database logging failed:', err);
  }
}

// ============================================================================
// ALERT SYSTEM
// ============================================================================

/**
 * Send alert through configured channels
 */
async function sendAlert(
  severity: ErrorSeverity,
  message: string,
  context?: ErrorContext,
  channels: AlertChannel[] = ['console']
): Promise<void> {
  // Only alert on error and fatal
  if (severity !== 'error' && severity !== 'fatal') return;

  const alertMessage = `
🚨 ${severity.toUpperCase()} ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Message: ${message}
Time: ${new Date().toISOString()}
${context?.request?.url ? `Endpoint: ${context.request.method} ${context.request.url}` : ''}
${context?.user?.email ? `User: ${context.user.email}` : ''}
${context?.extra ? `\nDetails: ${JSON.stringify(context.extra, null, 2)}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  for (const channel of channels) {
    switch (channel) {
      case 'console':
        console.error(alertMessage);
        break;

      case 'email':
        await sendEmailAlert(severity, alertMessage, context);
        break;

      case 'slack':
        await sendSlackAlert(severity, alertMessage, context);
        break;
    }
  }
}

/**
 * Send email alert
 */
async function sendEmailAlert(
  severity: ErrorSeverity,
  message: string,
  context?: ErrorContext
): Promise<void> {
  try {
    // Only send in production
    if (process.env.NODE_ENV !== 'production') return;

    const adminEmail = process.env.ADMIN_EMAIL || process.env.ALERT_EMAIL;
    if (!adminEmail) {
      console.warn('[Alert] No admin email configured');
      return;
    }

    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: adminEmail,
        subject: `🚨 ${severity.toUpperCase()} Alert - ${context?.request?.url || 'System'}`,
        text: message,
        html: `<pre>${message}</pre>`,
      }),
    });
  } catch (error) {
    console.error('[Alert] Failed to send email:', error);
  }
}

/**
 * Send Slack alert
 */
async function sendSlackAlert(
  severity: ErrorSeverity,
  message: string,
  context?: ErrorContext
): Promise<void> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('[Alert] No Slack webhook configured');
      return;
    }

    const color = severity === 'fatal' ? '#FF0000' : '#FFA500';
    const emoji = severity === 'fatal' ? ':rotating_light:' : ':warning:';

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} ${severity.toUpperCase()} Alert`,
        attachments: [
          {
            color,
            text: message,
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    });
  } catch (error) {
    console.error('[Alert] Failed to send Slack message:', error);
  }
}

// ============================================================================
// CORE TRACKING FUNCTIONS
// ============================================================================

/**
 * Track an error with full context and alerting
 */
export async function trackError(
  error: Error,
  context?: ErrorContext,
  severity: ErrorSeverity = 'error'
): Promise<void> {
  const errorLog: ErrorLog = {
    timestamp: new Date(),
    severity,
    message: error.message,
    stack: error.stack,
    endpoint: context?.request?.url,
    method: context?.request?.method,
    user_id: context?.user?.id,
    user_email: context?.user?.email,
    request_data: context?.request,
    response_data: context?.response,
    metadata: context?.extra,
    resolved: false,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Tracker]', {
      message: error.message,
      stack: error.stack,
      context,
      severity,
    });
  }

  // Log to database
  await logErrorToDatabase(errorLog);

  // Send to Sentry
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setLevel(severity);

      if (context?.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email,
          role: context.user.role,
        });
      }

      if (context?.request) {
        scope.setContext('request', context.request);
      }

      if (context?.response) {
        scope.setContext('response', context.response);
      }

      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      Sentry.captureException(error);
    });
  }

  // Send alerts for critical errors
  if (severity === 'fatal' || severity === 'error') {
    const channels: AlertChannel[] = ['console'];
    
    if (process.env.ADMIN_EMAIL || process.env.ALERT_EMAIL) {
      channels.push('email');
    }
    
    if (process.env.SLACK_WEBHOOK_URL) {
      channels.push('slack');
    }

    await sendAlert(severity, error.message, context, channels);
  }
}

/**
 * Track API errors with detailed context
 */
export async function trackAPIError(
  endpoint: string,
  error: Error,
  request?: {
    method: string;
    body?: unknown;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  },
  response?: {
    status: number;
    body?: unknown;
  },
  user?: {
    id: string;
    email: string;
    role: string;
  }
): Promise<void> {
  await trackError(
    error,
    {
      user,
      request: {
        url: endpoint,
        method: request?.method || 'UNKNOWN',
        headers: request?.headers,
        body: request?.body,
        params: request?.params,
      },
      response,
      extra: {
        endpoint,
        api_error: true,
      },
    },
    'error'
  );
}

/**
 * Track critical business errors with immediate alerts
 */
export async function trackCriticalError(
  operation: string,
  error: Error,
  context?: ErrorContext
): Promise<void> {
  await trackError(
    error,
    {
      ...context,
      extra: {
        ...context?.extra,
        operation,
        critical: true,
      },
    },
    'fatal'
  );
}

/**
 * Track performance metrics
 */
export async function trackPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  const perfLog: PerformanceLog = {
    timestamp: new Date(),
    operation,
    duration,
    endpoint: metadata?.endpoint as string,
    method: metadata?.method as string,
    user_id: metadata?.user_id as string,
    metadata,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Performance]', operation, `${duration}ms`, metadata);
  }

  // Log to database
  await logPerformanceToDatabase(perfLog);

  // Send to Sentry
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(`Performance: ${operation}`, {
      level: 'info',
      extra: {
        duration,
        ...metadata,
      },
    });
  }

  // Alert on slow operations (>5 seconds)
  if (duration > 5000) {
    await sendAlert(
      'warning',
      `Slow operation detected: ${operation} took ${duration}ms`,
      {
        extra: {
          operation,
          duration,
          ...metadata,
        },
      },
      ['console']
    );
  }
}

/**
 * Measure and track function execution time
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    await trackPerformance(operation, duration, metadata);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    await trackPerformance(operation, duration, {
      ...metadata,
      error: true,
    });
    throw error;
  }
}

/**
 * Track custom events
 */
export async function trackEvent(
  eventName: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Event Tracker]', eventName, data);
  }

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(eventName, {
      level: 'info',
      extra: data,
    });
  }
}

/**
 * Track user actions
 */
export async function trackUserAction(
  action: string,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackEvent(`user_action:${action}`, {
    userId,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Track business metrics
 */
export async function trackBusinessMetric(
  metric: string,
  value: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Business Metric]', metric, value, metadata);
  }

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(`Metric: ${metric}`, {
      level: 'info',
      extra: {
        value,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  trackError,
  trackAPIError,
  trackCriticalError,
  trackPerformance,
  measurePerformance,
  trackEvent,
  trackUserAction,
  trackBusinessMetric,
};
