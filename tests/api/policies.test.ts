import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const state = vi.hoisted(() => ({
  caller: {
    uid: "uid-1",
    email: "test@bpaf.com",
    role: "admin",
    branch_id: "b1",
  },
  policyExists: true,
  policyCounter: 0,
  currentPolicy: {
    id: "policy-001",
    policy_number: "MOT-2026-0001",
    policy_type: "motor",
    customer_name: "Test Customer",
    locked_for_employee: false,
    verification_confirmed: false,
  } as Record<string, unknown>,
  lastInsertedPolicy: null as Record<string, unknown> | null,
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

      if (key === "policy_number_prefix") {
        return { data: { value: "MOT" }, error: null };
      }

      if (key === "auto_generate_policy_number") {
        return { data: { value: "true" }, error: null };
      }

      if (key.startsWith("policy_counter_")) {
        return state.policyCounter > 0
          ? { data: { value: { count: state.policyCounter } }, error: null }
          : { data: null, error: null };
      }

      return { data: null, error: null };
    }

    if (table === "policies") {
      if (queryState.insertPayload) {
        state.lastInsertedPolicy = queryState.insertPayload as Record<string, unknown>;
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

    if (table === "policy_verification_logs") {
      return { data: { id: "log-001" }, error: null };
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
  },
}));

vi.mock("@/lib/api/protect", () => ({
  protect: () => null,
}));

import { POST as createPolicy } from "@/app/api/policies/route";
import { DELETE, PUT } from "@/app/api/policies/[id]/route";
import { POST as lockPolicy } from "@/app/api/policies/[id]/lock/route";
import { POST as verifyPolicy } from "@/app/api/policies/[id]/verify/route";

const params = { params: Promise.resolve({ id: "policy-001" }) };

function setRole(role: "admin" | "manager" | "employee") {
  state.caller = {
    uid: `${role}-uid`,
    email: `${role}@bpaf.com`,
    role,
    branch_id: "b1",
  };
}

function makeRequest(method: "POST" | "PUT" | "DELETE", url: string, body?: unknown, role: "admin" | "manager" | "employee" = "admin") {
  setRole(role);
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
  });
}

