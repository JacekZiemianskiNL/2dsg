import "server-only";

import { createContainer, InjectionMode, type AwilixContainer } from "awilix";
import { registerCore, type CoreCradle } from "@devmentor/core";
import { getOrm, registerDb, type DbCradle } from "@devmentor/db";

export type Cradle = CoreCradle & DbCradle;

// Composition root. Cached on globalThis so dev HMR doesn't rebuild it.
const globalForContainer = globalThis as typeof globalThis & {
  __devmentorContainer?: Promise<AwilixContainer<Cradle>>;
};

async function buildContainer(): Promise<AwilixContainer<Cradle>> {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  registerCore(container);
  registerDb(container, await getOrm(container.cradle.config));
  return container;
}

export function getContainer(): Promise<AwilixContainer<Cradle>> {
  globalForContainer.__devmentorContainer ??= buildContainer().catch((error: unknown) => {
    globalForContainer.__devmentorContainer = undefined;
    throw error;
  });
  return globalForContainer.__devmentorContainer;
}
