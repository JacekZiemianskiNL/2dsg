import { asFunction, asValue } from "awilix";
import type { EntityManager, MikroORM } from "@mikro-orm/postgresql";
import type { RegisterFn } from "@devmentor/core";

/** Registrations provided by @devmentor/db. */
export interface DbCradle {
  orm: MikroORM;
  /** Request-scoped EntityManager; resolve it from a scope, never from the root container. */
  em: EntityManager;
}

export const registerDb: RegisterFn<[orm: MikroORM]> = (container, orm) => {
  container.register({
    orm: asValue(orm),
    em: asFunction(({ orm }: DbCradle) => orm.em.fork()).scoped(),
  });
};