describe("POST /api/policies", () => {
  const validBody = {
    policy_type: "motor",
    customer_id: "cust-1",
    customer_name: "John Doe",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    premium_amount: 10000,
    assigned_to: "agent-1",
    assigned_to_name: "Agent One",
    pdf_url: "policies/agent-1/test.pdf",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    state.policyExists = true;
    state.policyCounter = 0;
    state.lastInsertedPolicy = null;
    state.currentPolicy = {
      id: "policy-001",
      policy_number: "MOT-2026-0001",
      policy_type: "motor",
      customer_name: "Test Customer",
      locked_for_employee: false,
      verification_confirmed: false,
    };
  });

  it("returns 401 with no token", async () => {
    const req = new NextRequest("http://localhost:3000/api/policies", {
      method: "POST",
      body: JSON.stringify(validBody),
      headers: { "Content-Type": "application/json" },
    });
    const res = await createPolicy(req);
    expect(res.status).toBe(401);
  });

  it("admin can create policy without pdf_url", async () => {
    const { pdf_url: _pdf, ...body } = validBody;
    const res = await createPolicy(makeRequest("POST", "/api/policies", body, "admin"));
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.id).toBe("policy-001");
    expect(data.policy_number).toBe("MOT-2026-0001");
  });

  it("employee without pdf_url gets 400", async () => {
    const { pdf_url: _pdf, ...body } = validBody;
    const res = await createPolicy(makeRequest("POST", "/api/policies", body, "employee"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("PDF");
  });

  it("employee with pdf_url succeeds and policy is auto-locked", async () => {
    const res = await createPolicy(makeRequest("POST", "/api/policies", validBody, "employee"));
    expect(res.status).toBe(201);
    expect(state.lastInsertedPolicy?.locked_for_employee).toBe(true);
  });

  it("returns 400 when required field is missing", async () => {
    const { customer_name: _missing, ...body } = validBody;
    const res = await createPolicy(makeRequest("POST", "/api/policies", body, "admin"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("customer_name");
  });
});

describe("PUT /api/policies/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.policyExists = true;
    state.currentPolicy = {
      id: "policy-001",
      policy_number: "MOT-2026-0001",
      policy_type: "motor",
      customer_name: "Test Customer",
      locked_for_employee: false,
      verification_confirmed: false,
    };
  });

  it("admin can update unlocked policy", async () => {
    const res = await PUT(makeRequest("PUT", "/api/policies/policy-001", { status: "cancelled" }, "admin"), params);
    expect(res.status).toBe(200);
  });

  it("employee can update unlocked policy", async () => {
    const res = await PUT(makeRequest("PUT", "/api/policies/policy-001", { remark: "Updated" }, "employee"), params);
    expect(res.status).toBe(200);
  });

  it("employee cannot update non-remark fields on locked policy", async () => {
    state.currentPolicy = { ...state.currentPolicy, locked_for_employee: true };
    const res = await PUT(makeRequest("PUT", "/api/policies/policy-001", { premium_amount: 9999 }, "employee"), params);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("locked");
  });

  it("employee can update remark on locked policy", async () => {
    state.currentPolicy = { ...state.currentPolicy, locked_for_employee: true };
    const res = await PUT(makeRequest("PUT", "/api/policies/policy-001", { remark: "Remark only" }, "employee"), params);
    expect(res.status).toBe(200);
  });

  it("returns 404 for missing policy", async () => {
    state.policyExists = false;
    const res = await PUT(makeRequest("PUT", "/api/policies/missing", {}, "admin"), params);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/policies/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.policyExists = true;
  });

  it("admin can delete a policy", async () => {
    const res = await DELETE(makeRequest("DELETE", "/api/policies/policy-001", undefined, "admin"), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.deleted).toBe(true);
  });

  it("manager cannot delete", async () => {
    const res = await DELETE(makeRequest("DELETE", "/api/policies/policy-001", undefined, "manager"), params);
    expect(res.status).toBe(403);
  });

  it("employee cannot delete", async () => {
    const res = await DELETE(makeRequest("DELETE", "/api/policies/policy-001", undefined, "employee"), params);
    expect(res.status).toBe(403);
  });

  it("returns 404 if policy does not exist", async () => {
    state.policyExists = false;
    const res = await DELETE(makeRequest("DELETE", "/api/policies/missing", undefined, "admin"), params);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/policies/[id]/lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.policyExists = true;
    state.currentPolicy = {
      ...state.currentPolicy,
      locked_for_employee: false,
    };
  });

  it("admin can lock a policy", async () => {
    const res = await lockPolicy(makeRequest("POST", "/api/policies/policy-001/lock", { lock: true }, "admin"), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.locked_for_employee).toBe(true);
  });

  it("manager can unlock a policy", async () => {
    state.currentPolicy = { ...state.currentPolicy, locked_for_employee: true };
    const res = await lockPolicy(makeRequest("POST", "/api/policies/policy-001/lock", { lock: false }, "manager"), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.locked_for_employee).toBe(false);
  });

  it("employee cannot call lock endpoint", async () => {
    const res = await lockPolicy(makeRequest("POST", "/api/policies/policy-001/lock", {}, "employee"), params);
    expect(res.status).toBe(403);
  });

  it("toggles lock when lock field is omitted", async () => {
    const res = await lockPolicy(makeRequest("POST", "/api/policies/policy-001/lock", {}, "admin"), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.locked_for_employee).toBe(true);
  });
});

describe("POST /api/policies/[id]/verify", () => {
  const validChecks = {
    checks: {
      policyNumberCorrect: true,
      datesCorrect: true,
      premiumCorrect: true,
      customerCorrect: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    state.policyExists = true;
  });

  it("returns verification log id on success", async () => {
    const res = await verifyPolicy(makeRequest("POST", "/api/policies/policy-001/verify", validChecks, "admin"), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.verified).toBe(true);
    expect(data.log_id).toBe("log-001");
  });

  it("returns 422 if any check is false", async () => {
    const res = await verifyPolicy(
      makeRequest(
        "POST",
        "/api/policies/policy-001/verify",
        { checks: { ...validChecks.checks, premiumCorrect: false } },
        "admin"
      ),
      params
    );
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("premiumCorrect");
  });

  it("returns 400 if checks object is missing", async () => {
    const res = await verifyPolicy(makeRequest("POST", "/api/policies/policy-001/verify", {}, "admin"), params);
    expect(res.status).toBe(400);
  });

  it("returns 422 if a check has a non-boolean value", async () => {
    const res = await verifyPolicy(
      makeRequest(
        "POST",
        "/api/policies/policy-001/verify",
        { checks: { ...validChecks.checks, datesCorrect: "yes" } },
        "admin"
      ),
      params
    );
    expect(res.status).toBe(422);
  });

  it("returns 404 for unknown policy", async () => {
    state.policyExists = false;
    const res = await verifyPolicy(makeRequest("POST", "/api/policies/missing/verify", validChecks, "admin"), params);
    expect(res.status).toBe(404);
  });
});