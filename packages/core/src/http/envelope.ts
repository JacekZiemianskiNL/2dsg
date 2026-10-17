import type { FieldErrors } from "./errors";

// The JSON envelope every API route returns. `@devmentor/ui` declares a matching `ApiResult` type
// (ui must not import core); keep the two shapes in sync.
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: { code: string; message: string; fieldErrors?: FieldErrors };
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/** Custom header `apiCall` sends on every request; state-changing requests without it are rejected (CSRF). */
export const CSRF_HEADER = "x-devmentor-request";
export const CSRF_HEADER_VALUE = "1";
