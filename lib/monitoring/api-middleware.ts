/**
 * API Monitoring Middleware
 * Automatically tracks errors and performance for all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackAPIError, trackPerformance } from './enhanced-error-tracker';

export interface MonitoringOptions {
  trackPerformance?: boolean;
  trackErrors?: boolean;
  slowThreshold?: number; // milliseconds
}

/**
 * Wrap API route handler with monitoring
 * 
 * Usage:
 * export const GET = withMonitoring(async (req) => {
 *   // Your handler code
 * });
 */
export function withMonitoring<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  options: MonitoringOptions = {}
): T {
  const {
    trackPerformance: shouldTrackPerformance = true,
    trackErrors: shouldTrackErrors = true,
    slowThreshold = 1000, // 1 second
  } = options;

  return (async (...args: any[]) => {
    const req = args[0] as NextRequest;
    const start = Date.now();
    
    // Extract request info
    const url = req.url;
    const method = req.method;
    const endpoint = new URL(url).pathname;
    
    // Get user info from headers (if available)
    let userId: string | undefined;
    let userEmail: string | undefined;
    let userRole: string | undefined;
    
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        // Extract user info from token (simplified - adjust based on your auth)
        // In production, decode JWT token here
        userId = req.headers.get('x-user-id') || undefined;
        userEmail = req.headers.get('x-user-email') || undefined;
        userRole = req.headers.get('x-user-role') || undefined;
      }
    } catch (err) {
      // Ignore auth parsing errors
    }

    try {
      // Execute handler
      const response = await handler(...args);
      const duration = Date.now() - start;

      // Track performance
      if (shouldTrackPerformance) {
        await trackPerformance(endpoint, duration, {
          method,
          endpoint,
          user_id: userId,
          status: response.status,
          slow: duration > slowThreshold,
        });
      }

      // Log slow requests
      if (duration > slowThreshold) {
        console.warn(`[Slow Request] ${method} ${endpoint} took ${duration}ms`);
      }

      return response;
    } catch (error: any) {
      const duration = Date.now() - start;

      // Track error
      if (shouldTrackErrors) {
        await trackAPIError(
          endpoint,
          error,
          {
            method,
            headers: Object.fromEntries(req.headers.entries()),
          },
          {
            status: 500,
          },
          userId && userEmail && userRole
            ? { id: userId, email: userEmail, role: userRole }
            : undefined
        );
      }

      // Track performance even on error
      if (shouldTrackPerformance) {
        await trackPerformance(endpoint, duration, {
          method,
          endpoint,
          user_id: userId,
          error: true,
          error_message: error.message,
        });
      }

      // Re-throw error
      throw error;
    }
  }) as T;
}

/**
 * Monitoring middleware for Next.js middleware.ts
 * Tracks all requests at the edge
 */
export async function monitoringMiddleware(
  req: NextRequest,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  const start = Date.now();
  const url = req.url;
  const method = req.method;
  const endpoint = new URL(url).pathname;

  try {
    const response = await next();
    const duration = Date.now() - start;

    // Track performance for API routes only
    if (endpoint.startsWith('/api/')) {
      await trackPerformance(endpoint, duration, {
        method,
        endpoint,
        status: response.status,
      });
    }

    return response;
  } catch (error: any) {
    const duration = Date.now() - start;

    // Track error
    if (endpoint.startsWith('/api/')) {
      await trackAPIError(
        endpoint,
        error,
        { method },
        { status: 500 }
      );

      await trackPerformance(endpoint, duration, {
        method,
        endpoint,
        error: true,
      });
    }

    throw error;
  }
}

/**
 * Create a monitored API handler
 * Simpler alternative to withMonitoring
 */
export function createMonitoredHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return withMonitoring(handler);
}

/**
 * Batch monitoring wrapper for multiple handlers
 */
export function monitorHandlers<T extends Record<string, (...args: any[]) => Promise<NextResponse>>>(
  handlers: T
): T {
  const monitored: any = {};
  
  for (const [key, handler] of Object.entries(handlers)) {
    monitored[key] = withMonitoring(handler);
  }
  
  return monitored;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  withMonitoring,
  monitoringMiddleware,
  createMonitoredHandler,
  monitorHandlers,
};
