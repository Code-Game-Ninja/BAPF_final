import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createCustomer } from '@/app/api/customers/route';
import { POST as createPolicy } from '@/app/api/policies/route';
import { POST as createClaim } from '@/app/api/claims/route';

// Mock auth middleware
vi.mock('@/lib/api/auth-middleware', () => ({
  requireAuth: vi.fn(async () => ({ uid: 'test-user', role: 'admin', email: 'admin@test.com' })),
  isAuthError: vi.fn(() => false),
  authError: vi.fn(),
}));

// Mock Supabase admin
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          neq: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
        maybeSingle: vi.fn(async () => ({ data: { value: 'POL' }, error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { id: '123' }, error: null })),
        })),
      })),
      rpc: vi.fn(async () => ({ data: 'TKT-001', error: null })),
    })),
    rpc: vi.fn(async () => ({ data: 'CUST-001', error: null })),
  },
}));

// Mock protection
vi.mock('@/lib/api/protect', () => ({
  protect: vi.fn(() => null),
}));

describe('API Route Validation (Phase 4)', () => {
  describe('POST /api/customers', () => {
    it('should return 400 for invalid phone number', async () => {
      const req = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'John Doe',
          phone: '123', // Invalid
          type: 'individual',
        }),
      });

      const res = await createCustomer(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Validation failed');
    });

    it('should return 400 for missing name', async () => {
      const req = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          phone: '9876543210',
          type: 'individual',
        }),
      });

      const res = await createCustomer(req);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/policies', () => {
    it('should return 400 for invalid date range', async () => {
      const req = new NextRequest('http://localhost/api/policies', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: 'cust-123',
          customer_name: 'John Doe',
          policy_type: 'motor',
          start_date: '2024-01-01',
          end_date: '2023-01-01', // Before start
          premium_amount: 1000,
          assigned_to: 'emp-123',
        }),
      });

      const res = await createPolicy(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('POST /api/claims', () => {
    it('should return 400 for missing claim number', async () => {
      const req = new NextRequest('http://localhost/api/claims', {
        method: 'POST',
        body: JSON.stringify({
          policy_id: 'pol-123',
          claim_type: 'theft',
          claim_amount: 5000,
          incident_date: '2024-01-01',
          claim_date: '2024-01-02',
          description: 'Short desc', // Too short
        }),
      });

      const res = await createClaim(req);
      expect(res.status).toBe(400);
    });
  });
});
