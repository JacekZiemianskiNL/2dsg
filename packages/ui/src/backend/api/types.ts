// Mirrors the envelope produced by `apiHandler` in @devmentor/core (ui must not import core; keep in sync).
export type FieldErrors = Record<string, string[]>;

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
}

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: ApiErrorBody };

/** Custom header on every API request; the server rejects state-changing requests without it (CSRF). */
export const CSRF_HEADER = "x-devmentor-request";
export const CSRF_HEADER_VALUE = "1";

/** Thrown by `apiCallOrThrow`. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.status = status;
    this.fieldErrors = body.fieldErrors;
  }
}
