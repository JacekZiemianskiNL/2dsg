import { describe, expect, it } from "vitest";

import * as core from "./index";

describe("@devmentor/core public API", () => {
  it("exports the runtime API", () => {
    expect(Object.keys(core).sort()).toEqual(
      [
        "AppError",
        "CSRF_HEADER",
        "CSRF_HEADER_VALUE",
        "ConflictError",
        "ForbiddenError",
        "HealthService",
        "NotFoundError",
        "ServiceUnavailableError",
        "UnauthorizedError",
        "ValidationError",
        "apiHandler",
        "createLogger",
        "getContainer",
        "getLogger",
        "loadConfig",
        "makeCrudRoute",
        "parseJsonBody",
        "publicRoute",
        "withScope",
      ].sort(),
    );
  });
});
