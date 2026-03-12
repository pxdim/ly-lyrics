import { createBrowserClient } from "@supabase/ssr";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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
 * Supabase Client for Server (Server Components, API Routes)
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
            (cookiesToSet as Array<{ name: string; value: string; options?: unknown }>).forEach(
              ({ name, value, options }) =>
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
 * Service Role Client for API Routes (Node.js environment)
 * Use with caution - bypasses RLS!
 */
export const createServiceClient = () => {
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  console.log('[Supabase] URL:', supabaseUrl?.substring(0, 30) + '...');
  console.log('[Supabase] Service Key:', supabaseServiceKey ? 'Set' : 'Missing');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Admin Client for API Routes (uses service role key)
 */
export const createAdminClient = () => {
  return createServiceClient();
};
