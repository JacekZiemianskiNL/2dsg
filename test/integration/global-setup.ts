import { randomBytes } from "node:crypto";

import type { TestProject } from "vitest/node";

import { assertAppBuilt, migrateDatabase, startApp, type AppServer } from "./app-server";
import { createBrowser } from "./browser";
import { startDatabase, type TestDatabase } from "./database";

declare module "vitest" {
  export interface ProvidedContext {
    appUrl: string;
    databaseUrl: string;
    browserSession: string;
  }
}

/** Starts an ephemeral database, migrates it, starts the built app against it, and tears it all down afterwards. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  assertAppBuilt();
  const browserSession = `devmentor-it-${randomBytes(4).toString("hex")}`;
  let database: TestDatabase | undefined;
  let app: AppServer | undefined;

  const teardown = async () => {
    await createBrowser(browserSession)
      .close()
      .catch(() => undefined); // nothing to close if no test opened a page
    await app?.stop();
    await database?.stop();
  };

  try {
    database = await startDatabase();
    migrateDatabase(database.url);
    app = await startApp({ databaseUrl: database.url });
  } catch (error) {
    await teardown();
    throw error;
  }

  project.provide("appUrl", app.url);
  project.provide("databaseUrl", database.url);
  project.provide("browserSession", browserSession);
  return teardown;
}
