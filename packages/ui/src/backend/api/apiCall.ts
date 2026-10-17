import { ApiError, CSRF_HEADER, CSRF_HEADER_VALUE, type ApiErrorBody, type ApiResult } from "./types";

export interface ApiCallOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Serialized as JSON. */
  body?: unknown;
  signal?: AbortSignal;
}

const NETWORK_ERROR: ApiErrorBody = { code: "network_error", message: "Network error. Check your connection and try again." };
const INVALID_RESPONSE: ApiErrorBody = { code: "invalid_response", message: "Unexpected response from the server." };

/** Reads a response body as JSON; resolves to `undefined` for an empty or non-JSON body instead of throwing. */
export async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return isRecord(value) && typeof value.code === "string" && typeof value.message === "string";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * The only sanctioned `fetch()` to `/api/*`. Sends the CSRF header and JSON body, parses the response
 * envelope defensively, and never throws for HTTP or network failures; it returns `{ ok: false }` instead.
 * Aborts (via `signal`) still reject, so callers can ignore them.
 */
export async function apiCall<T>(path: string, options: ApiCallOptions = {}): Promise<ApiResult<T>> {
  if (!path.startsWith("/api/")) {
    throw new Error(`apiCall only calls this app's API (/api/*), got "${path}"`);
  }
  const headers: Record<string, string> = { Accept: "application/json", [CSRF_HEADER]: CSRF_HEADER_VALUE };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    // eslint-disable-next-line no-restricted-globals -- the single sanctioned fetch call site
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { ok: false, status: 0, error: NETWORK_ERROR };
  }

  const body = await readJsonSafe(response);
  if (isRecord(body) && body.ok === true && "data" in body) {
    return { ok: true, status: response.status, data: body.data as T };
  }
  if (isRecord(body) && body.ok === false && isErrorBody(body.error)) {
    return { ok: false, status: response.status, error: body.error };
  }
  return { ok: false, status: response.status, error: INVALID_RESPONSE };
}

/** Like `apiCall`, but returns the data directly and throws `ApiError` on failure. */
export async function apiCallOrThrow<T>(path: string, options?: ApiCallOptions): Promise<T> {
  const result = await apiCall<T>(path, options);
  if (!result.ok) throw new ApiError(result.status, result.error);
  return result.data;
}
