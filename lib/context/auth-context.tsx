"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { User, UserRole } from "@/lib/types";
import type { Session } from "@supabase/supabase-js";

// ---- Session Config ----

let _sessionTimeoutMs =
  (parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES || "30", 10)) * 60 * 1000;

/** Called by AppSettingsProvider when session_timeout_minutes setting changes */
export function setSessionTimeoutMinutes(minutes: number) {
  _sessionTimeoutMs = minutes * 60 * 1000;
}

function getSessionTimeoutMs() {
  return _sessionTimeoutMs;
}

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
const COUNTDOWN_START_SEC = 60;
const SAFETY_BUFFER_MS = 5000;

// ---- Context Types ----

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  sessionCountdown: number | null;
  login: (email: string, password: string) => Promise<"staff" | "customer">;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---- Helper: load User profile from Supabase ----

async function loadUserProfile(userId: string, email?: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    uid: data.id,
    name: data.name ?? "",
    email: data.email ?? email ?? "",
    role: data.role as UserRole,
    status: data.status ?? "active",
    phone: data.phone ?? undefined,
    branch_id: data.branch_id ?? undefined,
    bio: data.bio ?? undefined,
    avatarUrl: data.avatar_url ?? undefined,
    lastLoginAt: data.last_login_at ?? undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as User;
}

async function loadCustomerPortalProfile(userId: string): Promise<{
  auth_user_id: string;
  customer_id: string;
  is_active: boolean;
} | null> {
  const { data, error } = await supabase
    .from("customer_portal_users")
    .select("auth_user_id, customer_id, is_active")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    auth_user_id: data.auth_user_id,
    customer_id: data.customer_id,
    is_active: Boolean(data.is_active),
  };
}

