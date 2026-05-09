"use client";

import { SWRConfig } from "swr";
import { useAuth } from "@/lib/context/auth-context";

/**
 * Global SWR configuration — wraps the app to provide:
 * - Retry with exponential back-off on transient network errors
 * - Graceful handling of "client is offline" errors
 * - Pauses all fetches when the user is not authenticated
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 5000,
        errorRetryCount: 3,
        // Pause all fetching when not authenticated — prevents "client is offline"
        isPaused: () => !user,
        onErrorRetry(error, _key, _config, revalidate, { retryCount }) {
          // Don't retry on auth/permission errors
          const msg = error?.message || "";
          if (msg.includes("permission") || msg.includes("Unauthorized")) return;

          // Retry on network/fetch errors
          const isOffline =
            msg.includes("Failed to fetch") ||
            msg.includes("FetchError") ||
            msg.includes("TypeError") ||
            msg.includes("network") ||
            msg.includes("ECONNREFUSED");

          if (isOffline || retryCount < 3) {
            const delay = Math.min(1000 * 2 ** retryCount, 10000);
            setTimeout(() => revalidate({ retryCount }), delay);
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
