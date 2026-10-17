import { defineConfig } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import type { AppConfig } from "@devmentor/core";

import { entities } from "./entities";

/** MikroORM options shared by the app runtime and the MikroORM CLI. */
export function createOrmConfig(config: AppConfig) {
  return defineConfig({
    clientUrl: config.databaseUrl,
    pool: config.databasePool,
    // Passed through to the `pg` Pool; without it, acquiring a connection waits forever when the database is down.
    driverOptions: { connectionTimeoutMillis: config.databaseConnectTimeoutMs },
    entities,
    discovery: { warnWhenNoEntities: false },
    extensions: [Migrator],
    migrations: {
      path: "./src/migrations",
      transactional: true,
      // Fixed name so the committed schema snapshot is the same on every machine (default: database name).
      snapshotName: ".snapshot-devmentor",
    },
  });
}
