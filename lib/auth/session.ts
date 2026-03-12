/**
 * Session Helpers
 *
 * Helper functions for working with NextAuth sessions in server components
 * and API routes.
 *
 * @module lib/auth/session
 */

import { getServerSession } from "next-auth";
import type { AuthOptions, Session } from "next-auth";
import { authConfig } from "./config";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors/AppError";

// NextAuth v4 authOptions（供 getServerSession 使用）
const nextAuthSecret: string = process.env["NEXTAUTH_SECRET"] || "fallback-secret-change-in-production";

const authOptions: AuthOptions = {
  ...authConfig,
  secret: nextAuthSecret,
} as unknown as AuthOptions;

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

// ============================================================================
// Session Helpers
// ============================================================================

/**
 * Get the current session from the server
 * @returns The session or null if not authenticated
 */
export async function getSession(): Promise<Session | null> {
  return await getServerSession(authOptions);
}

/**
 * Get the current authenticated user
 * @returns The authenticated user or null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

/**
 * Require authentication - redirects to sign in if not authenticated
 * @returns The authenticated user
 * @throws Redirects to /auth/signin if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return user;
}

/**
 * Get user ID for database queries
 * Falls back to demo user ID if not authenticated (for demo mode)
 * @returns The user ID
 */
export async function getUserId(): Promise<string> {
  const user = await getCurrentUser();

  if (user) {
    return user.id;
  }

  // Demo 使用者由 Go 後端管理
  return "00000000-0000-0000-0000-000000000001";
}

/**
 * Check if the current user is the demo user
 * @returns true if the current user is the demo user
 */
export async function isDemoUser(): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  return user.id === "00000000-0000-0000-0000-000000000001";
}

/**
 * Require a specific user or admin
 * @param allowedIds Array of allowed user IDs
 * @throws AppError if user is not authorized
 */
export async function requireUser(allowedIds: string[]): Promise<AuthUser> {
  const user = await requireAuth();

  if (!allowedIds.includes(user.id)) {
    throw new AppError(
      "AUTH_FORBIDDEN",
      "You don't have permission to access this resource",
      undefined,
      "error"
    );
  }

  return user;
}

/**
 * Middleware helper to check authentication in API routes
 * @returns The authenticated user or throws an error
 */
export async function apiAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AppError(
      "AUTH_UNAUTHORIZED",
      "Authentication required",
      undefined,
      "error"
    );
  }

  return user;
}
