import "server-only";

import { withScope } from "./scope";

/** Runs `select 1` through a request-scoped EntityManager. Logs the cause on failure. */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await withScope(({ em }) => em.execute("select 1"));
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}
