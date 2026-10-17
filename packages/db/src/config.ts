import { defineConfig } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import type { AppConfig } from "@devmentor/core";

import { entities } from "./entities";

/** MikroORM options shared by the app runtime and the MikroORM CLI. */
export function createOrmConfig(config: AppConfig) {
  return defineConfig({
    clientUrl: config.databaseUrl,
    pool: config.databasePool,
    entities,
    discovery: { warnWhenNoEntities: false },
    extensions: [Migrator],
    migrations: {
      path: "./src/migrations",
      transactional: true,
    },
  });
}
