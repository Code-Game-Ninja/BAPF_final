/**
 * lib/sla/businessHours.ts
 * SLA Engine — business hours calculation, countdown, and color logic
 */

export interface BusinessHoursConfig {
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string;  // "09:00"
  end_time: string;    // "18:00"
  is_working_day: boolean;
}

export interface RemainingTime {
  hours: number;
  minutes: number;
  totalMinutes: number;
  display: string;       // "2h 34m" | "BREACHED" | "PAUSED" | "< 1m"
  isBreached: boolean;
  isPaused: boolean;
  color: "green" | "yellow" | "red" | "breached" | "paused";
}

// ── Helpers ──────────────────────────────────────────────────────

function setTimeOnDate(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function nextWorkingDayStart(
  current: Date,
  businessHours: BusinessHoursConfig[],
  holidays: string[]
): Date {
  const next = new Date(current);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);

  // Find the next working day
  for (let i = 0; i < 14; i++) {
    const dayConfig = businessHours.find(h => h.day_of_week === next.getDay());
    const dateStr = next.toISOString().split("T")[0];
    const isHoliday = holidays.includes(dateStr);

    if (dayConfig?.is_working_day && !isHoliday) {
      return setTimeOnDate(next, dayConfig.start_time);
    }
    next.setDate(next.getDate() + 1);
  }

  // Fallback: return next day at 9am
  const fallback = new Date(current);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(9, 0, 0, 0);
  return fallback;
}

// ── Core: Calculate SLA Deadline ─────────────────────────────────

/**
 * Calculate the SLA deadline by adding `slaHours` of business time
 * to `createdAt`, skipping non-working hours, weekends, and holidays.
 *
 * Invariant: result > createdAt
 * Deterministic: same inputs → same output
 * Additive: BH(start,mid) + BH(mid,end) = BH(start,end)
 */
export function calculateSLADeadline(
  createdAt: Date,
  slaHours: number,
  businessHours: BusinessHoursConfig[],
  holidays: string[] = []
): Date {
  if (slaHours <= 0) return new Date(createdAt.getTime() + 1000); // invariant: always > createdAt

  let remainingMinutes = slaHours * 60;
  let current = new Date(createdAt);

  let safetyCounter = 0;
  while (remainingMinutes > 0 && safetyCounter < 365) {
    safetyCounter++;
    const dayConfig = businessHours.find(h => h.day_of_week === current.getDay());
    const dateStr = current.toISOString().split("T")[0];
    const isHoliday = holidays.includes(dateStr);

    if (!dayConfig?.is_working_day || isHoliday) {
      current = nextWorkingDayStart(current, businessHours, holidays);
      continue;
    }

    const dayStart = setTimeOnDate(current, dayConfig.start_time);
    const dayEnd = setTimeOnDate(current, dayConfig.end_time);

    // If current is before business start, jump to start
    if (current < dayStart) {
      current = new Date(dayStart);
    }

    // If current is at or after business end, go to next working day
    if (current >= dayEnd) {
      current = nextWorkingDayStart(current, businessHours, holidays);
      continue;
    }

    // Minutes available today
    const availableMinutes = (dayEnd.getTime() - current.getTime()) / 60_000;

    if (remainingMinutes <= availableMinutes) {
      current = new Date(current.getTime() + remainingMinutes * 60_000);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= availableMinutes;
      current = nextWorkingDayStart(current, businessHours, holidays);
    }
  }

  return current;
}

// ── Countdown Color ───────────────────────────────────────────────

/**
 * Returns the color for the SLA countdown based on remaining time percentage.
 * > 25% remaining → green
 * 10–25% remaining → yellow
 * < 10% remaining → red
 * breached → breached
 */
export function getSLACountdownColor(
  createdAt: Date,
  slaDeadline: Date,
  now: Date
): "green" | "yellow" | "red" | "breached" {
  if (now >= slaDeadline) return "breached";

  const total = slaDeadline.getTime() - createdAt.getTime();
  const remaining = slaDeadline.getTime() - now.getTime();

  if (total <= 0) return "breached";

  const pct = remaining / total;
  if (pct > 0.25) return "green";
  if (pct > 0.10) return "yellow";
  return "red";
}

// ── Remaining Time ────────────────────────────────────────────────

/**
 * Calculate remaining time until SLA deadline.
 */
export function calculateRemainingTime(
  createdAt: Date,
  slaDeadline: Date,
  now: Date,
  isPaused = false
): RemainingTime {
  if (isPaused) {
    return {
      hours: 0,
      minutes: 0,
      totalMinutes: 0,
      display: "PAUSED",
      isBreached: false,
      isPaused: true,
      color: "paused",
    };
  }

  const diffMs = slaDeadline.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      hours: 0,
      minutes: 0,
      totalMinutes: 0,
      display: "BREACHED",
      isBreached: true,
      isPaused: false,
      color: "breached",
    };
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let display: string;
  if (totalMinutes < 1) {
    display = "< 1m";
  } else if (hours === 0) {
    display = `${minutes}m`;
  } else if (minutes === 0) {
    display = `${hours}h`;
  } else {
    display = `${hours}h ${minutes}m`;
  }

  const color = getSLACountdownColor(createdAt, slaDeadline, now);

  return {
    hours,
    minutes,
    totalMinutes,
    display,
    isBreached: false,
    isPaused: false,
    color,
  };
}

// ── Paused SLA Adjustment ─────────────────────────────────────────

/**
 * Adjust SLA deadline by adding the total pause duration.
 * Used when a ticket transitions from pending → in_progress.
 */
export function calculatePausedSLADeadline(
  originalDeadline: Date,
  pauseMinutes: number
): Date {
  return new Date(originalDeadline.getTime() + pauseMinutes * 60_000);
}

// ── Default business hours (Mon–Fri 9am–6pm) ─────────────────────

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig[] = [
  { day_of_week: 0, start_time: "09:00", end_time: "18:00", is_working_day: false }, // Sun
  { day_of_week: 1, start_time: "09:00", end_time: "18:00", is_working_day: true  }, // Mon
  { day_of_week: 2, start_time: "09:00", end_time: "18:00", is_working_day: true  }, // Tue
  { day_of_week: 3, start_time: "09:00", end_time: "18:00", is_working_day: true  }, // Wed
  { day_of_week: 4, start_time: "09:00", end_time: "18:00", is_working_day: true  }, // Thu
  { day_of_week: 5, start_time: "09:00", end_time: "18:00", is_working_day: true  }, // Fri
  { day_of_week: 6, start_time: "09:00", end_time: "18:00", is_working_day: false }, // Sat
];

// ── SLA config defaults ───────────────────────────────────────────

export const DEFAULT_SLA_HOURS: Record<string, Record<string, number>> = {
  ecard_request:     { urgent: 4,  high: 8,  medium: 24, low: 48 },
  member_endorsement:{ urgent: 8,  high: 24, medium: 48, low: 72 },
  name_correction:   { urgent: 4,  high: 8,  medium: 24, low: 48 },
  address_correction:{ urgent: 4,  high: 8,  medium: 24, low: 48 },
  invoice_dispute:   { urgent: 8,  high: 24, medium: 48, low: 72 },
  claim_assistance:  { urgent: 4,  high: 8,  medium: 24, low: 48 },
  general_query:     { urgent: 4,  high: 8,  medium: 16, low: 24 },
};

export function getSLAHours(category: string, priority: string): number {
  return DEFAULT_SLA_HOURS[category]?.[priority] ?? 24;
}
