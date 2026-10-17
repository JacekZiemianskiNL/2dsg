import { describe, expect, it } from "vitest";

import * as api from "./api";
import * as feedback from "./feedback";
import * as forms from "./forms";
import * as tables from "./tables";

describe("@devmentor/ui/backend public API", () => {
  it("exports each category's runtime API", () => {
    expect(Object.keys(api).sort()).toEqual(["ApiError", "CSRF_HEADER", "CSRF_HEADER_VALUE", "apiCall", "apiCallOrThrow", "readJsonSafe"]);
    expect(Object.keys(feedback).sort()).toEqual(["EmptyState", "ErrorMessage", "LoadingMessage"]);
    expect(Object.keys(forms)).toEqual(["CrudForm"]);
    expect(Object.keys(tables)).toEqual(["DataTable"]);
  });
});
