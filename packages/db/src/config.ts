import { defineConfig } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";

import { entities } from "./entities";
import type { DatabaseConfig } from "./env";

/** MikroORM options shared by the app runtime and the MikroORM CLI. */
export function createOrmConfig(config: DatabaseConfig) {
  return defineConfig({
    clientUrl: config.url,
    pool: config.pool,
    // Passed through to the `pg` Pool.
    driverOptions: { connectionTimeoutMillis: config.connectTimeoutMs },
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
