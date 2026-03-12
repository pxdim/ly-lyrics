/**
 * PostgreSQL Database Client
 *
 * Direct PostgreSQL connection using node-postgres.
 * Replaces Supabase client with self-hosted solution.
 *
 * @module lib/db/client
 */

import { Pool, PoolConfig, QueryResult, PoolClient } from "pg";
import { logError } from "@/lib/errors/AppError";

// ============================================================================
// Configuration
// ============================================================================

interface DatabaseConfig {
  /** Database connection string */
  connectionString: string;
  /** Maximum number of clients in the pool */
  max?: number;
  /** Minimum number of clients in the pool */
  min?: number;
  /** Milliseconds to wait for a connection */
  connectionTimeoutMillis?: number;
  /** Milliseconds a client can sit idle before being closed */
  idleTimeoutMillis?: number;
}

// Default pool configuration for Railway PostgreSQL
const DEFAULT_POOL_CONFIG: Partial<PoolConfig> = {
  max: 20, // Railway PostgreSQL mini plan: max 20 connections
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// ============================================================================
// Pool Singleton
// ============================================================================

let pool: Pool | null = null;

/**
 * Initialize the database connection pool
 *
 * @throws {Error} If DATABASE_URL is not set
 */
export function initPool(config?: DatabaseConfig): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = config?.connectionString || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Please set the environment variable."
    );
  }

  const poolConfig: PoolConfig = {
    connectionString,
    ...DEFAULT_POOL_CONFIG,
    ...(config?.max !== undefined && { max: config.max }),
    ...(config?.min !== undefined && { min: config.min }),
    ...(config?.connectionTimeoutMillis !== undefined && {
      connectionTimeoutMillis: config.connectionTimeoutMillis,
    }),
    ...(config?.idleTimeoutMillis !== undefined && {
      idleTimeoutMillis: config.idleTimeoutMillis,
    }),
  };

  pool = new Pool(poolConfig);

  // Log pool events for monitoring
  pool.on("connect", () => {
    console.log("[DB] New client connected");
  });

  pool.on("error", (err) => {
    console.error("[DB] Unexpected error on idle client", err);
    logError(err, { location: "db-pool" });
  });

  pool.on("remove", () => {
    console.log("[DB] Client removed");
  });

  return pool;
}

/**
 * Get the database connection pool
 * Creates pool if it doesn't exist
 */
export function getPool(): Pool {
  if (!pool) {
    return initPool();
  }
  return pool;
}

/**
 * Close the database connection pool
 *
 * Use this for graceful shutdown or testing
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Execute a query and return the result
 *
 * @param text - SQL query text
 * @param params - Query parameters
 * @returns QueryResult
 * @throws {DatabaseError} If query fails
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const pool = getPool();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Log slow queries (> 100ms)
    if (duration > 100) {
      console.warn(`[DB] Slow query (${duration}ms):`, {
        query: text.substring(0, 100),
        params,
      });
    }

    return result;
  } catch (error) {
    console.error("[DB] Query error:", {
      query: text.substring(0, 100),
      params,
      error,
    });

    // Enhance error with context
    const dbError = error as Error;
    dbError.message = `Database query failed: ${dbError.message}`;

    throw dbError;
  }
}

/**
 * Execute a query and return the first row
 * Returns null if no rows found
 *
 * @param text - SQL query text
 * @param params - Query parameters
 * @returns First row or null
 */
export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a query within a transaction
 *
 * @param callback - Function to execute within transaction
 * @returns Result of callback
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check database connection health
 *
 * @returns true if database is reachable
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape SQL identifier to prevent SQL injection
 * Note: For most queries, use parameterized queries instead
 */
export function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Build INSERT query with returning clause
 */
export function buildInsertQuery(
  table: string,
  data: Record<string, unknown>,
  returning?: string
): { text: string; params: unknown[] } {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

  const text = returning
    ? `INSERT INTO ${escapeIdentifier(table)} (${columns
        .map(escapeIdentifier)
        .join(", ")}) VALUES (${placeholders}) RETURNING ${returning}`
    : `INSERT INTO ${escapeIdentifier(table)} (${columns
        .map(escapeIdentifier)
        .join(", ")}) VALUES (${placeholders})`;

  return { text, params: values };
}

/**
 * Build UPDATE query with where clause and returning
 */
export function buildUpdateQuery(
  table: string,
  data: Record<string, unknown>,
  where: string,
  whereParams: unknown[],
  returning?: string
): { text: string; params: unknown[] } {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns
    .map((col, i) => `${escapeIdentifier(col)} = $${i + 1}`)
    .join(", ");

  let text = `UPDATE ${escapeIdentifier(table)} SET ${setClause} WHERE ${where}`;
  let params = [...values, ...whereParams];

  if (returning) {
    text += ` RETURNING ${returning}`;
  }

  return { text, params };
}

/**
 * Build DELETE query with returning
 */
export function buildDeleteQuery(
  table: string,
  where: string,
  whereParams: unknown[],
  returning?: string
): { text: string; params: unknown[] } {
  let text = `DELETE FROM ${escapeIdentifier(table)} WHERE ${where}`;

  if (returning) {
    text += ` RETURNING ${returning}`;
  }

  return { text, params: whereParams };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if error is a PostgreSQL unique violation
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "23505" // unique_violation
  );
}

/**
 * Check if error is a PostgreSQL foreign key violation
 */
export function isForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "23503" // foreign_key_violation
  );
}
