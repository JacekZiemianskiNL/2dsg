import { pingDatabase, type EntityManager } from "@devmentor/db";

import { ServiceUnavailableError } from "../../http/errors";
import type { Logger } from "../../logger";

interface HealthServiceDeps {
  em: EntityManager;
  logger: Logger;
}

export interface HealthStatus {
  status: "ok";
  db: "ok";
}

export class HealthService {
  readonly #em: EntityManager;
  readonly #logger: Logger;

  constructor({ em, logger }: HealthServiceDeps) {
    this.#em = em;
    this.#logger = logger;
  }

  /** Throws `ServiceUnavailableError` when the database can't be reached; the cause is logged, never returned. */
  async check(): Promise<HealthStatus> {
    try {
      await pingDatabase(this.#em);
    } catch (error) {
      this.#logger.error({ err: error }, "Database health check failed");
      throw new ServiceUnavailableError("Database unavailable");
    }
    return { status: "ok", db: "ok" };
  }
}
