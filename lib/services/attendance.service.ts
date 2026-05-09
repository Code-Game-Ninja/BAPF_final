/**
 * Supabase Attendance, Holiday & Early Checkout Services
 */

import { supabase } from "@/lib/supabase/client";
import { Attendance, AttendanceStatus, Holiday } from "@/lib/types";

// ── Attendance ───────────────────────────────────────────────────

export async function createAttendance(data: Omit<Attendance, "id" | "createdAt" | "updatedAt">): Promise<Attendance> {
  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from("attendance")
    .insert({ ...data, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return row as Attendance;
}

export async function updateAttendance(id: string, data: Partial<Attendance>): Promise<void> {
  const { error } = await supabase
    .from("attendance")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getAttendanceByDate(date: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("date", date);
  if (error) throw error;
  return (data ?? []) as Attendance[];
}

export async function getUserAttendanceByMonth(userId: string, year: number, month: number): Promise<Attendance[]> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  // Get the actual last day of the month
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Attendance[];
}

export const attendanceService = {
  create: createAttendance,
  update: updateAttendance,
  getByDate: getAttendanceByDate,
  getUserByMonth: getUserAttendanceByMonth,
  getByUserMonth: getUserAttendanceByMonth, // alias
  getById: async (id: string): Promise<Attendance | null> => {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as Attendance;
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from("attendance").delete().eq("id", id);
    if (error) throw error;
  },
  checkIn: async (userId: string, userName: string): Promise<Attendance> => {
    const today = new Date().toISOString().split("T")[0];
    // Check for an existing record today
    const { data: existingRows } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today);

    // Determine late status from admin settings
    let status: AttendanceStatus = "present";
    try {
      const [startRes, thresholdRes] = await Promise.all([
        supabase.from("system_config").select("value").eq("key", "office_start_time").maybeSingle(),
        supabase.from("system_config").select("value").eq("key", "late_threshold_minutes").maybeSingle(),
      ]);
      const officeStart = startRes.data ? String(startRes.data.value) : "09:00";
      const thresholdMin = thresholdRes.data ? parseInt(String(thresholdRes.data.value), 10) : 15;

      const [startH, startM] = officeStart.split(":").map(Number);
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM + thresholdMin);

      if (now > cutoff) {
        status = "late";
      }
    } catch (err) {
      console.warn("[attendance] Could not read late settings, defaulting to present:", err);
    }

    const nowIso = new Date().toISOString();

    if (existingRows && existingRows.length > 0) {
      const existing = existingRows[0];

      // If user already has a real check_in, they're already checked in — return as-is
      if (existing.check_in) {
        return existing as Attendance;
      }

      // Existing record has no check_in (e.g. auto-marked absent by system) — update it
      const updateData: Record<string, unknown> = {
        check_in: nowIso,
        status,
        updated_at: nowIso,
      };
      if (existing.source === "system") {
        updateData.source = "manual";
        updateData.marked_by = userId;
      }
      const { error } = await supabase
        .from("attendance")
        .update(updateData)
        .eq("id", existing.id);
      if (error) throw error;

      return { ...existing, ...updateData } as Attendance;
    }

    return createAttendance({ user_id: userId, user_name: userName, date: today, status, check_in: nowIso });
  },
  checkOut: async (userId: string, checkOutTime?: string): Promise<void> => {
    const today = new Date().toISOString().split("T")[0];
    const { data: rows } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today);
    if (!rows || rows.length === 0) return;
    const record = rows[0];
    const checkOutIso = checkOutTime ? new Date(checkOutTime).toISOString() : new Date().toISOString();
    // Calculate worked hours
    let worked_hours: number | undefined;
    if (record.check_in) {
      const inMs = new Date(record.check_in).getTime();
      const outMs = new Date(checkOutIso).getTime();
      worked_hours = Math.round(((outMs - inMs) / 3_600_000) * 10) / 10;
    }
    const update: Record<string, unknown> = { check_out: checkOutIso, updated_at: new Date().toISOString() };
    if (worked_hours !== undefined) update.worked_hours = worked_hours;

    // Auto-determine half-day status from admin settings
    if (worked_hours !== undefined) {
      try {
        const [fullDayRes, halfDayRes] = await Promise.all([
          supabase.from("system_config").select("value").eq("key", "full_day_hours").maybeSingle(),
          supabase.from("system_config").select("value").eq("key", "half_day_hours").maybeSingle(),
        ]);
        const fullDayHrs = fullDayRes.data ? parseFloat(String(fullDayRes.data.value)) : 8;
        const halfDayHrs = halfDayRes.data ? parseFloat(String(halfDayRes.data.value)) : 4;
        const currentStatus = record.status;
        if ((currentStatus === "present" || currentStatus === "late") && worked_hours < fullDayHrs && worked_hours >= halfDayHrs) {
          update.status = "half-day";
        }
      } catch { /* ignore — keep existing status */ }
    }

    const { error } = await supabase
      .from("attendance")
      .update(update)
      .eq("id", record.id);
    if (error) throw error;
  },
  overrideStatus: async (id: string, status: string, adminId?: string, _reason?: string): Promise<void> => {
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (adminId) update.override_by = adminId;
    if (_reason) update.override_reason = _reason;
    const { error } = await supabase.from("attendance").update(update).eq("id", id);
    if (error) throw error;
  },
  setLateThreshold: async (_threshold: string | number): Promise<void> => {
    await import("@/lib/services/settings.service").then(m => m.setValue("late_threshold_minutes", String(_threshold)));
  },
  getUserMonthlyStats: async (userId: string, year: number, month: number) => {
    let records: Attendance[] = [];
    try {
      records = await getUserAttendanceByMonth(userId, year, month);
    } catch (err) {
      console.warn("[attendance] getUserMonthlyStats failed:", err);
      return { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, totalWorkedHours: 0, avgWorkedHours: 0, total: 0 };
    }
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const late = records.filter((r) => r.status === "late").length;
    const halfDay = records.filter((r) => r.status === "half-day").length;
    const leave = records.filter((r) => r.status === "leave").length;
    const totalWorkedHours = Math.round(records.reduce((s, r) => s + (r.worked_hours || 0), 0) * 10) / 10;
    const daysWithHours = records.filter((r) => (r.worked_hours || 0) > 0).length;
    const avgWorkedHours = daysWithHours > 0 ? Math.round((totalWorkedHours / daysWithHours) * 10) / 10 : 0;
    return { present, absent, late, halfDay, leave, totalWorkedHours, avgWorkedHours, total: records.length };
  },
  getUserCalendar: async (userId: string, year: number, month: number): Promise<Record<string, Attendance>> => {
    let records: Attendance[] = [];
    try {
      records = await getUserAttendanceByMonth(userId, year, month);
    } catch (err) {
      console.warn("[attendance] getUserCalendar failed:", err);
      return {};
    }
    const map: Record<string, Attendance> = {};
    records.forEach((r) => { map[r.date] = r; });
    return map;
  },
  getTodayStats: async () => {
    const today = new Date().toISOString().split("T")[0];
    try {
      const records = await getAttendanceByDate(today);
      const present = records.filter((r) => r.status === "present").length;
      const absent = records.filter((r) => r.status === "absent").length;
      const late = records.filter((r) => r.status === "late").length;
      const halfDay = records.filter((r) => r.status === "half-day").length;
      const leave = records.filter((r) => r.status === "leave").length;
      return { present, absent, late, halfDay, leave, total: records.length, date: today };
    } catch (err) {
      console.warn("[attendance] getTodayStats failed:", err);
      return { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, total: 0, date: today };
    }
  },
};

