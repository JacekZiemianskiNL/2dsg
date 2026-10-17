import { afterEach, describe, expect, it, vi } from "vitest";

import { apiCall, apiCallOrThrow, readJsonSafe } from "./apiCall";
import { ApiError, CSRF_HEADER } from "./types";

function respond(body: string, status = 200) {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiCall", () => {
  it("sends the CSRF header, JSON body and same-origin credentials", async () => {
    const fetchMock = respond(JSON.stringify({ ok: true, data: { id: "1" } }), 201);
    await apiCall("/api/things", { method: "POST", body: { name: "x" } });
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe("/api/things");
    expect(init).toMatchObject({ method: "POST", body: '{"name":"x"}', credentials: "same-origin", cache: "no-store" });
    expect(init?.headers).toMatchObject({ [CSRF_HEADER]: "1", "Content-Type": "application/json" });
  });

  it("sends no Content-Type without a body", async () => {
    const fetchMock = respond(JSON.stringify({ ok: true, data: [] }));
    await apiCall("/api/things");
    expect(fetchMock.mock.calls[0]![1]?.headers).not.toHaveProperty("Content-Type");
  });

  it("returns the data of a success envelope", async () => {
    respond(JSON.stringify({ ok: true, data: { id: "1" } }), 201);
    expect(await apiCall("/api/things")).toEqual({ ok: true, status: 201, data: { id: "1" } });
  });

  it("returns the error of a failure envelope, including fieldErrors", async () => {
    const error = { code: "validation_failed", message: "Validation failed", fieldErrors: { name: ["Required"] } };
    respond(JSON.stringify({ ok: false, error }), 400);
    expect(await apiCall("/api/things")).toEqual({ ok: false, status: 400, error });
  });

  it.each([
    ["an HTML error page", "<html>502 Bad Gateway</html>", 502],
    ["an empty body", "", 200],
    ["JSON that isn't an envelope", JSON.stringify({ hello: "world" }), 200],
  ])("treats %s as invalid_response", async (_, body, status) => {
    respond(body, status);
    expect(await apiCall("/api/things")).toMatchObject({ ok: false, status, error: { code: "invalid_response" } });
  });

  it("returns network_error when the request can't be made", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect(await apiCall("/api/things")).toMatchObject({ ok: false, status: 0, error: { code: "network_error" } });
  });

  it("rethrows aborts", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new DOMException("aborted", "AbortError"))));
    await expect(apiCall("/api/things")).rejects.toMatchObject({ name: "AbortError" });
  });

  it("refuses paths outside /api/", async () => {
    const fetchMock = respond("{}");
    await expect(apiCall("https://evil.example/steal")).rejects.toThrow(/only calls this app's API/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("apiCallOrThrow", () => {
  it("returns data on success", async () => {
    respond(JSON.stringify({ ok: true, data: 42 }));
    expect(await apiCallOrThrow<number>("/api/answer")).toBe(42);
  });

  it("throws ApiError with code, status and fieldErrors on failure", async () => {
    respond(JSON.stringify({ ok: false, error: { code: "conflict", message: "Slot taken", fieldErrors: { slotId: ["Taken"] } } }), 409);
    const error = await apiCallOrThrow("/api/bookings").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Slot taken", code: "conflict", status: 409, fieldErrors: { slotId: ["Taken"] } });
  });
});

describe("readJsonSafe", () => {
  it("parses JSON and returns undefined for empty or invalid bodies", async () => {
    expect(await readJsonSafe(new Response('{"a":1}'))).toEqual({ a: 1 });
    expect(await readJsonSafe(new Response(""))).toBeUndefined();
    expect(await readJsonSafe(new Response("nope"))).toBeUndefined();
  });
});
