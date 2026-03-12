/**
 * Password Hashing Utilities
 *
 * Uses bcrypt for secure password hashing and verification.
 *
 * @module lib/auth/password
 */

import bcrypt from "bcrypt";

// ============================================================================
// Constants
// ============================================================================

/**
 * Number of salt rounds for bcrypt
 * - 10 is the default and recommended value
 * - Higher values = more secure but slower
 */
const SALT_ROUNDS = 10;

/**
 * Minimum password length
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Maximum password length (bcrypt limit is 72 bytes)
 */
const MAX_PASSWORD_LENGTH = 72;

// ============================================================================
// Hashing Functions
// ============================================================================

/**
 * Hash a password using bcrypt
 *
 * @param password - Plain text password
 * @returns Hashed password
 * @throws {Error} If password is too short or too long
 */
export async function hashPassword(password: string): Promise<string> {
  // Validate password length
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`
    );
  }

  // Hash password
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  return hash;
}

/**
 * Verify a password against a hash
 *
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns true if password matches hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 *
 * @param password - Password to validate
 * @returns Validation result with strength score
 */
export function validatePassword(password: string): {
  valid: boolean;
  strength: "weak" | "medium" | "strong";
  issues: string[];
} {
  const issues: string[] = [];
  let strengthScore = 0;

  // Length check
  if (password.length < 8) {
    issues.push("Password must be at least 8 characters");
  } else if (password.length >= 12) {
    strengthScore += 1;
  }

  if (password.length >= 16) {
    strengthScore += 1;
  }

  // Character variety
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLowercase, hasUppercase, hasNumber, hasSpecial].filter(
    Boolean
  ).length;

  if (varietyCount < 2) {
    issues.push("Password should contain mixed characters");
  } else if (varietyCount >= 3) {
    strengthScore += 1;
  }

  // Determine strength
  let strength: "weak" | "medium" | "strong" = "weak";
  if (strengthScore >= 2) {
    strength = "strong";
  } else if (strengthScore >= 1) {
    strength = "medium";
  }

  return {
    valid: issues.length === 0 && password.length >= MIN_PASSWORD_LENGTH,
    strength,
    issues,
  };
}

/**
 * Generate a random password for demo accounts
 *
 * @param length - Length of password (default 16)
 * @returns Random password
 */
export function generateRandomPassword(length: number = 16): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}

/**
 * Hash the demo user password
 * This creates a bcrypt hash for "password123"
 */
export async function getDemoUserHash(): Promise<string> {
  return await hashPassword("password123");
}
