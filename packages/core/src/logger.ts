import pino, { type DestinationStream, type Logger } from "pino";

import { loadLogLevel, type LogLevel } from "./config/env";

export type { Logger };

// Never log secrets: these fields are replaced wherever they appear (top level or one level deep).
const REDACTED_KEYS = ["password", "passwordHash", "token", "accessToken", "refreshToken", "jwt", "secret", "authorization", "cookie"];
export const REDACT_PATHS = [
  ...REDACTED_KEYS,
  ...REDACTED_KEYS.map((key) => `*.${key}`),
  'req.headers["authorization"]',
  'req.headers["cookie"]',
];
const CENSOR = "[REDACTED]";

export function createLogger(level: LogLevel, destination?: DestinationStream): Logger {
  return pino({ level, redact: { paths: REDACT_PATHS, censor: CENSOR } }, destination);
}

const globalForLogger = globalThis as typeof globalThis & { __devmentorLogger?: Logger };

/**
 * The process-wide logger, also registered in the container as `logger`.
 * Available even when the rest of the configuration is invalid, so configuration errors can be logged.
 */
export function getLogger(): Logger {
  if (globalForLogger.__devmentorLogger) return globalForLogger.__devmentorLogger;
  let level: LogLevel = "info";
  let levelError: unknown;
  try {
    level = loadLogLevel();
  } catch (error) {
    levelError = error;
  }
  const logger = createLogger(level);
  if (levelError) logger.warn({ err: levelError }, "Invalid LOG_LEVEL; using info");
  globalForLogger.__devmentorLogger = logger;
  return logger;
}
