import { ZodError, type z } from "zod";

import { getLogger, type Logger } from "../logger";
import { CSRF_HEADER, CSRF_HEADER_VALUE, type ApiFailure, type ApiSuccess } from "./envelope";
import { AppError, ForbiddenError, ValidationError } from "./errors";

/** Next.js route handler context; `params` holds the dynamic route segments. */
export interface RouteContext {
  params: Promise<Record<string, string | string[] | undefined>>;
}

export type RouteHandler = (request: Request, context: RouteContext) => Promise<Response>;

/**
 * Access check run before the handler. Throw `UnauthorizedError`/`ForbiddenError` to deny.
 * Any other error also denies (fail closed): it becomes a 500 and the handler never runs.
 */
export type Authorize = (request: Request) => void | Promise<void>;

/** Explicitly marks a route as public. */
export const publicRoute: Authorize = () => {};

export interface ApiHandlerOptions {
  /** Required so no route can forget access control; use `publicRoute` for public endpoints. */
  authorize: Authorize;
  /** Status for a successful response (default 200). */
  successStatus?: number;
  /** Overrides the shared logger (tests). */
  logger?: Logger;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// API responses are per-request data; never let a browser or proxy cache them.
const RESPONSE_HEADERS = { "Cache-Control": "no-store" };
const INTERNAL_ERROR: ApiFailure = { ok: false, error: { code: "internal_error", message: "Internal server error" } };

function assertCsrfHeader(request: Request): void {
  if (SAFE_METHODS.has(request.method)) return;
  if (request.headers.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
    throw new ForbiddenError("Missing or invalid request header");
  }
}

function toFailure(error: AppError): ApiFailure {
  return {
    ok: false,
    error: { code: error.code, message: error.message, ...(error.fieldErrors && { fieldErrors: error.fieldErrors }) },
  };
}

function errorResponse(error: unknown, request: Request, logger: Logger): Response {
  const appError = error instanceof ZodError ? ValidationError.fromZod(error) : error;
  if (appError instanceof AppError) {
    return Response.json(toFailure(appError), { status: appError.status, headers: RESPONSE_HEADERS });
  }
  logger.error({ err: error, method: request.method, path: new URL(request.url).pathname }, "Unhandled API error");
  return Response.json(INTERNAL_ERROR, { status: 500, headers: RESPONSE_HEADERS });
}

/**
 * Wraps a route handler: CSRF check → `authorize` → handler, and maps the result to the JSON envelope.
 * Thrown `AppError`s (and `ZodError`s) become their status code; anything else is logged and returned
 * as a generic 500 without details. Route handlers never write their own try/catch.
 */
export function apiHandler<T>(
  options: ApiHandlerOptions,
  handler: (request: Request, context: RouteContext) => Promise<T>,
): RouteHandler {
  return async (request, context) => {
    try {
      assertCsrfHeader(request);
      await options.authorize(request);
      const data = await handler(request, context);
      const body: ApiSuccess<T> = { ok: true, data };
      return Response.json(body, { status: options.successStatus ?? 200, headers: RESPONSE_HEADERS });
    } catch (error) {
      return errorResponse(error, request, options.logger ?? getLogger());
    }
  };
}

/** Parses a JSON request body through `schema`; only the parsed (explicitly typed) output is returned. */
export async function parseJsonBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError("Request body must be valid JSON", { cause: error });
  }
  return schema.parse(body);
}
