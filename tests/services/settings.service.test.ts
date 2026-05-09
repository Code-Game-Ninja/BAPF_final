/**
 * Settings Service Tests
 *
 * Tests CRUD operations against the system_config table via Supabase.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Supabase mock builder ----

function mockQuery(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(onFulfilled(resolvedValue));
  return chain;
}

let currentMock = mockQuery({ data: [], error: null });

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => currentMock),
  },
}));

import { getAllSettings, getValue, setValue, upsertSetting, deleteSetting, seedDefaults } from "@/lib/services/settings.service";
import { supabase } from "@/lib/supabase/client";

describe("settingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMock = mockQuery({ data: [], error: null });
  });

  describe("getAllSettings", () => {
    it("fetches all rows from system_config", async () => {
      const mockData = [
        { id: "1", key: "site_name", value: "BPAF", category: "general" },
        { id: "2", key: "theme", value: "dark", category: "general" },
      ];
      currentMock = mockQuery({ data: mockData, error: null });

      const result = await getAllSettings();

      expect(supabase.from).toHaveBeenCalledWith("system_config");
      expect(result).toEqual(mockData);
    });

    it("throws on query error", async () => {
      currentMock = mockQuery({ data: null, error: { message: "DB down" } });

      await expect(getAllSettings()).rejects.toThrow();
    });
  });

  describe("getValue", () => {
    it("fetches a single setting value by key", async () => {
      currentMock = mockQuery({ data: { value: "BPAF Insurance" }, error: null });

      const result = await getValue<string>("site_name");

      expect(supabase.from).toHaveBeenCalledWith("system_config");
      expect(currentMock.eq).toHaveBeenCalledWith("key", "site_name");
      expect(result).toBe("BPAF Insurance");
    });

    it("returns null when key does not exist", async () => {
      currentMock = mockQuery({ data: null, error: { code: "PGRST116", message: "Not found" } });

      const result = await getValue("nonexistent");
      // The service handles PGRST116 by returning null
      expect(result).toBeNull();
    });
  });

  describe("setValue", () => {
    it("updates value for existing key", async () => {
      // setValue does an update then checks rows returned
      const mockData = [{ id: "1", key: "site_name", value: "New Name" }];
      currentMock = mockQuery({ data: mockData, error: null });

      await setValue("site_name", "New Name");

      expect(supabase.from).toHaveBeenCalledWith("system_config");
      expect(currentMock.update).toHaveBeenCalled();
      expect(currentMock.eq).toHaveBeenCalledWith("key", "site_name");
    });
  });

  describe("upsertSetting", () => {
    it("upserts a setting with onConflict key", async () => {
      currentMock = mockQuery({ data: { id: "1" }, error: null });

      await upsertSetting("new_key", "new_value", "general", "A description");

      expect(supabase.from).toHaveBeenCalledWith("system_config");
      expect(currentMock.upsert).toHaveBeenCalled();
    });
  });

  describe("deleteSetting", () => {
    it("deletes a setting by id", async () => {
      currentMock = mockQuery({ data: null, error: null });

      await deleteSetting("setting-id-1");

      expect(supabase.from).toHaveBeenCalledWith("system_config");
      expect(currentMock.delete).toHaveBeenCalled();
      expect(currentMock.eq).toHaveBeenCalledWith("id", "setting-id-1");
    });
  });

  describe("seedDefaults", () => {
    it("inserts missing defaults when table is empty", async () => {
      // First call is getAllSettings → returns empty
      const selectMock = mockQuery({ data: [], error: null });
      const insertMock = mockQuery({ data: [], error: null });

      let callCount = 0;
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? selectMock : insertMock;
      });

      const count = await seedDefaults();

      // Should have inserted some defaults
      expect(count).toBeGreaterThan(0);
    });

    it("returns 0 when all defaults already exist", async () => {
      // Return all default keys as existing
      const { DEFAULT_SETTINGS } = await import("@/lib/services/settings.service");
      const existingData = DEFAULT_SETTINGS.map((d, i) => ({
        id: `id-${i}`,
        key: d.key,
        value: d.value,
        category: d.category,
      }));

      // The first from() call is getAllSettings (select), second would be insert
      // but since all keys exist, insert should never be called
      let callCount = 0;
      const selectMock = mockQuery({ data: existingData, error: null });
      const insertMock = mockQuery({ data: [], error: null });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? selectMock : insertMock;
      });

      const count = await seedDefaults();
      expect(count).toBe(0);
      // Insert should not have been called
      expect(insertMock.insert).not.toHaveBeenCalled();
    });
  });
});
