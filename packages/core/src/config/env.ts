import { loadDatabaseEnv, type DatabaseConfig } from "@devmentor/db";
import { z } from "zod";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const appEnvSchema = z.object({
  LOG_LEVEL: z.preprocess((value) => (value === "" ? undefined : value), z.enum(LOG_LEVELS).default("info")),
});

export interface AppConfig {
  logLevel: LogLevel;
  database: DatabaseConfig;
}

/** Reads and validates all configuration from environment variables. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = appEnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return {
    logLevel: result.data.LOG_LEVEL,
    database: loadDatabaseEnv(env),
  };
}
