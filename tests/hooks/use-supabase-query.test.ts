import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

type MockError = Error & { code?: string };

const state = vi.hoisted(() => ({
  collectionRows: [] as Array<Record<string, unknown>>,
  collectionError: null as MockError | null,
  documentRow: null as Record<string, unknown> | null,
  documentError: null as MockError | null,
}));

const authState = vi.hoisted(() => ({
  user: { id: "test-uid" },
  loading: false,
}));

function createAwaitable(executor: (query: { filters: Record<string, unknown>; single: boolean }) => unknown) {
  const query = {
    filters: {} as Record<string, unknown>,
    single: false,
  };

  const builder = {
    eq: (field: string, value: unknown) => {
      query.filters[field] = value;
      return builder;
    },
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    in: () => builder,
    contains: () => builder,
    not: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => {
      query.single = true;
      return builder;
    },
    then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(executor(query)).then(onFulfilled, onRejected),
  };

  return builder;
}

vi.mock("@/lib/context/auth-context", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() =>
        createAwaitable(({ single }) => {
          if (single) {
            if (state.documentError) {
              return { data: null, error: state.documentError };
            }
            return { data: state.documentRow, error: null };
          }

          if (state.collectionError) {
            return { data: null, error: state.collectionError };
          }

          return { data: state.collectionRows, error: null };
        })
      ),
    })),
  },
}));

import { useCollection, useDoc } from "@/lib/hooks/use-supabase-query";

describe("useCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.collectionRows = [];
    state.collectionError = null;
    state.documentRow = null;
    state.documentError = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in loading state when key is provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result, unmount } = renderHook(() => useCollection("test-key", "policies"));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    unmount();
    consoleSpy.mockRestore();
  });

  it("is disabled when key is null", () => {
    const { result } = renderHook(() => useCollection(null, "policies"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it("delivers data from Supabase", async () => {
    state.collectionRows = [
      { id: "doc-1", name: "Policy 1" },
      { id: "doc-2", name: "Policy 2" },
    ];

    const { result } = renderHook(() => useCollection("test-key", "policies"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].id).toBe("doc-1");
    });
  });

  it("maps snake_case timestamps into legacy fields", async () => {
    state.collectionRows = [
      { id: "doc-1", created_at: "2026-03-12T00:00:00.000Z", updated_at: "2026-03-13T00:00:00.000Z" },
    ];

    const { result } = renderHook(() => useCollection("test-key", "policies"));

    await waitFor(() => {
      expect(result.current.data?.[0].createdAt).toBe("2026-03-12T00:00:00.000Z");
      expect(result.current.data?.[0].updatedAt).toBe("2026-03-13T00:00:00.000Z");
    });
  });

  it("handles query errors", async () => {
    const error = new Error("Denied") as MockError;
    state.collectionError = error;
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { result } = renderHook(() => useCollection("test-key", "policies"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error);
    });
  });

  it("mutate triggers a refetch", async () => {
    state.collectionRows = [{ id: "doc-1", name: "Policy 1" }];
    const { result } = renderHook(() => useCollection("test-key", "policies"));

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    state.collectionRows = [
      { id: "doc-1", name: "Policy 1" },
      { id: "doc-2", name: "Policy 2" },
    ];

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });
  });
});

describe("useDoc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.collectionRows = [];
    state.collectionError = null;
    state.documentRow = null;
    state.documentError = null;
  });

  it("starts in loading state when key and docId are provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result, unmount } = renderHook(() => useDoc("test-key", "policies", "doc-1"));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    unmount();
    consoleSpy.mockRestore();
  });

  it("is disabled when key is null", () => {
    const { result } = renderHook(() => useDoc(null, "policies", "doc-1"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("is disabled when docId is null", () => {
    const { result } = renderHook(() => useDoc("test-key", "policies", null));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("delivers document data from Supabase", async () => {
    state.documentRow = { id: "doc-1", name: "Test Policy" };

    const { result } = renderHook(() => useDoc("test-key", "policies", "doc-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual({
        id: "doc-1",
        name: "Test Policy",
        createdAt: undefined,
        updatedAt: undefined,
        lastLoginAt: undefined,
        avatarUrl: undefined,
      });
    });
  });

  it("returns null for non-existent document", async () => {
    const error = new Error("Not found") as MockError;
    error.code = "PGRST116";
    state.documentError = error;

    const { result } = renderHook(() => useDoc("test-key", "policies", "missing"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
    });
  });

  it("handles document query errors", async () => {
    const error = new Error("Boom") as MockError;
    state.documentError = error;
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { result } = renderHook(() => useDoc("test-key", "policies", "doc-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error);
    });
  });
});