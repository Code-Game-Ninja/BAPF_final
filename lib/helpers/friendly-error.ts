/**
 * Maps raw Supabase / network error messages to user-friendly text.
 * Use this in catch blocks instead of showing err.message directly.
 */
export function friendlyError(err: unknown, fallback = "Something went wrong"): string {
  const msg = (err as Error)?.message || "";

  if (
    msg.includes("client is offline") ||
    msg.includes("Failed to get document") ||
    msg.includes("Failed to fetch") ||
    msg.includes("network")
  ) {
    return "You appear to be offline. Please check your connection and try again.";
  }

  if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
    return "You don't have permission to perform this action.";
  }

  if (msg.includes("not-found") || msg.includes("NOT_FOUND")) {
    return "The requested record was not found.";
  }

  if (msg.includes("already-exists") || msg.includes("ALREADY_EXISTS")) {
    return "This record already exists.";
  }

  if (msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
    return "Service temporarily unavailable. Please try again later.";
  }

  // Return the original message if it looks user-friendly (short, no stack trace)
  if (msg.length > 0 && msg.length < 120 && !msg.includes("\n")) {
    return msg;
  }

  return fallback;
}
