export interface AppConfig {
  databaseUrl: string;
  databasePool: { min: number; max: number };
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Environment variable ${name} must be a non-negative integer, got "${raw}"`);
  }
  return value;
}

/** Reads and validates configuration from environment variables. */
export function loadConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Environment variable DATABASE_URL is required");
  }
  return {
    databaseUrl,
    databasePool: {
      min: readInt("DATABASE_POOL_MIN", 2),
      max: readInt("DATABASE_POOL_MAX", 10),
    },
  };
}
