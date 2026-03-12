/**
 * Supabase Server Client
 *
 * Server-side Supabase client for use in Server Components and API Routes.
 * This file uses next/headers which is only available on the server.
 */

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase Client for Server (Server Components, API Routes)
 * Uses next/cookies for cookie management.
 */
export const createServerClient = async () => {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: unknown[]) {
          try {
            (
              cookiesToSet as Array<{
                name: string;
                value: string;
                options?: unknown;
              }>
            ).forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    },
  );
};

/**
 * Admin Client for API Routes (uses service role key)
 */
export const createAdminClient = () => {
  const { createServiceClient } = require("./browser");
  return createServiceClient();
};
