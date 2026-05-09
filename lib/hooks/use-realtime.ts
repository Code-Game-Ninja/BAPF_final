"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { SWRResponse } from "swr";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Singleton shared channel ──────────────────────────────────────
// ONE WebSocket channel for ALL tables. Hooks register callbacks
// keyed by table name. When a postgres_changes event fires, every
// registered callback for that table is invoked.

type Callback = () => void;

const listeners = new Map<string, Set<Callback>>();
let sharedChannel: RealtimeChannel | null = null;

// All tables the app uses — must match migration 011
const ALL_TABLES = [
  "users", "customers", "policies", "premiums", "renewals",
  "commissions", "commission_rules", "attendance", "early_checkout_requests",
  "notifications", "audit_logs", "holidays", "documents", "branches",
  "campaigns", "daily_reminders", "customer_portal_users", "system_config",
  "sales_leads", "lead_timeline", "lead_documents",
  "business_cases", "service_tickets", "validity_registry",
];

function ensureChannel() {
  if (sharedChannel) return;

  sharedChannel = supabase.channel("rt_global");

  for (const table of ALL_TABLES) {
    sharedChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => {
        const cbs = listeners.get(table);
        if (cbs) {
          for (const cb of cbs) cb();
        }
      }
    );
  }

  sharedChannel.subscribe();
}

function subscribe(table: string, cb: Callback): () => void {
  ensureChannel();

  let set = listeners.get(table);
  if (!set) {
    set = new Set();
    listeners.set(table, set);
  }
  set.add(cb);

  return () => {
    set!.delete(cb);
    if (set!.size === 0) listeners.delete(table);
  };
}

// ─── React hooks ───────────────────────────────────────────────────

/**
 * Subscribe a callback to be called whenever the given table changes.
 * Used internally by useCollection/useDoc and available for direct use.
 */
export function useRealtimeTable(table: string | null, cb: Callback) {
  const cbRef = useRef(cb);
  useEffect(() => {
    cbRef.current = cb;
  });

  useEffect(() => {
    if (!table) return;
    return subscribe(table, () => cbRef.current());
  }, [table]);
}

/**
 * Attaches a Supabase Realtime subscription to an existing SWR response.
 * When a postgres_changes event fires for the given table, `swr.mutate()`
 * is called so the data refetches instantly.
 */
export function useRealtimeSubscription<T>(
  swr: SWRResponse<T>,
  table: string,
  _filter?: string // kept for API compat; filtering happens at refetch level
) {
  const mutateRef = useRef(swr.mutate);
  useEffect(() => {
    mutateRef.current = swr.mutate;
  });

  useRealtimeTable(table, () => mutateRef.current());
}
