import type { z } from "zod";

/** Field path (dot-separated) → messages, rendered next to the matching form field. */
export type FieldErrors = Record<string, string[]>;

/**
 * Base class for errors that services throw and `apiHandler` maps to an HTTP response.
 * `message` is shown to the client, so it must never contain internal details.
 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  readonly fieldErrors?: FieldErrors;

  constructor(message: string, options: { cause?: unknown; fieldErrors?: FieldErrors } = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.fieldErrors = options.fieldErrors;
  }
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = "validation_failed";

  constructor(message = "Validation failed", options: { cause?: unknown; fieldErrors?: FieldErrors } = {}) {
    super(message, options);
  }

  static fromZod(error: z.ZodError): ValidationError {
    const fieldErrors: FieldErrors = {};
    const formErrors: string[] = [];
    for (const issue of error.issues) {
      if (issue.path.length === 0) {
        formErrors.push(issue.message);
        continue;
      }
      const key = issue.path.join(".");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return new ValidationError(formErrors[0] ?? "Validation failed", { cause: error, fieldErrors });
  }
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = "unauthorized";

  constructor(message = "Authentication required", options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = "forbidden";

  constructor(message = "Access denied", options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "not_found";

  constructor(message = "Resource not found", options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = "conflict";

  constructor(message = "Conflict", options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class ServiceUnavailableError extends AppError {
  readonly status = 503;
  readonly code = "service_unavailable";

  constructor(message = "Service unavailable", options?: { cause?: unknown }) {
    super(message, options);
  }
}
