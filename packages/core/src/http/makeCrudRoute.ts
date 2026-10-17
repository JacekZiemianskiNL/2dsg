import { z } from "zod";

import { withScope } from "../container/container";
import type { Cradle } from "../container/cradle";
import type { Logger } from "../logger";
import { apiHandler, parseJsonBody, type Authorize, type RouteContext, type RouteHandler } from "./apiHandler";
import { ValidationError } from "./errors";

export interface ListQuery {
  page: number;
  pageSize: number;
}

export interface ListResult<TItem> {
  items: TItem[];
  total: number;
}

/** The service methods a plain CRUD resource exposes; services throw `AppError`s (e.g. `NotFoundError`). */
export interface CrudService<TItem, TCreate, TUpdate> {
  list(query: ListQuery): Promise<ListResult<TItem>>;
  create(input: TCreate): Promise<TItem>;
  update(id: string, input: TUpdate): Promise<TItem>;
  delete(id: string): Promise<void>;
}

export type ScopeRunner = <T>(fn: (cradle: Cradle) => Promise<T>) => Promise<T>;

export interface MakeCrudRouteOptions<TItem, TCreate, TUpdate> {
  /** Access checks for reads (GET) and writes (POST/PUT/DELETE); both are required. */
  access: { read: Authorize; write: Authorize };
  createSchema: z.ZodType<TCreate>;
  updateSchema: z.ZodType<TUpdate>;
  /** Picks the scoped service from the request's container scope. */
  service: (cradle: Cradle) => CrudService<TItem, TCreate, TUpdate>;
  /** Overrides how a request scope is created (tests). */
  runInScope?: ScopeRunner;
  logger?: Logger;
}

const DEFAULT_PAGE_SIZE = 20;
// Upper bound so a single request can't ask for an unbounded result set.
const MAX_PAGE_SIZE = 100;

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

const idSchema = z.string().trim().min(1, "id is required");

async function readId(request: Request, context: RouteContext): Promise<string> {
  const fromParams = (await context.params).id;
  const raw = typeof fromParams === "string" ? fromParams : new URL(request.url).searchParams.get("id");
  const result = idSchema.safeParse(raw ?? "");
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

function readListQuery(request: Request): ListQuery {
  const params = new URL(request.url).searchParams;
  return listQuerySchema.parse({
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
  });
}

/**
 * Builds `{ GET, POST, PUT, DELETE }` for a plain CRUD resource, to re-export from `route.ts`.
 * Bodies are parsed through the schemas and only the parsed output reaches the service (no mass assignment).
 * The id comes from a `[id]` route segment or the `?id=` query parameter.
 * Workflow endpoints (booking, payment, …) use `apiHandler` directly instead.
 */
export function makeCrudRoute<TItem, TCreate, TUpdate>(
  options: MakeCrudRouteOptions<TItem, TCreate, TUpdate>,
): { GET: RouteHandler; POST: RouteHandler; PUT: RouteHandler; DELETE: RouteHandler } {
  const runInScope = options.runInScope ?? withScope;
  const read = { authorize: options.access.read, logger: options.logger };
  const write = { authorize: options.access.write, logger: options.logger };

  return {
    GET: apiHandler(read, async (request) => {
      const query = readListQuery(request);
      const result = await runInScope((cradle) => options.service(cradle).list(query));
      return { ...result, ...query };
    }),
    POST: apiHandler({ ...write, successStatus: 201 }, async (request) => {
      const input = await parseJsonBody(request, options.createSchema);
      return runInScope((cradle) => options.service(cradle).create(input));
    }),
    PUT: apiHandler(write, async (request, context) => {
      const id = await readId(request, context);
      const input = await parseJsonBody(request, options.updateSchema);
      return runInScope((cradle) => options.service(cradle).update(id, input));
    }),
    DELETE: apiHandler(write, async (request, context) => {
      const id = await readId(request, context);
      await runInScope((cradle) => options.service(cradle).delete(id));
      return null;
    }),
  };
}
