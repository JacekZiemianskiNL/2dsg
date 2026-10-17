import pino, { type Logger } from "pino";

import type { LogLevel } from "./config/env";

export type { Logger };

// Never log secrets: these fields are replaced wherever they appear (top level or one level deep).
const REDACTED_KEYS = ["password", "passwordHash", "token", "accessToken", "refreshToken", "jwt", "secret", "authorization", "cookie"];
export const REDACT_PATHS = [
  ...REDACTED_KEYS,
  ...REDACTED_KEYS.map((key) => `*.${key}`),
  'req.headers["authorization"]',
  'req.headers["cookie"]',
];

export function createLogger(level: LogLevel): Logger {
  return pino({ level, redact: { paths: REDACT_PATHS, censor: "[REDACTED]" } });
}
