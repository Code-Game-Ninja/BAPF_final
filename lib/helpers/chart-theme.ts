/**
 * Centralized chart color theme using CSS custom properties.
 * Recharts requires raw color values for SVG attributes (stroke, fill),
 * so we use getComputedStyle to resolve CSS variables at runtime.
 */

/** Resolve a CSS custom property value at runtime */
function getCSSVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/** Chart theme tokens — call these inside component render (client-side only) */
export const chartTheme = {
  /** Grid / axis stroke */
  get grid() {
    return getCSSVar("--border-strong") || "#333333";
  },
  /** Axis labels & tick text */
  get axis() {
    return getCSSVar("--muted-foreground") || "#5D5D5D";
  },
  /** Primary series (e.g. policies, premiums) */
  get primary() {
    return getCSSVar("--primary") || "#EEAE9D";
  },
  /** Legend text */
  get legend() {
    return getCSSVar("--muted-foreground") || "#5D5D5D";
  },
};

/** Static semantic status colors (these don't change with theme) */
export const chartStatusColors = {
  success: "#4ade80",
  warning: "#fbbf24",
  danger: "#f87171",
  info: "#60a5fa",
  purple: "#a78bfa",
  blue: "#3b82f6",
} as const;

/** Reusable legend style */
export const chartLegendStyle = { fontSize: 11 } as const;
