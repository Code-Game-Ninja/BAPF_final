/**
 * Auth Service Tests
 *
 * Tests authentication operations against Supabase Auth.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Supabase mock ----

const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockResetPassword = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

function mockChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(onFulfilled(resolvedValue));
  return chain;
}

let currentMock = mockChain({ data: null, error: null });

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => currentMock),
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPassword(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

import { loginWithEmail, logout, sendPasswordResetEmail, getAccessToken, onAuthStateChanged } from "@/lib/services/auth.service";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMock = mockChain({ data: null, error: null });
  });

  describe("loginWithEmail", () => {
    it("signs in and returns user profile from users table", async () => {
      const authUser = { id: "u1", email: "admin@bpaf.com" };
      const dbUser = { id: "u1", name: "Admin", email: "admin@bpaf.com", role: "admin", status: "active" };

      mockSignIn.mockResolvedValue({ data: { user: authUser, session: {} }, error: null });
      currentMock = mockChain({ data: dbUser, error: null });

      const result = await loginWithEmail("admin@bpaf.com", "password123");

      expect(mockSignIn).toHaveBeenCalledWith({ email: "admin@bpaf.com", password: "password123" });
      expect(result).toEqual(dbUser);
    });

    it("throws when auth fails", async () => {
      mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: "Invalid credentials" } });

      await expect(loginWithEmail("bad@email.com", "wrong")).rejects.toThrow("Invalid credentials");
    });

    it("signs out and throws when user is inactive", async () => {
      const authUser = { id: "u1", email: "admin@bpaf.com" };
      const dbUser = { id: "u1", name: "Admin", email: "admin@bpaf.com", role: "admin", status: "inactive" };

      mockSignIn.mockResolvedValue({ data: { user: authUser, session: {} }, error: null });
      mockSignOut.mockResolvedValue({ error: null });
      currentMock = mockChain({ data: dbUser, error: null });

      await expect(loginWithEmail("admin@bpaf.com", "password")).rejects.toThrow();
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("calls supabase signOut", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await logout();

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("calls supabase resetPasswordForEmail", async () => {
      mockResetPassword.mockResolvedValue({ error: null });

      await sendPasswordResetEmail("admin@bpaf.com");

      expect(mockResetPassword).toHaveBeenCalledWith("admin@bpaf.com");
    });
  });

  describe("getAccessToken", () => {
    it("returns token from current session", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "jwt-token-123" } },
        error: null,
      });

      const token = await getAccessToken();

      expect(token).toBe("jwt-token-123");
    });

    it("returns null when no session exists", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const token = await getAccessToken();
      expect(token).toBeNull();
    });
  });

  describe("onAuthStateChanged", () => {
    it("subscribes to auth state changes and returns unsubscribe fn", () => {
      const unsubscribe = vi.fn();
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe } },
      });

      const callback = vi.fn();
      const unsub = onAuthStateChanged(callback);

      expect(mockOnAuthStateChange).toHaveBeenCalled();
      expect(typeof unsub).toBe("function");
    });
  });
});
