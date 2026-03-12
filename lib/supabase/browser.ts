/**
 * Supabase Browser Client
 *
 * Client-side Supabase client for use in Client Components.
 * This file has NO server-side dependencies.
 */

import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Client for Browser (Client Components)
 */
export const createClient = () =>
  createBrowserClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
  );

/**
 * Service Role Client (bypasses RLS - use with caution!)
 * Can be used in both client and server for service operations.
 */
export const createServiceClient = () => {
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("[Supabase] Missing environment variables for service client");
    // Return a no-op client to prevent crashes
    return createSupabaseClient(
      "https://placeholder.supabase.co",
      "placeholder-key",
      {
        auth: { persistSession: false },
      },
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
