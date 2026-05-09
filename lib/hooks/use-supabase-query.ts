"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { useRealtimeTable } from "./use-realtime";

const FALLBACK_POLL_MS = 300_000; // 5min safety-net poll; Realtime handles instant updates
const RT_DEBOUNCE_MS = 500; // debounce Realtime events to prevent cascade refetches

// Simple in-memory cache so navigating back shows data instantly
const queryCache = new Map<string, { data: unknown[]; ts: number }>();
const CACHE_TTL_MS = 60_000; // serve cached data for up to 60s while revalidating
const CACHE_MAX_ENTRIES = 100;

function cacheGet(key: string) {
  const entry = queryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    queryCache.delete(key);
    return undefined;
  }
  return entry;
}

function cacheSet(key: string, data: unknown[]) {
  if (queryCache.size >= CACHE_MAX_ENTRIES && !queryCache.has(key)) {
    let oldestKey: string | undefined;
    let oldestTs = Infinity;
    for (const [k, v] of queryCache) {
      if (v.ts < oldestTs) { oldestTs = v.ts; oldestKey = k; }
    }
    if (oldestKey) queryCache.delete(oldestKey);
  }
  queryCache.set(key, { data, ts: Date.now() });
}

// Types

export interface QueryFilter {
  field: string;
  operator:
    | "=="
    | "!="
    | ">"
    | ">="
    | "<"
    | "<="
    | "in"
    | "array-contains"
    | "array-contains-any"
    | "not-in";
  value: unknown;
}

interface CollectionResult<T> {
  data: T[] | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
}

interface DocResult<T> {
  data: T | null | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
}

function resolveHookError(err: unknown, fallbackMessage: string): Error {
  if (err instanceof Error) return err;
  if (typeof err === "string") return new Error(err);

  // Supabase/PostgREST errors are often plain objects, not Error instances.
  if (err && typeof err === "object") {
    const maybe = err as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    if (maybe.message) {
      const extras = [maybe.code, maybe.details, maybe.hint].filter(Boolean).join(" | ");
      return new Error(extras ? `${maybe.message} (${extras})` : maybe.message);
    }
  }

  return new Error(fallbackMessage);
}

function mapFieldName(field: string): string {
  switch (field) {
    case "createdAt":
      return "created_at";
    case "updatedAt":
      return "updated_at";
    case "lastLoginAt":
      return "last_login_at";
    case "avatarUrl":
      return "avatar_url";
    default:
      return field;
  }
}

function normalizeRow<T extends { id: string }>(row: Record<string, unknown>): T {
  return {
    ...row,
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
    lastLoginAt: row.lastLoginAt ?? row.last_login_at,
    avatarUrl: row.avatarUrl ?? row.avatar_url,
  } as unknown as T;
}

/**
 * Returns true when the filter set contains a condition that would produce an
 * empty result set without needing a round-trip (e.g., `.in(field, [])` is
 * always empty).  The caller should short-circuit and return `[]`.
 */
function hasShortCircuitFilter(filters: QueryFilter[]): boolean {
  return filters.some((f) => {
    if (f.operator === "in" || f.operator === "array-contains-any" || f.operator === "not-in") {
      return Array.isArray(f.value) && f.value.length === 0;
    }
    return false;
  });
}

