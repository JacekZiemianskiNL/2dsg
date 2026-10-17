import { z } from "zod";

// Unset and empty-string variables both fall back to the default.
const optionalInt = (fallback: number) =>
  z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().int().nonnegative().default(fallback));

const DEFAULT_POOL_MIN = 2;
const DEFAULT_POOL_MAX = 10;
// Without a timeout, acquiring a connection waits forever when the database is down.
const DEFAULT_CONNECT_TIMEOUT_MS = 5_000;

const databaseEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "must be a postgres:// or postgresql:// URL" }),
  DATABASE_POOL_MIN: optionalInt(DEFAULT_POOL_MIN),
  DATABASE_POOL_MAX: optionalInt(DEFAULT_POOL_MAX),
  DATABASE_CONNECT_TIMEOUT_MS: optionalInt(DEFAULT_CONNECT_TIMEOUT_MS),
});

export interface DatabaseConfig {
  url: string;
  pool: { min: number; max: number };
  connectTimeoutMs: number;
}

/** Reads and validates the database settings from environment variables. */
export function loadDatabaseEnv(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const result = databaseEnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid database environment:\n${z.prettifyError(result.error)}`);
  }
  const { DATABASE_URL, DATABASE_POOL_MIN, DATABASE_POOL_MAX, DATABASE_CONNECT_TIMEOUT_MS } = result.data;
  return {
    url: DATABASE_URL,
    pool: { min: DATABASE_POOL_MIN, max: DATABASE_POOL_MAX },
    connectTimeoutMs: DATABASE_CONNECT_TIMEOUT_MS,
  };
}
