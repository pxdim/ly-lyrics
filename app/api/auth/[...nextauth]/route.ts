/**
 * NextAuth.js API Route Handler
 *
 * Next.js 15 App Router API route for NextAuth.js.
 * Handles all authentication endpoints: signin, signout, session, etc.
 *
 * @module app/api/auth/[...nextauth]/route
 */

import NextAuth from "next-auth";
import type { AuthOptions } from "next-auth";
import { authConfig } from "@/lib/auth/config";

// ============================================================================
// Handler Configuration
// ============================================================================

const nextAuthSecret: string = process.env["NEXTAUTH_SECRET"] || "fallback-secret-change-in-production";

const handler = NextAuth({
  ...authConfig,
  secret: nextAuthSecret,
} as unknown as AuthOptions);

// ============================================================================
// Export Handlers
// ============================================================================

export { handler as GET, handler as POST };
