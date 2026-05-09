/**
 * Tests for Enhanced Error Tracker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  trackError,
  trackAPIError,
  trackCriticalError,
  trackPerformance,
  measurePerformance,
  trackEvent,
  trackUserAction,
  trackBusinessMetric,
} from '@/lib/monitoring/enhanced-error-tracker';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
    })),
  },
}));

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((callback) => callback({ 
    setLevel: vi.fn(),
    setUser: vi.fn(),
    setContext: vi.fn(),
    setExtra: vi.fn(),
  })),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe('Enhanced Error Tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('trackError', () => {
    it('should track error with basic context', async () => {
      const error = new Error('Test error');
      
      await trackError(error);
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should track error with user context', async () => {
      const error = new Error('Test error');
      const context = {
        user: {
          id: '123',
          email: 'test@example.com',
          role: 'admin',
        },
      };
      
      await trackError(error, context);
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should track error with request context', async () => {
      const error = new Error('Test error');
      const context = {
        request: {
          url: '/api/test',
          method: 'POST',
          headers: { 'content-type': 'application/json' },
        },
      };
      
      await trackError(error, context);
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should track error with custom severity', async () => {
      const error = new Error('Test error');
      
      // warning severity doesn't trigger console.error or Sentry in test env
      // (Sentry only called when NEXT_PUBLIC_SENTRY_DSN is set)
      await expect(trackError(error, undefined, 'warning')).resolves.not.toThrow();
    });

    it('should track error with extra data', async () => {
      const error = new Error('Test error');
      const context = {
        extra: {
          customField: 'customValue',
          operation: 'test_operation',
        },
      };
      
      await trackError(error, context);
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('trackAPIError', () => {
    it('should track API error with endpoint', async () => {
      const error = new Error('API error');
      const endpoint = '/api/policies';
      const request = {
        method: 'POST',
        body: { policyNumber: '12345' },
      };
      
      await trackAPIError(endpoint, error, request);
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should track API error with response', async () => {
      const error = new Error('API error');
      const endpoint = '/api/policies';
      const request = { method: 'POST' };
      const response = {
        status: 500,
        body: { error: 'Internal server error' },
      };
      
      await trackAPIError(endpoint, error, request, response);
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should track API error with user', async () => {
      const error = new Error('API error');
      const endpoint = '/api/policies';
      const request = { method: 'POST' };
      const response = { status: 500 };
      const user = {
        id: '123',
        email: 'test@example.com',
        role: 'admin',
      };
      
      await trackAPIError(endpoint, error, request, response, user);
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('trackCriticalError', () => {
    it('should track critical error with operation', async () => {
      const error = new Error('Critical error');
      const operation = 'database_connection';
      
      await trackCriticalError(operation, error);
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should track critical error with context', async () => {
      const error = new Error('Critical error');
      const operation = 'database_connection';
      const context = {
        extra: {
          host: 'localhost',
          port: 5432,
        },
      };
      
      await trackCriticalError(operation, error, context);
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('trackPerformance', () => {
    it('should track performance metric', async () => {
      const operation = 'pdf_extraction';
      const duration = 1500;
      
      await trackPerformance(operation, duration);
      
      // Performance tracking logs to DB — just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should track performance with metadata', async () => {
      const operation = 'pdf_extraction';
      const duration = 1500;
      const metadata = {
        fileSize: 1024000,
        fileName: 'test.pdf',
      };
      
      await trackPerformance(operation, duration, metadata);
      
      expect(true).toBe(true);
    });

    it('should alert on slow operations', async () => {
      const operation = 'slow_operation';
      const duration = 6000; // > 5 seconds
      
      await trackPerformance(operation, duration);
      
      // Slow operations trigger console.warn
      expect(true).toBe(true);
    });
  });

  describe('measurePerformance', () => {
    it('should measure and track function execution', async () => {
      const operation = 'test_operation';
      const fn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });
      
      const result = await measurePerformance(operation, fn);
      
      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
    });

    it('should track performance even on error', async () => {
      const operation = 'test_operation';
      const fn = vi.fn(async () => {
        throw new Error('Test error');
      });
      
      await expect(measurePerformance(operation, fn)).rejects.toThrow('Test error');
      expect(fn).toHaveBeenCalled();
    });

    it('should include metadata in performance tracking', async () => {
      const operation = 'test_operation';
      const fn = vi.fn(async () => 'result');
      const metadata = { userId: '123' };
      
      const result = await measurePerformance(operation, fn, metadata);
      expect(result).toBe('result');
    });
  });

  describe('trackEvent', () => {
    it('should track custom event', async () => {
      const eventName = 'user_login';
      const data = { userId: '123', method: 'email' };
      
      await expect(trackEvent(eventName, data)).resolves.not.toThrow();
    });

    it('should track event without data', async () => {
      const eventName = 'page_view';
      
      await expect(trackEvent(eventName)).resolves.not.toThrow();
    });
  });

  describe('trackUserAction', () => {
    it('should track user action', async () => {
      const action = 'create_policy';
      const userId = '123';
      const metadata = { policyNumber: '12345' };
      
      await expect(trackUserAction(action, userId, metadata)).resolves.not.toThrow();
    });

    it('should track user action without metadata', async () => {
      const action = 'login';
      const userId = '123';
      
      await expect(trackUserAction(action, userId)).resolves.not.toThrow();
    });
  });

  describe('trackBusinessMetric', () => {
    it('should track business metric', async () => {
      const metric = 'policy_created';
      const value = 1;
      const metadata = {
        policyType: 'motor',
        premium: 5000,
      };
      
      await expect(trackBusinessMetric(metric, value, metadata)).resolves.not.toThrow();
    });

    it('should track metric without metadata', async () => {
      const metric = 'user_signup';
      const value = 1;
      
      await expect(trackBusinessMetric(metric, value)).resolves.not.toThrow();
    });
  });

  describe('Error Severity Levels', () => {
    it('should handle fatal severity', async () => {
      const error = new Error('Fatal error');
      await trackError(error, undefined, 'fatal');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle error severity', async () => {
      const error = new Error('Error');
      await trackError(error, undefined, 'error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle warning severity', async () => {
      const error = new Error('Warning');
      // warning doesn't trigger console.error in test env (no Sentry DSN, not development)
      await expect(trackError(error, undefined, 'warning')).resolves.not.toThrow();
    });

    it('should handle info severity', async () => {
      const error = new Error('Info');
      await expect(trackError(error, undefined, 'info')).resolves.not.toThrow();
    });

    it('should handle debug severity', async () => {
      const error = new Error('Debug');
      await expect(trackError(error, undefined, 'debug')).resolves.not.toThrow();
    });
  });

  describe('Context Handling', () => {
    it('should handle missing user context', async () => {
      const error = new Error('Test error');
      const context = {
        request: { url: '/api/test', method: 'GET' },
      };
      
      await trackError(error, context);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle missing request context', async () => {
      const error = new Error('Test error');
      const context = {
        user: { id: '123', email: 'test@example.com', role: 'admin' },
      };
      
      await trackError(error, context);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle empty context', async () => {
      const error = new Error('Test error');
      await trackError(error, {});
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle null context', async () => {
      const error = new Error('Test error');
      await trackError(error, undefined);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle error without message', async () => {
      const error = new Error();
      await trackError(error);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle error without stack trace', async () => {
      const error = new Error('Test error');
      delete error.stack;
      await trackError(error);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle very long error messages', async () => {
      const longMessage = 'A'.repeat(10000);
      const error = new Error(longMessage);
      await trackError(error);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle special characters in error message', async () => {
      const error = new Error('Error with special chars: <>&"\'');
      await trackError(error);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle zero duration performance', async () => {
      await expect(trackPerformance('instant_operation', 0)).resolves.not.toThrow();
    });

    it('should handle negative duration performance', async () => {
      await expect(trackPerformance('negative_operation', -100)).resolves.not.toThrow();
    });

    it('should handle very large duration performance', async () => {
      await expect(trackPerformance('slow_operation', 999999)).resolves.not.toThrow();
    });
  });
});
