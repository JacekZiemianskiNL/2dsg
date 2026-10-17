import { describe, expect, it } from "vitest";

import * as db from "./index";

describe("@devmentor/db public API", () => {
  it("exports the runtime API", () => {
    expect(Object.keys(db).sort()).toEqual(["closeOrm", "getOrm", "loadDatabaseEnv", "pingDatabase"]);
  });
});
