/**
 * Attendance Service Tests
 *
 * Tests attendance CRUD, check-in/out, and holiday operations against Supabase.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Supabase mock ----

function mockChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(onFulfilled(resolvedValue));
  return chain;
}

let currentMock = mockChain({ data: [], error: null });

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => currentMock),
  },
}));

import {
  createAttendance,
  updateAttendance,
  getAttendanceByDate,
  getUserAttendanceByMonth,
  getAllHolidays,
  createHoliday,
  deleteHoliday,
} from "@/lib/services/attendance.service";
import { supabase } from "@/lib/supabase/client";

describe("attendanceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMock = mockChain({ data: [], error: null });
  });

  describe("createAttendance", () => {
    it("inserts an attendance record and returns it", async () => {
      const data = {
        user_id: "u1",
        user_name: "Alice",
        date: "2026-03-13",
        status: "present" as const,
        check_in_time: "09:00",
      };
      const created = { id: "a1", ...data };
      currentMock = mockChain({ data: created, error: null });

      const result = await createAttendance(data as any);

      expect(supabase.from).toHaveBeenCalledWith("attendance");
      expect(currentMock.insert).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it("throws on insert error", async () => {
      currentMock = mockChain({ data: null, error: { message: "duplicate" } });

      await expect(createAttendance({} as any)).rejects.toThrow();
    });
  });

  describe("updateAttendance", () => {
    it("updates an attendance record by id", async () => {
      currentMock = mockChain({ data: { id: "a1" }, error: null });

      await updateAttendance("a1", { status: "late" as any });

      expect(supabase.from).toHaveBeenCalledWith("attendance");
      expect(currentMock.update).toHaveBeenCalled();
      expect(currentMock.eq).toHaveBeenCalledWith("id", "a1");
    });
  });

  describe("getAttendanceByDate", () => {
    it("fetches all attendance for a given date", async () => {
      const records = [
        { id: "a1", user_id: "u1", date: "2026-03-13", status: "present" },
        { id: "a2", user_id: "u2", date: "2026-03-13", status: "absent" },
      ];
      currentMock = mockChain({ data: records, error: null });

      const result = await getAttendanceByDate("2026-03-13");

      expect(supabase.from).toHaveBeenCalledWith("attendance");
      expect(currentMock.eq).toHaveBeenCalledWith("date", "2026-03-13");
      expect(result).toEqual(records);
    });
  });

  describe("getUserAttendanceByMonth", () => {
    it("fetches user attendance for a specific month range", async () => {
      const records = [
        { id: "a1", date: "2026-03-01", status: "present" },
        { id: "a2", date: "2026-03-02", status: "late" },
      ];
      currentMock = mockChain({ data: records, error: null });

      const result = await getUserAttendanceByMonth("u1", 2026, 3);

      expect(supabase.from).toHaveBeenCalledWith("attendance");
      expect(currentMock.eq).toHaveBeenCalledWith("user_id", "u1");
      expect(result).toEqual(records);
    });
  });
});

describe("holidayService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMock = mockChain({ data: [], error: null });
  });

  describe("getAllHolidays", () => {
    it("fetches all holidays ordered by date", async () => {
      const holidays = [
        { id: "h1", name: "Republic Day", date: "2026-01-26" },
        { id: "h2", name: "Independence Day", date: "2026-08-15" },
      ];
      currentMock = mockChain({ data: holidays, error: null });

      const result = await getAllHolidays();

      expect(supabase.from).toHaveBeenCalledWith("holidays");
      expect(result).toEqual(holidays);
    });
  });

  describe("createHoliday", () => {
    it("inserts a new holiday and returns it", async () => {
      const holiday = { name: "Diwali", date: "2026-10-20", type: "national" };
      const created = { id: "h3", ...holiday };
      currentMock = mockChain({ data: created, error: null });

      const result = await createHoliday(holiday as any);

      expect(supabase.from).toHaveBeenCalledWith("holidays");
      expect(currentMock.insert).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });

  describe("deleteHoliday", () => {
    it("deletes a holiday by id", async () => {
      currentMock = mockChain({ data: null, error: null });

      await deleteHoliday("h1");

      expect(supabase.from).toHaveBeenCalledWith("holidays");
      expect(currentMock.delete).toHaveBeenCalled();
      expect(currentMock.eq).toHaveBeenCalledWith("id", "h1");
    });
  });
});
