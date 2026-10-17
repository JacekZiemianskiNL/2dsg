import "server-only";

import { getContainer, type Cradle } from "./container";

/** Runs `fn` with a fresh request scope (own EntityManager, etc.) and disposes it afterwards. */
export async function withScope<T>(fn: (cradle: Cradle) => Promise<T>): Promise<T> {
  const scope = (await getContainer()).createScope();
  try {
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}
