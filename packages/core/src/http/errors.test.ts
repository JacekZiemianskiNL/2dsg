import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
} from "./errors";

describe("AppError hierarchy", () => {
  it.each([
    [new ValidationError(), 400, "validation_failed"],
    [new UnauthorizedError(), 401, "unauthorized"],
    [new ForbiddenError(), 403, "forbidden"],
    [new NotFoundError(), 404, "not_found"],
    [new ConflictError(), 409, "conflict"],
    [new ServiceUnavailableError(), 503, "service_unavailable"],
  ])("%s maps to %i / %s", (error, status, code) => {
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(error.constructor.name);
  });

  it("keeps the cause without exposing it in the message", () => {
    const cause = new Error("db password=hunter2");
    const error = new NotFoundError("Booking not found", { cause });
    expect(error.message).toBe("Booking not found");
    expect(error.cause).toBe(cause);
  });
});

describe("ValidationError.fromZod", () => {
  const schema = z.object({ email: z.email(), profile: z.object({ rate: z.number().positive() }) });

  it("groups issues by dot-separated field path", () => {
    const result = schema.safeParse({ email: "nope", profile: { rate: -1 } });
    if (result.success) throw new Error("expected failure");
    const error = ValidationError.fromZod(result.error);
    expect(error.message).toBe("Validation failed");
    expect(Object.keys(error.fieldErrors ?? {})).toEqual(["email", "profile.rate"]);
  });

  it("uses a root-level issue as the message", () => {
    const result = z.string().safeParse(42);
    if (result.success) throw new Error("expected failure");
    const error = ValidationError.fromZod(result.error);
    expect(error.message).toMatch(/string/i);
    expect(error.fieldErrors).toEqual({});
  });
});
