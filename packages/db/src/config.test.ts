import { Migrator } from "@mikro-orm/migrations";
import { describe, expect, it } from "vitest";

import { createOrmConfig } from "./config";
import { entities } from "./entities";

describe("createOrmConfig", () => {
  it("maps the database settings onto MikroORM options", () => {
    const config = createOrmConfig({ url: "postgresql://db/app", pool: { min: 1, max: 5 }, connectTimeoutMs: 1234 });
    expect(config).toMatchObject({
      clientUrl: "postgresql://db/app",
      pool: { min: 1, max: 5 },
      driverOptions: { connectionTimeoutMillis: 1234 },
      entities,
      discovery: { warnWhenNoEntities: false },
      migrations: { path: "./src/migrations", transactional: true, snapshotName: ".snapshot-devmentor" },
    });
    expect(config.extensions).toEqual([Migrator]);
  });
});
