import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const state = vi.hoisted(() => ({
  caller: {
    uid: "admin-uid",
    email: "admin@bpaf.com",
    role: "admin",
    branch_id: "b1",
  },
  policyExists: true,
  currentPolicy: {
    id: "locked-001",
    policy_number: "MOT-2026-0001",
    policy_type: "motor",
    customer_name: "Test Customer",
    locked_for_employee: true,
    verification_confirmed: false,
  } as Record<string, unknown>,
  policyCounter: 0,
}));

type QueryState = {
  filters: Record<string, unknown>;
  insertPayload?: unknown;
  updatePayload?: unknown;
  upsertPayload?: unknown;
  isDelete: boolean;
};

function createQuery(table: string) {
  const queryState: QueryState = {
    filters: {},
    isDelete: false,
  };

  const execute = async () => {
    if (table === "system_config") {
      const key = String(queryState.filters.key ?? "");
      if (queryState.upsertPayload) {
        const payload = queryState.upsertPayload as { value?: { count?: number } };
        state.policyCounter = payload.value?.count ?? state.policyCounter;
        return { data: null, error: null };
      }
      if (key === "policy_number_prefix") return { data: { value: "MOT" }, error: null };
      if (key === "auto_generate_policy_number") return { data: { value: "true" }, error: null };
      if (key.startsWith("policy_counter_")) {
        return state.policyCounter > 0
          ? { data: { value: { count: state.policyCounter } }, error: null }
          : { data: null, error: null };
      }
      return { data: null, error: null };
    }

    if (table === "policies") {
      if (queryState.insertPayload) {
        return { data: { id: "policy-001" }, error: null };
      }

      if (queryState.updatePayload) {
        state.currentPolicy = { ...state.currentPolicy, ...(queryState.updatePayload as Record<string, unknown>) };
        return { data: null, error: null };
      }

      if (queryState.isDelete) {
        return { data: null, error: null };
      }

      return state.policyExists
        ? { data: state.currentPolicy, error: null }
        : { data: null, error: { code: "PGRST116", message: "Not found" } };
    }

    if (table === "audit_logs") {
      return { data: null, error: null };
    }

    return { data: null, error: null };
  };

  const builder = {
    select: () => builder,
    insert: (payload: unknown) => {
      queryState.insertPayload = payload;
      return builder;
    },
    update: (payload: unknown) => {
      queryState.updatePayload = payload;
      return builder;
    },
    delete: () => {
      queryState.isDelete = true;
      return builder;
    },
    upsert: (payload: unknown) => {
      queryState.upsertPayload = payload;
      return builder;
    },
    eq: (field: string, value: unknown) => {
      queryState.filters[field] = value;
      return builder;
    },
    single: () => builder,
    maybeSingle: () => builder,
    order: () => builder,
    limit: () => builder,
    in: () => builder,
    lte: () => builder,
    gte: () => builder,
    then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(execute()).then(onFulfilled, onRejected),
  };

  return builder;
}

vi.mock("@/lib/api/auth-middleware", () => ({
  requireAuth: vi.fn(async (req: NextRequest, allowedRoles?: string[]) => {
    const header = req.headers.get("authorization") ?? "";
    if (!header.startsWith("Bearer ")) {
      return { error: "Unauthorized — missing Bearer token", status: 401 };
    }

    if (allowedRoles && !allowedRoles.includes(state.caller.role)) {
      return { error: `Forbidden — requires role: ${allowedRoles.join(" or ")}`, status: 403 };
    }

    return { ...state.caller };
  }),
  isAuthError: vi.fn((value: unknown) => Boolean(value && typeof value === "object" && "error" in (value as Record<string, unknown>))),
  authError: vi.fn((err: { error: string; status: number }) => NextResponse.json({ error: err.error }, { status: err.status })),
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => createQuery(table)),
    rpc: vi.fn(() => Promise.resolve({ data: 1, error: null })),
    storage: {
      from: vi.fn((bucket: string) => ({
        createSignedUploadUrl: vi.fn(async (path: string) => ({
          data: { signedUrl: `https://upload.example.com/${bucket}/${path}`, token: "upload-token" },
          error: null,
        })),
        createSignedUrl: vi.fn(async (path: string) => ({
          data: { signedUrl: `https://download.example.com/${bucket}/${path}` },
          error: null,
        })),
      })),
    },
  },
}));

vi.mock("@/lib/api/protect", () => ({
  protect: () => null,
}));

import { DELETE, PUT } from "@/app/api/policies/[id]/route";
import { POST as lockPolicy } from "@/app/api/policies/[id]/lock/route";
import { POST as createPolicy } from "@/app/api/policies/route";
import { POST as uploadRoute } from "@/app/api/upload/route";

const params = { params: Promise.resolve({ id: "locked-001" }) };

function asRole(role: "admin" | "manager" | "employee") {
  state.caller = {
    uid: `${role}-uid`,
    email: `${role}@bpaf.com`,
    role,
    branch_id: "b1",
  };
}

function req(method: "GET" | "POST" | "PUT" | "DELETE", url: string, body?: unknown) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer real-token",
    },
  });
}

function noAuthReq(url: string, body?: unknown) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.policyExists = true;
  state.policyCounter = 0;
  state.currentPolicy = {
    id: "locked-001",
    policy_number: "MOT-2026-0001",
    policy_type: "motor",
    customer_name: "Test Customer",
    locked_for_employee: true,
    verification_confirmed: false,
  };
});

