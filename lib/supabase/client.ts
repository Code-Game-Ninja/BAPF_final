import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:54321" : (() => { throw new Error("NEXT_PUBLIC_SUPABASE_URL is required"); })());

if (typeof window !== "undefined") {
  console.log("[Supabase Client] Initializing with URL:", supabaseUrl);
}

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (process.env.NODE_ENV === "development" ? "test-anon-key" : (() => { throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required"); })());

export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        name: "bapf-admin-session",
        path: "/",
        sameSite: "lax",
      },
      auth: {
        storageKey: "bapf-admin-session",
        // Prevent orphaned Web Lock warnings from React Strict Mode
        // double-mounting by using a longer timeout with graceful fallback.
        lock:
          typeof navigator !== "undefined" && navigator.locks
            ? async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
                const timeout = Math.min(acquireTimeout, 10000); // Increased to 10s
                const ac = new AbortController();
                const timer = setTimeout(() => {
                  console.warn(`[Supabase Lock] Timeout reached for: ${name}. Aborting lock request.`);
                  ac.abort();
                }, timeout);
                
                try {
                  console.debug(`[Supabase Lock] Requesting: ${name}`);
                  return await navigator.locks.request(
                    name,
                    { signal: ac.signal },
                    async () => {
                      console.debug(`[Supabase Lock] Acquired: ${name}`);
                      return await fn();
                    }
                  );
                } catch (err) {
                  // Lock contention or abort — run callback directly to avoid hanging
                  console.warn(`[Supabase Lock] Error or Abort for ${name}:`, err);
                  return await fn();
                } finally {
                  clearTimeout(timer);
                }
              }
            : undefined,
      },
    }
  );
}

// Singleton for client-side usage
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

export const supabase = getSupabaseClient();
