import useSWR, { mutate } from "swr";
import { useState, useEffect, useMemo } from "react";
import { holidayService, earlyCheckoutService } from "@/lib/services/attendance.service";
import { Attendance, Holiday, EarlyCheckoutRequest } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { useCollection } from "./use-supabase-query";
import { useRealtimeSubscription } from "./use-realtime";

// ─── Polling query hooks ─────────────────────────────────────────

export function useTodayAttendance(userId: string | null) {
  const [today, setToday] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    const timer = setTimeout(() => {
      setToday(new Date().toISOString().split("T")[0]);
    }, msUntilMidnight);
    return () => clearTimeout(timer);
  }, [today]);

  return useCollection<Attendance>(
    userId ? `attendance-today-${userId}-${today}` : null,
    "attendance",
    userId
      ? [
          { field: "user_id", operator: "==", value: userId },
          { field: "date", operator: "==", value: today },
        ]
      : undefined
  );
}

export function useTodayAllAttendance() {
  const { user } = useAuth();
  const [today, setToday] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    const timer = setTimeout(() => {
      setToday(new Date().toISOString().split("T")[0]);
    }, msUntilMidnight);
    return () => clearTimeout(timer);
  }, [today]);

  return useCollection<Attendance>(
    user ? `attendance-today-all-${today}` : null,
    "attendance",
    [{ field: "date", operator: "==", value: today }]
  );
}

export function useAttendanceByDate(dateStr: string | null) {
  return useCollection<Attendance>(
    dateStr ? `attendance-date-${dateStr}` : null,
    "attendance",
    dateStr ? [{ field: "date", operator: "==", value: dateStr }] : undefined
  );
}

// ─── Real-time month attendance ────────────────────────────────────

export function useUserMonthAttendance(
  userId: string | null, year: number, month: number
) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  // Get the actual last day of the month (handles Feb, Apr, Jun, Sep, Nov correctly)
  const lastDay = new Date(year, month, 0).getDate(); // month is 1-indexed, so month+1-1=month gives last day
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return useCollection<Attendance>(
    userId ? `attendance-user-${userId}-${year}-${month}` : null,
    "attendance",
    userId
      ? [
          { field: "user_id", operator: "==", value: userId },
          { field: "date", operator: ">=", value: start },
          { field: "date", operator: "<=", value: end },
        ]
      : undefined,
    "date",
    "asc"
  );
}

export function useTodayStats() {
  const { data: todayAll, isLoading, error } = useTodayAllAttendance();
  const data = useMemo(() => {
    if (!todayAll) return undefined;
    const today = new Date().toISOString().split("T")[0];
    const present = todayAll.filter((r) => r.status === "present").length;
    const absent = todayAll.filter((r) => r.status === "absent").length;
    const late = todayAll.filter((r) => r.status === "late").length;
    const halfDay = todayAll.filter((r) => r.status === "half-day").length;
    const leave = todayAll.filter((r) => r.status === "leave").length;
    return { present, absent, late, halfDay, leave, total: todayAll.length, date: today };
  }, [todayAll]);
  return { data, isLoading, error };
}

export function useHolidays(year: number) {
  const { user } = useAuth();
  const swr = useSWR<Holiday[]>(
    user ? `holidays-${year}` : null,
    () => holidayService.getByYear(year),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "holidays");
  return swr;
}

export function invalidateAttendance() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("attendance")
  );
}

// ─── Early Checkout Requests ───────────────────────────────────────

export function usePendingEarlyCheckouts() {
  const { user } = useAuth();
  return useCollection<EarlyCheckoutRequest>(
    user ? "early-checkout-pending" : null,
    "early_checkout_requests",
    [{ field: "status", operator: "==", value: "pending" }],
    "createdAt",
    "desc"
  );
}

export function useMyTodayEarlyCheckout(userId: string | null) {
  const [today] = useState(() => new Date().toISOString().split("T")[0]);

  const swr = useSWR<EarlyCheckoutRequest[]>(
    userId ? `early-checkout-mine-${userId}-${today}` : null,
    async () => {
      const { data, error } = await supabase
        .from("early_checkout_requests")
        .select("*")
        .eq("user_id", userId!)
        .eq("date", today)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as EarlyCheckoutRequest[];
    },
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "early_checkout_requests", userId ? `user_id=eq.${userId}` : undefined);
  return swr;
}

export function useEarlyCheckoutsByDate(dateStr: string | null) {
  const swr = useSWR<EarlyCheckoutRequest[]>(
    dateStr ? `early-checkout-date-${dateStr}` : null,
    () => (dateStr ? earlyCheckoutService.getByDate(dateStr) : []),
    { revalidateOnFocus: false }
  );
  useRealtimeSubscription(swr, "early_checkout_requests");
  return swr;
}

export function invalidateEarlyCheckouts() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("early-checkout")
  );
}
