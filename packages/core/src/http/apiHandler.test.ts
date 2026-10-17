import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { captureLogs } from "../testing/captureLogs";
import { createLogger, getLogger } from "../logger";
import { apiHandler, parseJsonBody, publicRoute, type RouteContext } from "./apiHandler";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "./envelope";
import { ConflictError, NotFoundError, UnauthorizedError } from "./errors";

const context: RouteContext = { params: Promise.resolve({}) };
const csrf = { [CSRF_HEADER]: CSRF_HEADER_VALUE };

function request(method: string, options: { headers?: Record<string, string>; body?: string } = {}): Request {
  return new Request("http://localhost/api/things", { method, ...options });
}

function setup() {
  const logs = captureLogs();
  return { logs, logger: createLogger("info", logs.destination) };
}

describe("apiHandler", () => {
  it("wraps the handler result in the success envelope with no-store caching", async () => {
    const { logger } = setup();
    const response = await apiHandler({ authorize: publicRoute, logger }, async () => ({ id: "1" }))(request("GET"), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, data: { id: "1" } });
  });

  it("uses successStatus when given", async () => {
    const { logger } = setup();
    const handler = apiHandler({ authorize: publicRoute, successStatus: 201, logger }, async () => null);
    expect((await handler(request("POST", { headers: csrf }), context)).status).toBe(201);
  });

  it.each([
    [new NotFoundError("Booking not found"), 404, "not_found", "Booking not found"],
    [new ConflictError("Slot already booked"), 409, "conflict", "Slot already booked"],
  ])("maps a thrown %s to its status and the failure envelope", async (error, status, code, message) => {
    const { logger, logs } = setup();
    const response = await apiHandler({ authorize: publicRoute, logger }, async () => {
      throw error;
    })(request("GET"), context);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ ok: false, error: { code, message } });
    expect(logs.lines).toHaveLength(0);
  });

  it("maps a ZodError to 400 with field errors", async () => {
    const { logger } = setup();
    const response = await apiHandler({ authorize: publicRoute, logger }, async () => z.object({ name: z.string() }).parse({}))(
      request("GET"),
      context,
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.fieldErrors).toHaveProperty("name");
  });

  it("logs an unexpected error and returns a generic 500 without internal details", async () => {
    const { logger, logs } = setup();
    const response = await apiHandler({ authorize: publicRoute, logger }, async () => {
      throw new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2");
    })(request("GET"), context);
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ ok: false, error: { code: "internal_error", message: "Internal server error" } });
    expect(text).not.toMatch(/ECONNREFUSED|hunter2|stack/);
    expect(logs.lines).toHaveLength(1);
    expect(logs.lines[0]).toMatchObject({ level: 50, method: "GET", path: "/api/things", msg: "Unhandled API error" });
  });

  describe("CSRF", () => {
    it.each(["POST", "PUT", "PATCH", "DELETE"])("rejects %s without the custom header before running the handler", async (method) => {
      const { logger } = setup();
      const handler = vi.fn(async () => "ran");
      const response = await apiHandler({ authorize: publicRoute, logger }, handler)(request(method), context);
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("forbidden");
      expect(handler).not.toHaveBeenCalled();
    });

    it("rejects a wrong header value", async () => {
      const { logger } = setup();
      const response = await apiHandler({ authorize: publicRoute, logger }, async () => "ran")(
        request("POST", { headers: { [CSRF_HEADER]: "yes" } }),
        context,
      );
      expect(response.status).toBe(403);
    });

    it("allows safe methods without the header", async () => {
      const { logger } = setup();
      expect((await apiHandler({ authorize: publicRoute, logger }, async () => "ok")(request("GET"), context)).status).toBe(200);
    });
  });

  describe("authorize", () => {
    it("denies with the thrown AppError and never runs the handler", async () => {
      const { logger } = setup();
      const handler = vi.fn(async () => "secret");
      const authorize = () => {
        throw new UnauthorizedError();
      };
      const response = await apiHandler({ authorize, logger }, handler)(request("GET"), context);
      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it("fails closed when the check itself crashes", async () => {
      const { logger } = setup();
      const handler = vi.fn(async () => "secret");
      const authorize = async () => {
        throw new TypeError("session store unreachable");
      };
      const response = await apiHandler({ authorize, logger }, handler)(request("GET"), context);
      expect(response.status).toBe(500);
      expect(handler).not.toHaveBeenCalled();
    });

    it("runs after the CSRF check", async () => {
      const { logger } = setup();
      const authorize = vi.fn();
      await apiHandler({ authorize, logger }, async () => "ok")(request("DELETE"), context);
      expect(authorize).not.toHaveBeenCalled();
    });
  });
});

describe("parseJsonBody", () => {
  const schema = z.object({ title: z.string() });

  it("returns only the parsed output (unknown fields stripped)", async () => {
    const body = JSON.stringify({ title: "Hi", id: "attacker-id", status: "confirmed" });
    expect(await parseJsonBody(request("POST", { body }), schema)).toEqual({ title: "Hi" });
  });

  it("rejects malformed JSON as a validation error", async () => {
    await expect(parseJsonBody(request("POST", { body: "{not json" }), schema)).rejects.toMatchObject({
      status: 400,
      message: "Request body must be valid JSON",
    });
  });
});

describe("apiHandler default logger", () => {
  const globalForLogger = globalThis as typeof globalThis & { __devmentorLogger?: unknown };

  afterEach(() => {
    delete globalForLogger.__devmentorLogger;
  });

  it("logs unexpected errors through the shared logger when none is given", async () => {
    delete globalForLogger.__devmentorLogger;
    const logs = captureLogs();
    getLogger(logs.destination);
    const response = await apiHandler({ authorize: publicRoute }, async () => {
      throw new Error("boom");
    })(request("GET"), context);
    expect(response.status).toBe(500);
    expect(logs.lines).toEqual([expect.objectContaining({ msg: "Unhandled API error" })]);
  });
});
