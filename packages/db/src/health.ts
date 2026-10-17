import type { EntityManager } from "@mikro-orm/postgresql";

/** Round-trips a trivial query; rejects if the database can't be reached. */
export async function pingDatabase(em: EntityManager): Promise<void> {
  await em.execute("select 1");
}
