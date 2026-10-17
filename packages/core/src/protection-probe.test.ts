import { expect, it } from "vitest";

// Throwaway: proves branch protection blocks merging a red PR. Never merged.
it("fails on purpose", () => {
  expect(1).toBe(2);
});
