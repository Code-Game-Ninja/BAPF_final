import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:54321" : (() => { throw new Error("NEXT_PUBLIC_SUPABASE_URL is required"); })());
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  (process.env.NODE_ENV === "development" ? "test-anon-key" : (() => { throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required"); })());

export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        // Prevent orphaned Web Lock warnings from React Strict Mode
        // double-mounting by using a shorter timeout with graceful fallback.
        lock:
          typeof navigator !== "undefined" && navigator.locks
            ? async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
                const timeout = Math.min(acquireTimeout, 3000);
                const ac = new AbortController();
                const timer = setTimeout(() => ac.abort(), timeout);
                try {
                  return await navigator.locks.request(
                    name,
                    { signal: ac.signal },
                    async () => fn()
                  );
                } catch {
                  // Lock contention or abort — run callback directly to avoid hanging
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
