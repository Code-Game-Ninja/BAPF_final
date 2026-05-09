/**
 * Policy Service Tests
 *
 * Tests policy CRUD and helper functions against the Supabase `policies` table.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Supabase mock ----

function mockChain(resolvedValue: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, any> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(onFulfilled(resolvedValue));
  return chain;
}

let currentMock = mockChain({ data: [], error: null });

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => currentMock),
    storage: { from: vi.fn(() => ({ remove: vi.fn().mockResolvedValue({ error: null }) })) },
  },
}));

import {
  getPolicyCount,
  createPolicy,
  updatePolicy,
  deletePolicy,
  lockPolicyForEmployee,
  unlockPolicyForEmployee,
  policyService,
} from "@/lib/services/policy.service";
import { supabase } from "@/lib/supabase/client";

describe("policyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMock = mockChain({ data: [], error: null });
  });

  describe("getPolicyCount", () => {
    it("returns count of all policies", async () => {
      currentMock.then = (onFulfilled: (v: unknown) => unknown) =>
        Promise.resolve(onFulfilled({ count: 150, error: null }));

      const count = await getPolicyCount();

      expect(supabase.from).toHaveBeenCalledWith("policies");
      expect(count).toBe(150);
    });

    it("filters by assignedTo when provided", async () => {
      currentMock.then = (onFulfilled: (v: unknown) => unknown) =>
        Promise.resolve(onFulfilled({ count: 10, error: null }));

      const count = await getPolicyCount("user-1");

      expect(currentMock.eq).toHaveBeenCalledWith("assigned_to", "user-1");
      expect(count).toBe(10);
    });
  });

  describe("createPolicy", () => {
    it("inserts a new policy and returns it", async () => {
      const policyData = {
        policy_number: "POL-001",
        policy_type: "motor" as const,
        customer_id: "c1",
        status: "active" as const,
      };
      const created = { id: "p1", ...policyData };
      currentMock = mockChain({ data: created, error: null });

      const result = await createPolicy(policyData as any);

      expect(supabase.from).toHaveBeenCalledWith("policies");
      expect(currentMock.insert).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it("throws on insert error", async () => {
      currentMock = mockChain({ data: null, error: { message: "duplicate key" } });

      await expect(createPolicy({} as any)).rejects.toThrow();
    });
  });

  describe("updatePolicy", () => {
    it("updates a policy by id", async () => {
      currentMock = mockChain({ data: { id: "p1" }, error: null });

      await updatePolicy("p1", { status: "expired" as any });

      expect(supabase.from).toHaveBeenCalledWith("policies");
      expect(currentMock.update).toHaveBeenCalled();
      expect(currentMock.eq).toHaveBeenCalledWith("id", "p1");
    });
  });

  describe("deletePolicy", () => {
    it("deletes a policy by id", async () => {
      currentMock = mockChain({ data: null, error: null });

      await deletePolicy("p1");

      expect(supabase.from).toHaveBeenCalledWith("policies");
      expect(currentMock.delete).toHaveBeenCalled();
      expect(currentMock.eq).toHaveBeenCalledWith("id", "p1");
    });
  });

  describe("lockPolicyForEmployee", () => {
    it("sets locked_for_employee to true", async () => {
      currentMock = mockChain({ data: { id: "p1" }, error: null });

      await lockPolicyForEmployee("p1");

      expect(currentMock.update).toHaveBeenCalled();
      expect(currentMock.eq).toHaveBeenCalledWith("id", "p1");
    });
  });

  describe("unlockPolicyForEmployee", () => {
    it("sets locked_for_employee to false", async () => {
      currentMock = mockChain({ data: { id: "p1" }, error: null });

      await unlockPolicyForEmployee("p1");

      expect(currentMock.update).toHaveBeenCalled();
      expect(currentMock.eq).toHaveBeenCalledWith("id", "p1");
    });
  });

  describe("policyService.getById", () => {
    it("fetches a single policy by id", async () => {
      const policy = { id: "p1", policy_number: "POL-001", policy_type: "motor" };
      currentMock = mockChain({ data: policy, error: null });

      const result = await policyService.getById("p1");

      expect(supabase.from).toHaveBeenCalledWith("policies");
      expect(currentMock.eq).toHaveBeenCalledWith("id", "p1");
      expect(result).toEqual(policy);
    });
  });
});