// ---- Provider ----

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCountdown, setSessionCountdown] = useState<number | null>(null);

  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionExpiryRef = useRef<number>(0);

  // ---- Cleanup timers ----

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSessionCountdown(null);
  }, []);

  // ---- Logout ----

  const logout = useCallback(async () => {
    clearTimers();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, [clearTimers]);

  // ---- Start session timer ----

  const startSessionTimer = useCallback(() => {
    clearTimers();
    const expiryTime = Date.now() + getSessionTimeoutMs();
    sessionExpiryRef.current = expiryTime;

    countdownIntervalRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((sessionExpiryRef.current - Date.now()) / 1000)
      );
      if (remaining <= COUNTDOWN_START_SEC && remaining > 0) {
        setSessionCountdown(remaining);
      } else {
        setSessionCountdown(null);
      }
    }, 1000);

    logoutTimerRef.current = setTimeout(() => {
      logout();
    }, getSessionTimeoutMs() + SAFETY_BUFFER_MS);
  }, [clearTimers, logout]);

  // ---- Reset timer on activity ----

  const resetSessionTimer = useCallback(() => {
    if (user) {
      sessionExpiryRef.current = Date.now() + getSessionTimeoutMs();
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(() => {
        logout();
      }, getSessionTimeoutMs() + SAFETY_BUFFER_MS);
    }
  }, [user, logout]);

  // ---- Activity listeners ----

  useEffect(() => {
    if (!user) return;
    const handler = () => resetSessionTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handler, { passive: true });
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handler);
      }
    };
  }, [user, resetSessionTimer]);

  // Guard: prevent onAuthStateChange from calling signOut while login() is in progress
  const loginInProgressRef = useRef(false);

  // ---- Supabase Auth state listener ----

  // Track whether the initial session has been handled to avoid
  // duplicate profile loads from getSession() + onAuthStateChange INITIAL_SESSION
  const initializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;         // React Strict Mode unmount guard

    async function handleSession(s: Session | null) {
      if (cancelled) return;
      try {
        if (s?.user) {
          const profile = await loadUserProfile(s.user.id, s.user.email);
          if (cancelled) return;
          if (profile && profile.status === "active") {
            setSession(s);
            setUser(profile);
            startSessionTimer();
          } else {
            const customerProfile = await loadCustomerPortalProfile(s.user.id);
            if (cancelled) return;

            if (customerProfile?.is_active) {
              // Customer sessions are valid for unified login handoff.
              setSession(s);
              setUser(null);
              startSessionTimer();
            } else {
              if (!loginInProgressRef.current) {
                await supabase.auth.signOut();
              }
              clearTimers();
              setSession(null);
              setUser(null);
            }
          }
        } else {
          clearTimers();
          setSession(null);
          setUser(null);
        }
      } catch (err) {
        console.error("[auth] handleSession critical error:", err);
        if (!cancelled) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Listen for auth state changes — this also fires INITIAL_SESSION
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (cancelled) return;
        console.debug("[auth] onAuthStateChange:", event, newSession?.user?.id);

        if (event === "INITIAL_SESSION") {
          initializedRef.current = true;
        }

        if (loginInProgressRef.current) {
          console.debug("[auth] Skipping onAuthStateChange during active login");
          if (!initializedRef.current) setLoading(false);
          return;
        }

        void Promise.resolve().then(async () => {
          await handleSession(newSession);
        });
      }
    );

    // Fallback: if onAuthStateChange hasn't fired INITIAL_SESSION within 3s,
    // resolve via getSession() to prevent infinite loading
    const fallbackTimer = setTimeout(async () => {
      if (!initializedRef.current && !cancelled) {
        console.debug("[auth] INITIAL_SESSION not received — fallback via getSession()");
        initializedRef.current = true;
        const { data: { session: s } } = await supabase.auth.getSession();
        await handleSession(s);
      }
    }, 3000);

    // Fail-safe: force loading=false after 10s regardless of results.
    const failSafeTimer = setTimeout(() => {
      if (!cancelled) {
        console.debug("[auth] Fail-safe timer triggered — forcing loading=false");
        setLoading(false);
      }
    }, 10000);

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      clearTimeout(failSafeTimer);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Login ----

  const login = useCallback(
    async (email: string, password: string) => {
      loginInProgressRef.current = true;
      try {
        return await doLogin(email, password);
      } finally {
        loginInProgressRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startSessionTimer]
  );

  // Internal login logic — separated so loginInProgressRef guard wraps it
  const doLogin = async (email: string, password: string): Promise<"staff" | "customer"> => {
      // ── Check login attempt limit (best-effort — don't block login if check fails) ──
      const emailKey = email.toLowerCase();
      console.log("[auth] doLogin: Supabase URL =", (supabase as any).supabaseUrl);
      try {
        console.log(`[auth] doLogin: checking limits for ${emailKey}`);
        const [attemptResult, maxResult] = await Promise.all([
          supabase.from("login_attempts").select("*").eq("email", emailKey).maybeSingle(),
          supabase.from("system_config").select("value").eq("key", "max_login_attempts").maybeSingle(),
        ]);
        console.log("[auth] doLogin: limit check results:", { attemptResult, maxResult });
        
        const parsed = maxResult.data ? parseInt(String(maxResult.data.value), 10) : NaN;
        const maxAttempts = Number.isNaN(parsed) || parsed <= 0 ? 5 : parsed;
        const current = attemptResult.data?.count || 0;
        const lockedUntil = attemptResult.data?.locked_until;

        // Check if locked out
        if (lockedUntil) {
          const lockTime = new Date(lockedUntil);
          if (lockTime > new Date()) {
            const mins = Math.ceil((lockTime.getTime() - Date.now()) / 60000);
            throw new Error(`Account locked due to too many failed attempts. Try again in ${mins} minute(s).`);
          }
          // Lock expired — reset via SECURITY DEFINER RPC (fire-and-forget)
          supabase.rpc("clear_login_attempts", { attempt_email: emailKey }).catch(() => {});
        }

        if (current >= maxAttempts && maxAttempts > 0) {
          // Track attempt to trigger lock via SECURITY DEFINER RPC
          supabase.rpc("track_login_attempt", { attempt_email: emailKey }).catch(() => {});
          throw new Error("Account locked due to too many failed attempts. Try again in 15 minutes.");
        }
      } catch (e) {
        // Only block login for lock errors — everything else is best-effort
        if (e instanceof Error && e.message.includes("locked")) throw e;
        console.warn("[auth] login attempt check failed, proceeding:", e);
      }

      console.log("[auth] doLogin: calling signInWithPassword...");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log("[auth] doLogin: signInWithPassword result:", { data, error });

      if (error) {
        // Login failed — track attempt via SECURITY DEFINER RPC (fire-and-forget)
        supabase.rpc("track_login_attempt", { attempt_email: emailKey }).catch(() => {});
        throw new Error(error.message);
      }

      const profile = await loadUserProfile(data.user.id, data.user.email);

      if (profile) {
        if (profile.status !== "active") {
          await supabase.auth.signOut();
          throw new Error("Account is inactive. Contact admin.");
        }

        // Login succeeded — reset attempt counter and update lastLoginAt (fire-and-forget)
        Promise.all([
          supabase.rpc("clear_login_attempts", { attempt_email: emailKey }),
          supabase.from("users").update({
            last_login_at: new Date().toISOString(),
          }).eq("id", data.user.id),
        ]).catch(() => {});

        setSession(data.session);
        setUser(profile);
        startSessionTimer();
        return "staff";
      }

      const customerProfile = await loadCustomerPortalProfile(data.user.id);
      if (!customerProfile) {
        await supabase.auth.signOut();
        throw new Error("User profile not found. Contact admin.");
      }

      if (!customerProfile.is_active) {
        await supabase.auth.signOut();
        throw new Error("Customer account is inactive. Contact support.");
      }

      // Successful customer login: clear attempts and keep session for redirect handoff.
      void supabase.rpc("clear_login_attempts", { attempt_email: emailKey }).catch(() => {});

      setSession(data.session);
      setUser(null);
      startSessionTimer();
      return "customer";
  };

  // ---- Refresh user ----

  const refreshUser = useCallback(async () => {
    if (!session?.user) return;
    const profile = await loadUserProfile(session.user.id, session.user.email);
    if (profile) setUser(profile);
  }, [session]);

  // ---- Context value ----

  const value: AuthContextType = {
    session,
    user,
    role: user?.role ?? null,
    loading,
    sessionCountdown,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---- Hook ----

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
