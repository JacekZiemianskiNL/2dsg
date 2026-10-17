import { asFunction } from "awilix";

import { loadConfig } from "./config/env";
import type { RegisterFn } from "./di/types";

export const registerCore: RegisterFn = (container) => {
  container.register({
    config: asFunction(loadConfig).singleton(),
  });
};
