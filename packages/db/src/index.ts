import "server-only";

// The only package that imports @mikro-orm/*; other packages use these re-exported types.
export type { EntityManager, MikroORM } from "@mikro-orm/postgresql";

export { loadDatabaseEnv, type DatabaseConfig } from "./env";
export { closeOrm, getOrm } from "./orm";
export { pingDatabase } from "./health";
