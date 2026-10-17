import type { EntityManager, MikroORM } from "@devmentor/db";

import type { AppConfig } from "../config/env";
import type { Logger } from "../logger";
import type { HealthService } from "../services/health/health.service";

/** Every registration in the container. Add one line here per new dependency. */
export interface Cradle {
  config: AppConfig;
  logger: Logger;
  orm: MikroORM;
  /** Request-scoped; resolve it from a scope (`withScope`), never from the root container. */
  em: EntityManager;
  healthService: HealthService;
}
