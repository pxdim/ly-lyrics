/**
 * NextAuth.js API Route Handler
 *
 * Next.js 15 App Router API route for NextAuth.js.
 * Handles all authentication endpoints: signin, signout, session, etc.
 *
 * @module app/api/auth/[...nextauth]/route
 */

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// ============================================================================
// Handler Configuration
// ============================================================================

const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});

// ============================================================================
// Export Handlers
// ============================================================================

export const { GET, POST } = handlers;

// ============================================================================
// Export Auth Functions
// ============================================================================

export { auth, signIn, signOut };
