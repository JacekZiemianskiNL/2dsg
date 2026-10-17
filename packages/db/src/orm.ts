import { MikroORM } from "@mikro-orm/postgresql";

import { createOrmConfig } from "./config";
import type { DatabaseConfig } from "./env";

// Cached on globalThis so dev HMR reuses one connection pool per process.
const globalForOrm = globalThis as typeof globalThis & {
  __devmentorOrm?: Promise<MikroORM>;
};

/** Returns the process-wide MikroORM instance, initializing it on first use. */
export function getOrm(config: DatabaseConfig): Promise<MikroORM> {
  globalForOrm.__devmentorOrm ??= MikroORM.init(createOrmConfig(config)).catch((error: unknown) => {
    globalForOrm.__devmentorOrm = undefined;
    throw error;
  });
  return globalForOrm.__devmentorOrm;
}

/** Closes the connection pool and forgets the cached instance. */
export async function closeOrm(): Promise<void> {
  const orm = globalForOrm.__devmentorOrm;
  globalForOrm.__devmentorOrm = undefined;
  if (orm) await (await orm).close();
}