// ── Holidays ───────────────────────────────────────────────────────

export async function getAllHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Holiday[];
}

export async function createHoliday(data: Omit<Holiday, "id" | "createdAt" | "updatedAt">): Promise<Holiday> {
  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from("holidays")
    .insert({ ...data, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return row as Holiday;
}

export async function updateHoliday(id: string, data: Partial<Holiday>): Promise<void> {
  const { error } = await supabase
    .from("holidays")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteHoliday(id: string): Promise<void> {
  const { error } = await supabase.from("holidays").delete().eq("id", id);
  if (error) throw error;
}

export const holidayService = {
  getAll: getAllHolidays,
  create: createHoliday,
  createHoliday,  // alias
  update: updateHoliday,
  delete: deleteHoliday,
  getByYear: async (year: number): Promise<Holiday[]> => {
    const all = await getAllHolidays();
    return all.filter((h) => {
      const d = new Date(h.date as unknown as string);
      return d.getFullYear() === year;
    });
  },
};

// ── Early Checkout Requests ────────────────────────────────────────

export async function createEarlyCheckout(data: Record<string, unknown>): Promise<{ id: string }> {
  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from("early_checkout_requests")
    .insert({ ...data, created_at: now, updated_at: now })
    .select("id")
    .single();
  if (error) throw error;
  return { id: row.id };
}

export async function updateEarlyCheckout(id: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from("early_checkout_requests")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export const earlyCheckoutService= {
  create: createEarlyCheckout,
  update: updateEarlyCheckout,
  submitRequest: (data: Record<string, unknown>) =>
    createEarlyCheckout({ ...data, status: "pending" }),
  approve: async (id: string, adminId: string): Promise<void> => {
    await updateEarlyCheckout(id, { status: "approved", reviewed_by: adminId, reviewed_at: new Date().toISOString() });
  },
  reject: async (id: string, adminId: string, reason?: string): Promise<void> => {
    const update: Record<string, unknown> = { status: "rejected", reviewed_by: adminId, reviewed_at: new Date().toISOString() };
    if (reason) update.review_note = reason;
    await updateEarlyCheckout(id, update);
  },
  getByDate: async (date: string): Promise<import("@/lib/types").EarlyCheckoutRequest[]> => {
    const { data, error } = await supabase
      .from("early_checkout_requests")
      .select("*")
      .eq("date", date);
    if (error) throw error;
    return (data ?? []) as import("@/lib/types").EarlyCheckoutRequest[];
  },
};
