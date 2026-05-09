/**
 * lib/tickets/transitions.ts
 * Shared ticket status state machine
 */

export const VALID_TRANSITIONS: Record<string, string[]> = {
  open:        ["in_progress"],
  in_progress: ["pending", "resolved"],
  pending:     ["in_progress"],
  resolved:    ["closed"],
  closed:      [],
};

export function isValidTransition(from: string, to: string): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}
