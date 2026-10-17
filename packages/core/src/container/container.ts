import "server-only";

import { asClass, asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from "awilix";
import { getOrm } from "@devmentor/db";

import { loadConfig } from "../config/env";
import { createLogger } from "../logger";
import { HealthService } from "../services/health/health.service";
import type { Cradle } from "./cradle";

// Composition root. Every dependency is registered here by hand (no `loadModules`), so each binding is greppable.
async function buildContainer(): Promise<AwilixContainer<Cradle>> {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  const config = loadConfig();
  const orm = await getOrm(config.database);

  container.register({
    config: asValue(config),
    logger: asValue(createLogger(config.logLevel)),
    orm: asValue(orm),
    em: asFunction(({ orm }: Cradle) => orm.em.fork()).scoped(),
    healthService: asClass(HealthService).scoped(),
  });
  return container;
}

// Cached on globalThis so dev HMR doesn't rebuild it; a failed build is retried on the next call.
const globalForContainer = globalThis as typeof globalThis & {
  __devmentorContainer?: Promise<AwilixContainer<Cradle>>;
};

export function getContainer(): Promise<AwilixContainer<Cradle>> {
  globalForContainer.__devmentorContainer ??= buildContainer().catch((error: unknown) => {
    globalForContainer.__devmentorContainer = undefined;
    throw error;
  });
  return globalForContainer.__devmentorContainer;
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
