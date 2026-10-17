import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("joins conditional classes and resolves Tailwind conflicts", () => {
    const isActive = false;
    expect(cn("px-2 py-1", isActive && "bg-blue-500", { "text-white": true }, "px-4")).toBe("py-1 text-white px-4");
  });
});
