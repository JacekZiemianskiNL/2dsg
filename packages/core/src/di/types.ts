import type { AwilixContainer } from "awilix";

import type { AppConfig } from "../config/env";

/** Registrations provided by @devmentor/core. */
export interface CoreCradle {
  config: AppConfig;
}

/** A package-level registration function, called by the app's composition root. */
export type RegisterFn<Deps extends unknown[] = []> = (container: AwilixContainer, ...deps: Deps) => void;
