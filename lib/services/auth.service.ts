/**
 * Supabase Auth Service
 */

import { supabase } from "@/lib/supabase/client";
import type { User } from "@/lib/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ── Named exports ─────────────────────────────────────────────────

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .single();
  if (profileError || !profile) throw new Error("User profile not found.");
  if (profile.status !== "active") {
    await supabase.auth.signOut();
    throw new Error("Account is inactive. Contact admin.");
  }
  return { ...profile, id: profile.id } as User;
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
}

export function onAuthStateChanged(
  callback: (user: SupabaseUser | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user ?? null);
    }
  );
  return () => subscription.unsubscribe();
}

/** Get the current access token for API calls */
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// ── Backward-compatible wrapper ───────────────────────────────────

export const authService = {
  loginWithEmail,
  logout,
  sendPasswordResetEmail,
  onAuthStateChanged,
  getAccessToken,
};
