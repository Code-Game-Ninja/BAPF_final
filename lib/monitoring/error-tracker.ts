/**
 * Error Tracking & Monitoring
 * Centralized error handling with Sentry integration
 */

import * as Sentry from '@sentry/nextjs';

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

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
  };
  extra?: Record<string, unknown>;
}

/**
 * Track an error with context
 */
export function trackError(
  error: Error,
  context?: ErrorContext,
  severity: ErrorSeverity = 'error'
): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Tracker]', {
      message: error.message,
      stack: error.stack,
      context,
      severity,
    });
  }

  // Send to Sentry in production
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.withScope((scope) => {
      // Set severity
      scope.setLevel(severity);

      // Set user context
      if (context?.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email,
          role: context.user.role,
        });
      }

      // Set request context
      if (context?.request) {
        scope.setContext('request', context.request);
      }

      // Set extra context
      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      // Capture exception
      Sentry.captureException(error);
    });
  }
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  data?: Record<string, unknown>
): void {
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
 * Track performance metrics
 */
export function trackPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Performance]', operation, `${duration}ms`, metadata);
  }

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(`Performance: ${operation}`, {
      level: 'info',
      extra: {
        duration,
        ...metadata,
      },
    });
  }
}

/**
 * Track API errors with detailed context
 */
export function trackAPIError(
  endpoint: string,
  error: Error,
  request?: {
    method: string;
    body?: unknown;
    params?: Record<string, string>;
  },
  response?: {
    status: number;
    body?: unknown;
  }
): void {
  trackError(error, {
    extra: {
      endpoint,
      request,
      response,
    },
  }, 'error');
}

/**
 * Track critical business errors
 */
export function trackCriticalError(
  operation: string,
  error: Error,
  context?: ErrorContext
): void {
  trackError(error, {
    ...context,
    extra: {
      ...context?.extra,
      operation,
      critical: true,
    },
  }, 'fatal');

  // Could trigger additional alerts (email, Slack, PagerDuty)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send alert to admin
    console.error('[CRITICAL ERROR]', operation, error);
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
    trackPerformance(operation, duration, metadata);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    trackPerformance(operation, duration, {
      ...metadata,
      error: true,
    });
    throw error;
  }
}

/**
 * Track user actions for analytics
 */
export function trackUserAction(
  action: string,
  userId: string,
  metadata?: Record<string, unknown>
): void {
  trackEvent(`user_action:${action}`, {
    userId,
    ...metadata,
  });
}

/**
 * Track business metrics
 */
export function trackBusinessMetric(
  metric: string,
  value: number,
  metadata?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Business Metric]', metric, value, metadata);
  }

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(`Metric: ${metric}`, {
      level: 'info',
      extra: {
        value,
        ...metadata,
      },
    });
  }
}
