// Entry point for the MikroORM CLI (see "mikro-orm.configPaths" in package.json).
// Runs in plain Node, so it must not import `server-only`.
import { createOrmConfig } from "./config";
import { loadDatabaseEnv } from "./env";

export default createOrmConfig(loadDatabaseEnv());
