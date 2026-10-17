import { pingDatabase, type EntityManager } from "@devmentor/db";

import type { Logger } from "../../logger";

interface HealthServiceDeps {
  em: EntityManager;
  logger: Logger;
}

export class HealthService {
  readonly #em: EntityManager;
  readonly #logger: Logger;

  constructor({ em, logger }: HealthServiceDeps) {
    this.#em = em;
    this.#logger = logger;
  }

  /** True when a trivial query succeeds; the cause of a failure is logged, never returned. */
  async isDatabaseAvailable(): Promise<boolean> {
    try {
      await pingDatabase(this.#em);
      return true;
    } catch (error) {
      this.#logger.error({ err: error }, "Database health check failed");
      return false;
    }
  }
}
