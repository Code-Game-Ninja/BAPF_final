import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Module-level formatting state (set by AppSettingsProvider) ───

let _currency = "INR";
let _locale = "en-IN";
let _currencyLabel = "Indian Rupees";
let _dateFormatSetting = "DD/MM/YYYY";

const CURRENCY_META: Record<string, { locale: string; label: string }> = {
  INR: { locale: "en-IN", label: "Indian Rupees" },
  PKR: { locale: "en-PK", label: "Pakistani Rupees" },
  USD: { locale: "en-US", label: "US Dollars" },
  EUR: { locale: "de-DE", label: "Euros" },
  GBP: { locale: "en-GB", label: "British Pounds" },
  AED: { locale: "ar-AE", label: "UAE Dirhams" },
  SAR: { locale: "ar-SA", label: "Saudi Riyals" },
};

/** Called by AppSettingsProvider when currency setting changes */
export function setCurrency(code: string) {
  _currency = code;
  const meta = CURRENCY_META[code];
  _locale = meta?.locale ?? "en-US";
  _currencyLabel = meta?.label ?? code;
}

/** Called by AppSettingsProvider when date_format setting changes */
export function setDateFormat(fmt: string) {
  _dateFormatSetting = fmt;
}

function getDateLocaleAndOptions(): { locale: string; options: Intl.DateTimeFormatOptions } {
  switch (_dateFormatSetting) {
    case "MM/DD/YYYY":
      return { locale: "en-US", options: { month: "2-digit", day: "2-digit", year: "numeric" } };
    case "YYYY-MM-DD":
      return { locale: "sv-SE", options: { year: "numeric", month: "2-digit", day: "2-digit" } };
    case "DD-MM-YYYY":
      return { locale: "en-GB", options: { day: "2-digit", month: "2-digit", year: "numeric" } };
    case "DD/MM/YYYY":
    default:
      return { locale: _locale, options: { day: "2-digit", month: "short", year: "numeric" } };
  }
}

// ── Exports ──────────────────────────────────────────────────────

/** Format number as currency using admin-configured currency setting */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(_locale, {
    style: "currency",
    currency: _currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Return a screen-reader-friendly label for a currency amount.
 * E.g. 123456 → "1,23,456 Indian Rupees"
 */
export function formatCurrencyLabel(amount: number): string {
  const formatted = new Intl.NumberFormat(_locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${_currencyLabel}`;
}

/** Format Date or ISO string to locale string using admin date_format setting */
export function formatDate(
  value: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "—";
  const defaults = getDateLocaleAndOptions();
  return date.toLocaleDateString(defaults.locale, {
    ...defaults.options,
    ...options,
  });
}

/** Format phone number — +91 98765 43210 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

/** Truncate string with ellipsis */
export function truncate(str: string, maxLength: number = 40): string {
  if (!str || str.length <= maxLength) return str || "";
  return str.slice(0, maxLength - 1).trimEnd() + "…";
}

/** Generate initials from a full name — "John Doe" → "JD" */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
