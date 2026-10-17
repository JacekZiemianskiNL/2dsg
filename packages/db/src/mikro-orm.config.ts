// Entry point for the MikroORM CLI (see "mikro-orm.configPaths" in package.json).
// Runs in plain Node, so it must not import `server-only`.
import { loadConfig } from "@devmentor/core";

import { createOrmConfig } from "./config";

export default createOrmConfig(loadConfig());
