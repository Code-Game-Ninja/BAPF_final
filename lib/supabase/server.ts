import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-side Supabase client using the service_role key.
 * Bypasses RLS — use only in API routes and server actions.
 */
export function createServiceClient() {
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (!isBuildPhase) {
       throw new Error("Supabase environment variables are missing");
    }
  }

  return createSupabaseClient<Database>(
    supabaseUrl || "https://placeholder-url.supabase.co",
    supabaseServiceRoleKey || "placeholder-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Singleton for server-side usage
let _serviceClient: ReturnType<typeof createServiceClient> | null = null;

export function getServiceClient() {
  if (!_serviceClient) {
    _serviceClient = createServiceClient();
  }
  return _serviceClient;
}

export const supabaseAdmin = getServiceClient();

export const createAdminClient = createServiceClient;