function applyFilter(
  queryBuilder: ReturnType<typeof supabase.from>,
  filter: QueryFilter
) {
  const field = mapFieldName(filter.field);
  const val = filter.value;

  // Guard: skip filters whose value is undefined, null, or NaN — they produce
  // malformed PostgREST query strings and result in 400 Bad Request.
  if (val === undefined || val === null || (typeof val === "number" && Number.isNaN(val))) {
    console.warn(`[Supabase] skipping filter on "${field}" — value is ${String(val)}`);
    return queryBuilder;
  }

  switch (filter.operator) {
    case "==":
      return queryBuilder.eq(field, val);
    case "!=":
      return queryBuilder.neq(field, val);
    case ">":
      return queryBuilder.gt(field, val);
    case ">=":
      return queryBuilder.gte(field, val);
    case "<":
      return queryBuilder.lt(field, val);
    case "<=":
      return queryBuilder.lte(field, val);
    case "in": {
      const arr = Array.isArray(val) ? val : [val];
      if (arr.length === 0) return queryBuilder; // would be caught by hasShortCircuitFilter
      return queryBuilder.in(field, arr);
    }
    case "array-contains":
      return queryBuilder.contains(field, Array.isArray(val) ? val : [val]);
    case "array-contains-any": {
      const arr = Array.isArray(val) ? val : [val];
      if (arr.length === 0) return queryBuilder;
      return queryBuilder.overlaps(field, arr);
    }
    case "not-in": {
      const arr = Array.isArray(val) ? val : [val];
      if (arr.length === 0) return queryBuilder;
      // Escape double-quotes in string values to prevent PostgREST filter injection
      const escaped = arr.map(v =>
        typeof v === "string" ? `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : String(v)
      );
      return queryBuilder.not(field, "in", `(${escaped.join(",")})`);
    }
    default:
      throw new Error(`Unsupported Supabase hook filter operator: ${filter.operator}`);
  }
}

export function useCollection<T extends { id: string }>(
  key: string | null,
  collectionName: string,
  filters?: QueryFilter[],
  sortField?: string,
  sortDir?: "asc" | "desc",
  maxResults?: number
): CollectionResult<T> {
  const { user, loading } = useAuth();
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const cacheKey = `${key}:${collectionName}:${filtersKey}:${sortField}:${sortDir}:${maxResults}`;

  const cached = cacheGet(cacheKey);
  const [data, setData] = useState<T[] | undefined>(
    cached ? (cached.data as T[]) : undefined
  );
  const [error, setError] = useState<Error | undefined>(undefined);
  // Fix: stay loading if key exists but no cached data (prevents empty flash)
  const [isLoading, setIsLoading] = useState(key !== null && cached === undefined);
  const [version, setVersion] = useState(0);
  const [pollingSuspended, setPollingSuspended] = useState(false);
  const visibleRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track tab visibility — pause polling when hidden
  useEffect(() => {
    const handler = () => { visibleRef.current = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    // key is null → hook is disabled, clear data
    if (!key) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    // Auth still loading → wait without wiping data, stay loading if no data
    if (loading || !user) {
      if (!data) setIsLoading(true);
      return;
    }

    if (pollingSuspended) {
      setIsLoading(false); // don't leave stuck in loading state
      return;
    }

    let cancelled = false;
    let consecutiveErrors = 0;

    const fetchCollection = async (isPolling = false) => {
      // Skip background polls when tab is hidden
      if (isPolling && !visibleRef.current) return;

      setError(undefined);
      if (!isPolling && !data) setIsLoading(true);

      try {
        // Short-circuit: if a filter guarantees zero rows, skip the network call.
        if (filters && filters.length > 0 && hasShortCircuitFilter(filters)) {
          if (!cancelled) {
            setData([]);
            setIsLoading(false);
          }
          return;
        }

        let queryBuilder = supabase.from(collectionName).select("*");

        for (const filter of filters ?? []) {
          queryBuilder = applyFilter(queryBuilder, filter);
        }

        if (sortField) {
          queryBuilder = queryBuilder.order(mapFieldName(sortField), {
            ascending: (sortDir ?? "desc") === "asc",
          });
        }

        if (maxResults) {
          queryBuilder = queryBuilder.limit(maxResults);
        }

        const { data: rows, error: queryError } = await queryBuilder;
        if (queryError) throw queryError;
        consecutiveErrors = 0;

        if (!cancelled) {
          const normalized = (rows ?? []).map((row) => normalizeRow<T>(row as Record<string, unknown>));
          setData(normalized);
          setIsLoading(false);
          cacheSet(cacheKey, normalized);
        }
      } catch (err) {
        if (cancelled) return;

        // Transient auth-lock / abort errors (Web Locks API contention during
        // token refresh) — silently retry on the next poll cycle.
        const isAbort =
          (err instanceof DOMException && err.name === "AbortError") ||
          (err instanceof Error && err.name === "AbortError") ||
          (err instanceof Error && err.message.includes("Lock broken"));
        if (isAbort) {
          console.debug(`[Supabase] ${collectionName}: transient abort — will retry`);
          return;
        }

        const resolvedError = resolveHookError(
          err,
          `Failed to load collection: ${collectionName}`
        );
        console.error(`[Supabase] ${collectionName}:`, resolvedError);
        setError(resolvedError);
        setIsLoading(false);

        consecutiveErrors += 1;
        if (consecutiveErrors >= 3) {
          console.warn(
            `[Supabase] ${collectionName}: polling suspended after 3 consecutive errors`
          );
          setPollingSuspended(true);
        }
      }
    };

    void fetchCollection(false);
    const intervalId = window.setInterval(() => fetchCollection(true), FALLBACK_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, collectionName, cacheKey, sortField, sortDir, maxResults, version, user, loading, pollingSuspended]);

  // Realtime subscription — debounced to prevent cascade refetches
  useRealtimeTable(key && user ? collectionName : null, () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setVersion((v) => v + 1);
    }, RT_DEBOUNCE_MS);
  });

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const mutate = useCallback(() => {
    queryCache.delete(cacheKey);
    setPollingSuspended(false);
    setVersion((v) => v + 1);
  }, [cacheKey]);
  return { data, error, isLoading, mutate };
}

export function useDoc<T extends { id: string }>(
  key: string | null,
  collectionName: string,
  docId: string | null
): DocResult<T> {
  const { user, loading } = useAuth();
  const docCacheKey = `${key}:${collectionName}:doc:${docId}`;
  const cached = cacheGet(docCacheKey);
  const [data, setData] = useState<T | null | undefined>(
    cached ? (cached.data[0] as T) : undefined
  );
  const [error, setError] = useState<Error | undefined>(undefined);
  // Fix: stay loading if key exists but no cached data (prevents empty flash)
  const [isLoading, setIsLoading] = useState(key !== null && cached === undefined);
  const [version, setVersion] = useState(0);
  const [pollingSuspended, setPollingSuspended] = useState(false);
  const visibleRef = useRef(true);
  const dataRef = useRef(data);
  dataRef.current = data;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => { visibleRef.current = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    // key/docId is null → hook is disabled, clear data
    if (!key || !docId) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    // Auth still loading → wait without wiping data, stay loading if no data
    if (loading || !user) {
      if (!dataRef.current) setIsLoading(true);
      return;
    }

    if (pollingSuspended) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let consecutiveErrors = 0;

    const fetchDoc = async (isPolling = false) => {
      if (isPolling && !visibleRef.current) return;
      setError(undefined);
      if (!dataRef.current) setIsLoading(true);

      try {
        const { data: row, error: queryError } = await supabase
          .from(collectionName)
          .select("*")
          .eq("id", docId)
          .single();

        if (queryError) {
          if (queryError.code === "PGRST116") {
            if (!cancelled) {
              setData(null);
              setIsLoading(false);
            }
            return;
          }
          throw queryError;
        }

        if (!cancelled) {
          const normalized = normalizeRow<T>((row ?? {}) as Record<string, unknown>);
          setData(normalized);
          setIsLoading(false);
          cacheSet(docCacheKey, [normalized]);
        }
        consecutiveErrors = 0;
      } catch (err) {
        if (cancelled) return;

        const isAbort =
          (err instanceof DOMException && err.name === "AbortError") ||
          (err instanceof Error && err.name === "AbortError") ||
          (err instanceof Error && err.message.includes("Lock broken"));
        if (isAbort) {
          console.debug(`[Supabase] ${collectionName}/${docId}: transient abort — will retry`);
          return;
        }

        const resolvedError = resolveHookError(
          err,
          `Failed to load document: ${collectionName}/${docId}`
        );
        console.error(`[Supabase] ${collectionName}/${docId}:`, resolvedError);
        setError(resolvedError);
        setIsLoading(false);

        consecutiveErrors += 1;
        if (consecutiveErrors >= 3) {
          console.warn(
            `[Supabase] ${collectionName}/${docId}: polling suspended after 3 consecutive errors`
          );
          setPollingSuspended(true);
        }
      }
    };

    void fetchDoc(false);
    const intervalId = window.setInterval(() => fetchDoc(true), FALLBACK_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [key, collectionName, docId, version, user, loading, pollingSuspended]);

  // Realtime subscription — debounced
  useRealtimeTable(key && docId && user ? collectionName : null, () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setVersion((v) => v + 1);
    }, RT_DEBOUNCE_MS);
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const mutate = useCallback(() => {
    queryCache.delete(docCacheKey);
    setPollingSuspended(false);
    setVersion((v) => v + 1);
  }, [docCacheKey]);
  return { data, error, isLoading, mutate };
}
