/**
 * Customer Service Tests
 *
 * Tests customer CRUD operations against the Supabase `customers` table.
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
  chain.ilike = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(onFulfilled(resolvedValue));
  return chain;
}

let currentMock = mockChain({ data: [], error: null });
let rpcMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => currentMock),
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { getCustomer, searchCustomers, getCustomerCount, customerService } from "@/lib/services/customer.service";
import { supabase } from "@/lib/supabase/client";

describe("customerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMock = mockChain({ data: [], error: null });
    rpcMock = vi.fn().mockResolvedValue({ data: "BPAF-C001", error: null });
  });

  describe("getCustomer", () => {
    it("fetches a single customer by id", async () => {
      const customer = { id: "c1", uid: "BPAF-C001", name: "Raj Kumar", phone: "9876543210" };
      currentMock = mockChain({ data: customer, error: null });

      const result = await getCustomer("c1");

      expect(supabase.from).toHaveBeenCalledWith("customers");
      expect(currentMock.eq).toHaveBeenCalledWith("id", "c1");
      expect(result).toEqual(customer);
    });

    it("returns null when customer not found", async () => {
      currentMock = mockChain({ data: null, error: { code: "PGRST116", message: "Not found" } });

      const result = await getCustomer("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("searchCustomers", () => {
    it("searches by phone when query is numeric", async () => {
      const customers = [{ id: "c1", name: "Raj", phone: "9876543210" }];
      currentMock = mockChain({ data: customers, error: null });

      const result = await searchCustomers("9876543210");

      expect(supabase.from).toHaveBeenCalledWith("customers");
      expect(result).toEqual(customers);
    });

    it("searches by name when query is not numeric", async () => {
      const customers = [{ id: "c1", name: "Raj Kumar", phone: "9876543210" }];
      currentMock = mockChain({ data: customers, error: null });

      const result = await searchCustomers("Raj");

      expect(supabase.from).toHaveBeenCalledWith("customers");
      expect(result).toEqual(customers);
    });

    it("returns empty array on error", async () => {
      currentMock = mockChain({ data: null, error: { message: "timeout" } });

      const result = await searchCustomers("test");
      expect(result).toEqual([]);
    });
  });

  describe("getCustomerCount", () => {
    it("returns the count of active customers", async () => {
      currentMock = mockChain({ data: null, error: null, count: 42 });
      // Override: getCustomerCount reads .count from response
      currentMock.then = (onFulfilled: (v: unknown) => unknown) =>
        Promise.resolve(onFulfilled({ count: 42, error: null }));

      const result = await getCustomerCount();

      expect(supabase.from).toHaveBeenCalledWith("customers");
      expect(result).toBe(42);
    });
  });

  describe("customerService.phoneExists", () => {
    it("returns true when phone exists", async () => {
      currentMock = mockChain({ data: [{ id: "c1" }], error: null });

      const result = await customerService.phoneExists("9876543210");
      expect(result).toBe(true);
    });

    it("returns false when phone does not exist", async () => {
      currentMock = mockChain({ data: [], error: null });

      const result = await customerService.phoneExists("0000000000");
      expect(result).toBe(false);
    });
  });

  describe("customerService.emailExists", () => {
    it("returns true when email exists", async () => {
      currentMock = mockChain({ data: [{ id: "c1" }], error: null });

      const result = await customerService.emailExists("raj@test.com");
      expect(result).toBe(true);
    });

    it("excludes given id via in-memory filter", async () => {
      // Returns one row with the excluded id — should filter it out
      currentMock = mockChain({ data: [{ id: "c1" }], error: null });

      const result = await customerService.emailExists("raj@test.com", "c1");
      expect(result).toBe(false);
    });

    it("returns true when other ids match besides excluded", async () => {
      currentMock = mockChain({ data: [{ id: "c1" }, { id: "c2" }], error: null });

      const result = await customerService.emailExists("raj@test.com", "c1");
      expect(result).toBe(true);
    });
  });
});
