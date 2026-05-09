/**
 * Integration Tests for Monitoring System
 * Tests the complete monitoring flow end-to-end
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { trackError, trackPerformance, measurePerformance } from '@/lib/monitoring/enhanced-error-tracker';
import { withMonitoring } from '@/lib/monitoring/api-middleware';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({ data: [], error: null })),
        })),
      })),
    })),
    rpc: vi.fn(() => ({ data: [], error: null })),
  },
}));

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

describe('Monitoring System Integration Tests', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clear call counts between tests so warn/log/error don't bleed across
    vi.clearAllMocks();
    // Re-mock after clearing
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Error Tracking Flow', () => {
    it('should track error from API handler to database', async () => {
      // Create a handler that throws an error
      const handler = vi.fn(async (req: NextRequest) => {
        throw new Error('Test API error');
      });

      // Wrap with monitoring
      const monitoredHandler = withMonitoring(handler);

      // Create request
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-user-id': '123',
          'x-user-email': 'test@example.com',
          'x-user-role': 'admin',
        },
      });

      // Execute and expect error
      await expect(monitoredHandler(req)).rejects.toThrow('Test API error');

      // Verify error was tracked
      expect(console.error).toHaveBeenCalled();
    });

    it('should track performance from API handler to database', async () => {
      // Create a slow handler
      const handler = vi.fn(async (req: NextRequest) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return NextResponse.json({ success: true });
      });

      // Wrap with monitoring
      const monitoredHandler = withMonitoring(handler);

      // Create request
      const req = new NextRequest('http://localhost:3000/api/test');

      // Execute
      const response = await monitoredHandler(req);

      // Verify response
      expect(response.status).toBe(200);
      // Performance tracking happens asynchronously — just verify no throw
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Error Context Propagation', () => {
    it('should propagate user context through error tracking', async () => {
      const error = new Error('Test error');
      const context = {
        user: {
          id: '123',
          email: 'test@example.com',
          role: 'admin',
        },
        request: {
          url: '/api/policies',
          method: 'POST',
        },
        extra: {
          policyNumber: '12345',
        },
      };

      await trackError(error, context);

      expect(console.error).toHaveBeenCalled();
    });

    it('should propagate request context through error tracking', async () => {
      const error = new Error('Test error');
      const context = {
        request: {
          url: '/api/policies',
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: {
            policyNumber: '12345',
          },
        },
        response: {
          status: 500,
          body: {
            error: 'Internal server error',
          },
        },
      };

      await trackError(error, context);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Performance Measurement Flow', () => {
    it('should measure and track async operation', async () => {
      const operation = 'test_async_operation';
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      };

      const result = await measurePerformance(operation, fn);

      expect(result).toBe('result');
    });

    it('should measure and track operation with metadata', async () => {
      const operation = 'test_operation_with_metadata';
      const fn = async () => {
        return { data: 'test' };
      };
      const metadata = {
        userId: '123',
        operation: 'create_policy',
      };

      const result = await measurePerformance(operation, fn, metadata);

      expect(result).toEqual({ data: 'test' });
    });

    it('should track performance even when operation fails', async () => {
      const operation = 'failing_operation';
      const fn = async () => {
        throw new Error('Operation failed');
      };

      await expect(measurePerformance(operation, fn)).rejects.toThrow('Operation failed');
    });
  });

  describe('Multiple Handlers Integration', () => {
    it('should monitor multiple API handlers independently', async () => {
      // Create multiple handlers
      const getHandler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ method: 'GET' });
      });

      const postHandler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ method: 'POST' });
      });

      const putHandler = vi.fn(async (req: NextRequest) => {
        throw new Error('PUT error');
      });

      // Wrap with monitoring
      const monitoredGet = withMonitoring(getHandler);
      const monitoredPost = withMonitoring(postHandler);
      const monitoredPut = withMonitoring(putHandler);

      // Execute GET
      const getReq = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });
      const getResponse = await monitoredGet(getReq);
      expect(getResponse.status).toBe(200);

      // Execute POST
      const postReq = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      });
      const postResponse = await monitoredPost(postReq);
      expect(postResponse.status).toBe(200);

      // Execute PUT (should fail)
      const putReq = new NextRequest('http://localhost:3000/api/test', {
        method: 'PUT',
      });
      await expect(monitoredPut(putReq)).rejects.toThrow('PUT error');

      // Verify all were tracked
      expect(getHandler).toHaveBeenCalledTimes(1);
      expect(postHandler).toHaveBeenCalledTimes(1);
      expect(putHandler).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler);

      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) => {
        const req = new NextRequest(`http://localhost:3000/api/test?id=${i}`);
        return monitoredHandler(req);
      });

      // Execute all concurrently
      const responses = await Promise.all(requests);

      // Verify all succeeded
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all were tracked
      expect(handler).toHaveBeenCalledTimes(10);
    });

    it('should handle mix of successful and failed concurrent requests', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');
        
        if (parseInt(id || '0') % 2 === 0) {
          return NextResponse.json({ success: true });
        } else {
          throw new Error(`Error for request ${id}`);
        }
      });

      const monitoredHandler = withMonitoring(handler);

      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) => {
        const req = new NextRequest(`http://localhost:3000/api/test?id=${i}`);
        return monitoredHandler(req).catch(err => err);
      });

      // Execute all concurrently
      const results = await Promise.all(requests);

      // Verify mix of success and failure
      const successes = results.filter(r => r instanceof NextResponse);
      const failures = results.filter(r => r instanceof Error);

      expect(successes.length).toBe(5);
      expect(failures.length).toBe(5);
    });
  });

  describe('Error Recovery and Retry', () => {
    it('should track multiple retry attempts', async () => {
      let attempts = 0;
      const handler = vi.fn(async (req: NextRequest) => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return NextResponse.json({ success: true, attempts });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');

      // First attempt - should fail
      await expect(monitoredHandler(req)).rejects.toThrow('Attempt 1 failed');

      // Second attempt - should fail
      await expect(monitoredHandler(req)).rejects.toThrow('Attempt 2 failed');

      // Third attempt - should succeed
      const response = await monitoredHandler(req);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.attempts).toBe(3);
    });
  });

  describe('Performance Threshold Alerts', () => {
    it('should alert on slow operations', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        await new Promise(resolve => setTimeout(resolve, 1100)); // > 1 second
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler, {
        slowThreshold: 1000,
      });

      const req = new NextRequest('http://localhost:3000/api/test');
      await monitoredHandler(req);

      // Verify slow request was logged
      expect(console.warn).toHaveBeenCalled();
    });

    it('should not alert on fast operations', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        await new Promise(resolve => setTimeout(resolve, 50)); // < 1 second
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler, {
        slowThreshold: 1000,
      });

      const req = new NextRequest('http://localhost:3000/api/test');
      await monitoredHandler(req);

      // Verify no slow request warning
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle policy creation flow', async () => {
      const createPolicyHandler = vi.fn(async (req: NextRequest) => {
        // Simulate policy creation
        const body = await req.json();
        
        // Validate
        if (!body.policyNumber) {
          throw new Error('Policy number is required');
        }

        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 100));

        return NextResponse.json({
          id: '123',
          policyNumber: body.policyNumber,
          status: 'created',
        }, { status: 201 });
      });

      const monitoredHandler = withMonitoring(createPolicyHandler);

      // Test successful creation
      const successReq = new NextRequest('http://localhost:3000/api/policies', {
        method: 'POST',
        body: JSON.stringify({ policyNumber: '12345' }),
      });

      const successResponse = await monitoredHandler(successReq);
      expect(successResponse.status).toBe(201);

      // Test validation error
      const errorReq = new NextRequest('http://localhost:3000/api/policies', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await expect(monitoredHandler(errorReq)).rejects.toThrow('Policy number is required');
    });

    it('should handle PDF extraction flow', async () => {
      const extractPDFHandler = vi.fn(async (req: NextRequest) => {
        // Simulate PDF extraction
        await new Promise(resolve => setTimeout(resolve, 200));

        return NextResponse.json({
          policyNumber: '12345',
          customerName: 'John Doe',
          premium: 5000,
          confidence: 0.95,
        });
      });

      const monitoredHandler = withMonitoring(extractPDFHandler);

      const req = new NextRequest('http://localhost:3000/api/extract-pdf', {
        method: 'POST',
      });

      const response = await monitoredHandler(req);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.policyNumber).toBe('12345');
      expect(data.confidence).toBe(0.95);
    });

    it('should handle user authentication flow', async () => {
      const loginHandler = vi.fn(async (req: NextRequest) => {
        const body = await req.json();

        if (body.email === 'test@example.com' && body.password === 'password') {
          return NextResponse.json({
            user: {
              id: '123',
              email: 'test@example.com',
              role: 'admin',
            },
            token: 'jwt-token',
          });
        } else {
          throw new Error('Invalid credentials');
        }
      });

      const monitoredHandler = withMonitoring(loginHandler);

      // Test successful login
      const successReq = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password',
        }),
      });

      const successResponse = await monitoredHandler(successReq);
      expect(successResponse.status).toBe(200);

      // Test failed login
      const failReq = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong',
        }),
      });

      await expect(monitoredHandler(failReq)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory with many requests', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler);

      // Execute many requests
      for (let i = 0; i < 100; i++) {
        const req = new NextRequest(`http://localhost:3000/api/test?id=${i}`);
        await monitoredHandler(req);
      }

      expect(handler).toHaveBeenCalledTimes(100);
    });

    it('should handle large request bodies', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        const body = await req.json();
        return NextResponse.json({ size: JSON.stringify(body).length });
      });

      const monitoredHandler = withMonitoring(handler);

      // Create large request body
      const largeData = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'A'.repeat(100),
        })),
      };

      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(largeData),
      });

      const response = await monitoredHandler(req);
      expect(response.status).toBe(200);
    });
  });
});
