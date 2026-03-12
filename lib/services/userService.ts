/**
 * User Service
 *
 * User CRUD operations using direct PostgreSQL connection.
 * Replaces Supabase user management.
 *
 * @module lib/services/userService
 */

import type { User, UserInsert, UserUpdate } from "@/lib/db/types";
import { query, queryOne, buildInsertQuery, isUniqueViolation } from "@/lib/db/client";
import { hashPassword, getDemoUserHash } from "@/lib/auth/password";
import { AppError, createNotFoundError } from "@/lib/errors/AppError";

// ============================================================================
// Types
// ============================================================================

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  name?: string;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const result = await queryOne<User>(
    `SELECT * FROM users WHERE id = $1`,
    [id]
  );
  return result;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await queryOne<User>(
    `SELECT * FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  return result;
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  // Check if email already exists
  const existing = await getUserByEmail(input.email);
  if (existing) {
    throw new AppError(
      "AUTH_INVALID_CREDENTIALS",
      "Email already registered",
      undefined,
      "error",
      { metadata: { email: input.email } }
    );
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Insert user
  const { text, params } = buildInsertQuery("users", {
    email: input.email.toLowerCase(),
    password_hash: passwordHash,
    name: input.name || null,
    email_verified: false,
  });

  const result = await queryOne<User>(text + " RETURNING *", params);

  if (!result) {
    throw new AppError(
      "SYS_INTERNAL_ERROR",
      "Failed to create user"
    );
  }

  return result;
}

/**
 * Update user
 */
export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const updates: UserUpdate = {};

  if (input.email !== undefined) {
    updates.email = input.email.toLowerCase();
  }

  if (input.password !== undefined) {
    updates.password_hash = await hashPassword(input.password);
  }

  if (input.name !== undefined) {
    updates.name = input.name;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(
      "SONG_INVALID_FORMAT",
      "At least one field must be provided for update"
    );
  }

  const result = await queryOne<User>(
    `UPDATE users SET ${Object.entries(updates)
      .map(([key, value], i) => `${key} = $${i + 1}`)
      .join(", ")}, updated_at = NOW() WHERE id = $${Object.keys(updates).length + 1} RETURNING *`,
    [...Object.values(updates), id]
  );

  if (!result) {
    throw createNotFoundError("User", id);
  }

  return result;
}

/**
 * Delete user (soft delete by removing user_id references)
 * Note: Actual deletion should be handled by CASCADE
 */
export async function deleteUser(id: string): Promise<boolean> {
  // Check if user exists
  const user = await getUserById(id);
  if (!user) {
    throw createNotFoundError("User", id);
  }

  // Delete user (CASCADE will handle related records)
  const result = await query(
    `DELETE FROM users WHERE id = $1 RETURNING id`,
    [id]
  );

  return result.rowCount > 0;
}

/**
 * Verify user credentials
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  const { verifyPassword: checkPassword } = await import("@/lib/auth/password");
  const isValid = await checkPassword(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  return user;
}

/**
 * Ensure demo user exists
 * Creates demo user if not exists
 */
export async function ensureDemoUser(): Promise<User> {
  const demoEmail = "demo@ly-lyrics.local";
  let user = await getUserByEmail(demoEmail);

  if (!user) {
    // Create demo user
    const passwordHash = await getDemoUserHash();

    const result = await queryOne<User>(
      `INSERT INTO users (id, email, password_hash, name, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
       RETURNING *`,
      [
        "00000000-0000-0000-0000-000000000001",
        demoEmail,
        passwordHash,
        "Demo User",
        true,
      ]
    );

    user = result;
  }

  return user;
}
