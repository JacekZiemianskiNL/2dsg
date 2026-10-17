import "server-only";

import { asClass, asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from "awilix";
import { getOrm } from "@devmentor/db";

import { loadConfig } from "../config/env";
import { getLogger } from "../logger";
import { HealthService } from "../services/health/health.service";
import type { Cradle } from "./cradle";

// Composition root. Every dependency is registered here by hand (no `loadModules`), so each binding is greppable.
async function buildContainer(): Promise<AwilixContainer<Cradle>> {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  const config = loadConfig();
  const orm = await getOrm(config.database);

  container.register({
    config: asValue(config),
    logger: asValue(getLogger()),
    orm: asValue(orm),
    em: asFunction(({ orm }: Cradle) => orm.em.fork()).scoped(),
    healthService: asClass(HealthService).scoped(),
  });
  return container;
}

// Cached per module instance, deliberately not on globalThis: Next.js bundles route handlers and pages
// separately and HMR re-evaluates modules, so a global container would hand out services (and error
// classes) from another module graph or stale code. The expensive part, the ORM's connection pool, is
// shared process-wide by getOrm(). A failed build is retried on the next call.
let containerPromise: Promise<AwilixContainer<Cradle>> | undefined;

export function getContainer(): Promise<AwilixContainer<Cradle>> {
  containerPromise ??= buildContainer().catch((error: unknown) => {
    containerPromise = undefined;
    throw error;
  });
  return containerPromise;
}

/** Runs `fn` with a fresh request scope (own EntityManager, scoped services) and disposes it afterwards. */
export async function withScope<T>(fn: (cradle: Cradle) => Promise<T>): Promise<T> {
  const scope = (await getContainer()).createScope();
  try {
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}
