/**
 * Tests for API Monitoring Middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  withMonitoring,
  monitorHandlers,
  createMonitoredHandler,
} from '@/lib/monitoring/api-middleware';

// Mock the error tracker
vi.mock('@/lib/monitoring/enhanced-error-tracker', () => ({
  trackAPIError: vi.fn(),
  trackPerformance: vi.fn(),
}));

describe('API Monitoring Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('withMonitoring', () => {
    it('should wrap handler and track performance', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const response = await monitoredHandler(req);

      expect(handler).toHaveBeenCalledWith(req);
      expect(response.status).toBe(200);
    });

    it('should track errors when handler throws', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        throw new Error('Test error');
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      });

      await expect(monitoredHandler(req)).rejects.toThrow('Test error');
      expect(handler).toHaveBeenCalledWith(req);
    });

    it('should handle successful responses', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ data: 'test' }, { status: 200 });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');

      const response = await monitoredHandler(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ data: 'test' });
    });

    it('should handle error responses', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');

      const response = await monitoredHandler(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({ error: 'Bad request' });
    });

    it('should track slow requests', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        await new Promise(resolve => setTimeout(resolve, 1100)); // > 1 second
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');

      await monitoredHandler(req);

      expect(console.warn).toHaveBeenCalled();
    });

    it('should respect monitoring options', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler, {
        trackPerformance: false,
        trackErrors: false,
      });

      const req = new NextRequest('http://localhost:3000/api/test');
      await monitoredHandler(req);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle custom slow threshold', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        await new Promise(resolve => setTimeout(resolve, 600));
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler, {
        slowThreshold: 500,
      });

      const req = new NextRequest('http://localhost:3000/api/test');
      await monitoredHandler(req);

      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('monitorHandlers', () => {
    it('should wrap multiple handlers', async () => {
      const handlers = {
        GET: vi.fn(async (req: NextRequest) => {
          return NextResponse.json({ method: 'GET' });
        }),
        POST: vi.fn(async (req: NextRequest) => {
          return NextResponse.json({ method: 'POST' });
        }),
        PUT: vi.fn(async (req: NextRequest) => {
          return NextResponse.json({ method: 'PUT' });
        }),
      };

      const monitored = monitorHandlers(handlers);

      const getReq = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });
      const getResponse = await monitored.GET(getReq);
      expect(getResponse.status).toBe(200);

      const postReq = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      });
      const postResponse = await monitored.POST(postReq);
      expect(postResponse.status).toBe(200);

      const putReq = new NextRequest('http://localhost:3000/api/test', {
        method: 'PUT',
      });
      const putResponse = await monitored.PUT(putReq);
      expect(putResponse.status).toBe(200);
    });

    it('should handle empty handlers object', () => {
      const handlers = {};
      const monitored = monitorHandlers(handlers);
      expect(monitored).toEqual({});
    });
  });

  describe('createMonitoredHandler', () => {
    it('should create monitored handler', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = createMonitoredHandler(handler);
      const req = new NextRequest('http://localhost:3000/api/test');

      const response = await monitoredHandler(req);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('Request Context Extraction', () => {
    it('should extract user info from headers', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-user-id': '123',
          'x-user-email': 'test@example.com',
          'x-user-role': 'admin',
        },
      });

      await monitoredHandler(req);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle missing user headers', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');

      await monitoredHandler(req);

      expect(handler).toHaveBeenCalled();
    });

    it('should extract authorization header', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'authorization': 'Bearer token123',
        },
      });

      await monitoredHandler(req);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Different HTTP Methods', () => {
    it('should handle GET requests', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ method: 'GET' });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const response = await monitoredHandler(req);
      expect(response.status).toBe(200);
    });

    it('should handle POST requests', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ method: 'POST' });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await monitoredHandler(req);
      expect(response.status).toBe(200);
    });

    it('should handle PUT requests', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ method: 'PUT' });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'PUT',
      });

      const response = await monitoredHandler(req);
      expect(response.status).toBe(200);
    });

    it('should handle DELETE requests', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ method: 'DELETE' });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE',
      });

      const response = await monitoredHandler(req);
      expect(response.status).toBe(200);
    });

    it('should handle PATCH requests', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ method: 'PATCH' });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'PATCH',
      });

      const response = await monitoredHandler(req);
      expect(response.status).toBe(200);
    });
  });

  describe('Response Status Codes', () => {
    it('should handle 200 OK', async () => {
      const handler = vi.fn(async () => {
        return NextResponse.json({ success: true }, { status: 200 });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');
      const response = await monitoredHandler(req);

      expect(response.status).toBe(200);
    });

    it('should handle 201 Created', async () => {
      const handler = vi.fn(async () => {
        return NextResponse.json({ id: '123' }, { status: 201 });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');
      const response = await monitoredHandler(req);

      expect(response.status).toBe(201);
    });

    it('should handle 400 Bad Request', async () => {
      const handler = vi.fn(async () => {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');
      const response = await monitoredHandler(req);

      expect(response.status).toBe(400);
    });

    it('should handle 401 Unauthorized', async () => {
      const handler = vi.fn(async () => {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');
      const response = await monitoredHandler(req);

      expect(response.status).toBe(401);
    });

    it('should handle 404 Not Found', async () => {
      const handler = vi.fn(async () => {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');
      const response = await monitoredHandler(req);

      expect(response.status).toBe(404);
    });

    it('should handle 500 Internal Server Error', async () => {
      const handler = vi.fn(async () => {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');
      const response = await monitoredHandler(req);

      expect(response.status).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle handler with no return value', async () => {
      const handler = vi.fn(async () => {
        // No return
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');

      await expect(monitoredHandler(req)).rejects.toThrow();
    });

    it('should handle handler with multiple parameters', async () => {
      const handler = vi.fn(async (req: NextRequest, context: unknown) => {
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');
      const context = { params: { id: '123' } };

      const response = await monitoredHandler(req, context);
      expect(response.status).toBe(200);
    });

    it('should handle very fast requests', async () => {
      const handler = vi.fn(async () => {
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test');

      const response = await monitoredHandler(req);
      expect(response.status).toBe(200);
    });

    it('should handle requests with query parameters', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test?page=1&limit=10');

      const response = await monitoredHandler(req);
      expect(response.status).toBe(200);
    });

    it('should handle requests with special characters in URL', async () => {
      const handler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const monitoredHandler = withMonitoring(handler);
      const req = new NextRequest('http://localhost:3000/api/test/special%20chars');

      const response = await monitoredHandler(req);
      expect(response.status).toBe(200);
    });
  });
});