describe("Employee cannot bypass locked policy", () => {
  it("cannot update premium_amount on locked policy", async () => {
    asRole("employee");
    const res = await PUT(req("PUT", "/api/policies/locked-001", { premium_amount: 1 }), params);
    expect(res.status).toBe(403);
  });

  it("cannot update status on locked policy", async () => {
    asRole("employee");
    const res = await PUT(req("PUT", "/api/policies/locked-001", { status: "cancelled" }), params);
    expect(res.status).toBe(403);
  });

  it("cannot update customer_name on locked policy", async () => {
    asRole("employee");
    const res = await PUT(req("PUT", "/api/policies/locked-001", { customer_name: "Hacker" }), params);
    expect(res.status).toBe(403);
  });

  it("can update remark on locked policy", async () => {
    asRole("employee");
    const res = await PUT(req("PUT", "/api/policies/locked-001", { remark: "Requested review" }), params);
    expect(res.status).toBe(200);
  });
});

describe("Employee cannot access admin-only endpoints", () => {
  it("cannot delete a policy", async () => {
    asRole("employee");
    const res = await DELETE(req("DELETE", "/api/policies/locked-001"), params);
    expect(res.status).toBe(403);
  });

  it("cannot call lock endpoint", async () => {
    asRole("employee");
    const res = await lockPolicy(req("POST", "/api/policies/locked-001/lock", { lock: false }), params);
    expect(res.status).toBe(403);
  });
});

describe("Manager cannot perform admin-only actions", () => {
  it("manager cannot delete a policy", async () => {
    asRole("manager");
    const res = await DELETE(req("DELETE", "/api/policies/locked-001"), params);
    expect(res.status).toBe(403);
  });

  it("manager can call lock endpoint", async () => {
    asRole("manager");
    const res = await lockPolicy(req("POST", "/api/policies/locked-001/lock", { lock: true }), params);
    expect(res.status).toBe(200);
  });
});

describe("Auth header enforcement", () => {
  it("POST /api/policies returns 401 without token", async () => {
    const res = await createPolicy(noAuthReq("/api/policies", {}));
    expect(res.status).toBe(401);
  });

  it("PUT /api/policies/[id] returns 401 without token", async () => {
    const res = await PUT(noAuthReq("/api/policies/locked-001", {}), params);
    expect(res.status).toBe(401);
  });

  it("DELETE /api/policies/[id] returns 401 without token", async () => {
    const res = await DELETE(new NextRequest("http://localhost:3000/api/policies/locked-001", { method: "DELETE" }), params);
    expect(res.status).toBe(401);
  });

  it("POST /api/upload returns 401 without token", async () => {
    const res = await uploadRoute(noAuthReq("/api/upload", { path: "policies/test.pdf", mimeType: "application/pdf" }));
    expect(res.status).toBe(401);
  });
});

describe("Spoofed role in body is ignored", () => {
  it("employee claiming admin role in body cannot delete", async () => {
    asRole("employee");
    const res = await DELETE(req("DELETE", "/api/policies/locked-001", { role: "admin" }), params);
    expect(res.status).toBe(403);
  });

  it("employee claiming admin role in body cannot lock", async () => {
    asRole("employee");
    const res = await lockPolicy(req("POST", "/api/policies/locked-001/lock", { lock: false, role: "admin" }), params);
    expect(res.status).toBe(403);
  });
});

describe("Employee policy creation requires PDF", () => {
  it("employee gets 400 without pdf_url", async () => {
    asRole("employee");
    const res = await createPolicy(req("POST", "/api/policies", {
      policy_type: "motor",
      customer_id: "c1",
      customer_name: "Customer",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      premium_amount: 5000,
      assigned_to: "emp-uid",
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/pdf/i);
  });

  it("admin gets 201 without pdf_url", async () => {
    asRole("admin");
    const res = await createPolicy(req("POST", "/api/policies", {
      policy_type: "motor",
      customer_id: "c1",
      customer_name: "Customer",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      premium_amount: 5000,
      assigned_to: "admin-uid",
    }));
    expect(res.status).toBe(201);
  });
});

describe("Upload route path security", () => {
  it("rejects path traversal", async () => {
    asRole("admin");
    const res = await uploadRoute(req("POST", "/api/upload", { path: "../etc/passwd", mimeType: "application/pdf" }));
    expect(res.status).toBe(422);
  });

  it("rejects absolute path", async () => {
    asRole("admin");
    const res = await uploadRoute(req("POST", "/api/upload", { path: "/root/secrets", mimeType: "application/pdf" }));
    expect(res.status).toBe(422);
  });

  it("rejects unlisted prefix", async () => {
    asRole("admin");
    const res = await uploadRoute(req("POST", "/api/upload", { path: "system/config.pdf", mimeType: "application/pdf" }));
    expect(res.status).toBe(422);
  });

  it("rejects unsupported MIME type", async () => {
    asRole("admin");
    const res = await uploadRoute(req("POST", "/api/upload", { path: "policies/test.exe", mimeType: "application/x-msdownload" }));
    expect(res.status).toBe(422);
  });

  it("accepts valid path and MIME", async () => {
    asRole("admin");
    const res = await uploadRoute(req("POST", "/api/upload", { path: "policies/abc123.pdf", mimeType: "application/pdf", size: 500000 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.uploadUrl).toBeTruthy();
    expect(data.downloadUrl).toBeTruthy();
  });
});