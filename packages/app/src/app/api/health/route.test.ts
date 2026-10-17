// @vitest-environment node
import { ServiceUnavailableError, type Cradle } from "@devmentor/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { connection, withScope, check } = vi.hoisted(() => {
  const check = vi.fn();
  return {
    check,
    connection: vi.fn(async () => {}),
    withScope: vi.fn(<T,>(fn: (cradle: Cradle) => Promise<T>) => fn({ healthService: { check } } as unknown as Cradle)),
  };
});
vi.mock("next/server", () => ({ connection }));
vi.mock("@devmentor/core", async (importOriginal) => ({ ...(await importOriginal<typeof import("@devmentor/core")>()), withScope }));

const { GET } = await import("./route");
const context = { params: Promise.resolve({}) };

beforeEach(() => {
  check.mockReset();
});

describe("GET /api/health", () => {
  it("opts into request-time rendering and returns the health status", async () => {
    check.mockResolvedValue({ status: "ok", db: "ok" });
    const response = await GET(new Request("http://localhost/api/health"), context);
    expect(connection).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok", db: "ok" } });
  });

  it("returns 503 without internal details when the database is down", async () => {
    check.mockRejectedValue(new ServiceUnavailableError("Database unavailable"));
    const response = await GET(new Request("http://localhost/api/health"), context);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: { code: "service_unavailable", message: "Database unavailable" } });
  });
});
