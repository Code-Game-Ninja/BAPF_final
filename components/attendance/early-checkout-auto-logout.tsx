"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/context/auth-context";
import { toast } from "sonner";
import type { EarlyCheckoutRequest } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Watches the current user's early checkout requests in real-time.
 * When an admin approves a request, shows a toast and auto-logs out after a short delay.
 */
export function EarlyCheckoutAutoLogout() {
  const { user: dbUser, logout, session } = useAuth();
  const [today] = useState(() => new Date().toISOString().split("T")[0]);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!dbUser?.id || !session) return;

    let channel: RealtimeChannel | null = null;

    // Subscribe to real-time updates for the user's early checkout requests
    channel = supabase
      .channel(`early-checkout-${dbUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "early_checkout_requests",
          filter: `user_id=eq.${dbUser.id}`,
        },
        (payload) => {
          const data = payload.new as EarlyCheckoutRequest;
          const oldData = payload.old as { status?: string };

          // Detect transition from pending → approved for today's date
          if (
            data.date === today &&
            oldData.status === "pending" &&
            data.status === "approved"
          ) {
            toast.success(
              "Your early checkout has been approved! You will be logged out in 5 seconds.",
              { duration: 5000 }
            );

            // Auto-logout after 5 seconds
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = setTimeout(() => {
              logout();
            }, 5000);
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, [dbUser?.id, session, today, logout]);

  // This component renders nothing — it's a behavior-only hook component
  return null;
}
