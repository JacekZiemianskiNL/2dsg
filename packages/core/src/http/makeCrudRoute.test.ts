import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { Cradle } from "../container/cradle";
import { createLogger } from "../logger";
import { publicRoute, type Authorize, type RouteContext } from "./apiHandler";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "./envelope";
import { ForbiddenError, NotFoundError } from "./errors";
import { makeCrudRoute, type CrudService, type ScopeRunner } from "./makeCrudRoute";

interface Thing {
  id: string;
  name: string;
}
const createSchema = z.object({ name: z.string().min(1) });
const updateSchema = createSchema.partial();
type CreateThing = z.infer<typeof createSchema>;
type UpdateThing = z.infer<typeof updateSchema>;

const noParams: RouteContext = { params: Promise.resolve({}) };
const csrf = { [CSRF_HEADER]: CSRF_HEADER_VALUE, "content-type": "application/json" };

function setup(access: { read: Authorize; write: Authorize } = { read: publicRoute, write: publicRoute }) {
  const service = {
    list: vi.fn<CrudService<Thing, CreateThing, UpdateThing>["list"]>(async () => ({ items: [{ id: "1", name: "a" }], total: 1 })),
    create: vi.fn<CrudService<Thing, CreateThing, UpdateThing>["create"]>(async (input) => ({ id: "new", ...input })),
    update: vi.fn<CrudService<Thing, CreateThing, UpdateThing>["update"]>(async (id, input) => ({ id, name: input.name ?? "" })),
    delete: vi.fn<CrudService<Thing, CreateThing, UpdateThing>["delete"]>(async () => {}),
  };
  const fakeCradle = {} as Cradle;
  const runInScope: ScopeRunner = (fn) => fn(fakeCradle);
  const routes = makeCrudRoute({
    access,
    createSchema,
    updateSchema,
    service: () => service,
    runInScope,
    logger: createLogger("silent"),
  });
  return { routes, service };
}

const url = (query = "") => `http://localhost/api/things${query}`;

describe("makeCrudRoute", () => {
  it("GET lists with default pagination", async () => {
    const { routes, service } = setup();
    const response = await routes.GET(new Request(url()), noParams);
    expect(service.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(await response.json()).toEqual({ ok: true, data: { items: [{ id: "1", name: "a" }], total: 1, page: 1, pageSize: 20 } });
  });

  it("GET parses page and pageSize and caps pageSize", async () => {
    const { routes, service } = setup();
    await routes.GET(new Request(url("?page=3&pageSize=50")), noParams);
    expect(service.list).toHaveBeenCalledWith({ page: 3, pageSize: 50 });
    const tooBig = await routes.GET(new Request(url("?pageSize=1000")), noParams);
    expect(tooBig.status).toBe(400);
    expect((await tooBig.json()).error.fieldErrors).toHaveProperty("pageSize");
  });

  it("POST passes only schema-parsed fields to the service (no mass assignment) and returns 201", async () => {
    const { routes, service } = setup();
    const body = JSON.stringify({ name: "Rust", id: "attacker", ownerId: "someone-else" });
    const response = await routes.POST(new Request(url(), { method: "POST", headers: csrf, body }), noParams);
    expect(response.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith({ name: "Rust" });
  });

  it("POST rejects invalid input with field errors and does not call the service", async () => {
    const { routes, service } = setup();
    const response = await routes.POST(new Request(url(), { method: "POST", headers: csrf, body: JSON.stringify({ name: "" }) }), noParams);
    expect(response.status).toBe(400);
    expect((await response.json()).error.fieldErrors).toHaveProperty("name");
    expect(service.create).not.toHaveBeenCalled();
  });

  it("PUT takes the id from the query string or the [id] route segment", async () => {
    const { routes, service } = setup();
    const init = { method: "PUT", headers: csrf, body: JSON.stringify({ name: "Go" }) };
    await routes.PUT(new Request(url("?id=abc"), init), noParams);
    expect(service.update).toHaveBeenLastCalledWith("abc", { name: "Go" });
    await routes.PUT(new Request(url(), init), { params: Promise.resolve({ id: "from-segment" }) });
    expect(service.update).toHaveBeenLastCalledWith("from-segment", { name: "Go" });
  });

  it("PUT and DELETE require an id", async () => {
    const { routes, service } = setup();
    const put = await routes.PUT(new Request(url(), { method: "PUT", headers: csrf, body: "{}" }), noParams);
    const del = await routes.DELETE(new Request(url(), { method: "DELETE", headers: csrf }), noParams);
    expect([put.status, del.status]).toEqual([400, 400]);
    expect(service.update).not.toHaveBeenCalled();
    expect(service.delete).not.toHaveBeenCalled();
  });

  it("DELETE returns null data", async () => {
    const { routes, service } = setup();
    const response = await routes.DELETE(new Request(url("?id=abc"), { method: "DELETE", headers: csrf }), noParams);
    expect(service.delete).toHaveBeenCalledWith("abc");
    expect(await response.json()).toEqual({ ok: true, data: null });
  });

  it("passes service AppErrors through", async () => {
    const { routes, service } = setup();
    service.delete.mockRejectedValueOnce(new NotFoundError("Thing not found"));
    const response = await routes.DELETE(new Request(url("?id=missing"), { method: "DELETE", headers: csrf }), noParams);
    expect(response.status).toBe(404);
  });

  it("applies the read check to GET and the write check to POST/PUT/DELETE", async () => {
    const deny = () => {
      throw new ForbiddenError();
    };
    const readOnly = setup({ read: publicRoute, write: deny });
    expect((await readOnly.routes.GET(new Request(url()), noParams)).status).toBe(200);
    const post = await readOnly.routes.POST(new Request(url(), { method: "POST", headers: csrf, body: JSON.stringify({ name: "x" }) }), noParams);
    const del = await readOnly.routes.DELETE(new Request(url("?id=1"), { method: "DELETE", headers: csrf }), noParams);
    expect([post.status, del.status]).toEqual([403, 403]);
    expect(readOnly.service.create).not.toHaveBeenCalled();

    const writeOnly = setup({ read: deny, write: publicRoute });
    expect((await writeOnly.routes.GET(new Request(url()), noParams)).status).toBe(403);
    expect(writeOnly.service.list).not.toHaveBeenCalled();
  });
});
