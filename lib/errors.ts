/**
 * AuthePay domain errors.
 *
 * Errors are categorised so API routes can map them to correct HTTP status
 * codes without leaking internals.
 */

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function badRequest(message: string, code = "invalid_request"): ApiError {
  return new ApiError(400, code, message);
}

export function unauthorized(message = "Authentication required"): ApiError {
  return new ApiError(401, "unauthorized", message);
}

export function forbidden(message = "Insufficient permissions"): ApiError {
  return new ApiError(403, "forbidden", message);
}

export function notFound(message = "Not found"): ApiError {
  return new ApiError(404, "not_found", message);
}

export function conflict(message: string, code = "conflict"): ApiError {
  return new ApiError(409, code, message);
}

export function unprocessable(message: string, code = "unprocessable_entity"): ApiError {
  return new ApiError(422, code, message);
}

export function serviceUnavailable(
  message = "Service temporarily unavailable"
): ApiError {
  return new ApiError(503, "service_unavailable", message);
}

export class IdempotencyConflictError extends ApiError {
  constructor(message = "A transaction with this idempotency key already exists") {
    super(409, "idempotency_conflict", message);
    this.name = "IdempotencyConflictError";
  }
}

export class InsufficientFundsError extends ApiError {
  constructor(message = "Insufficient balance") {
    super(402, "insufficient_funds", message);
    this.name = "InsufficientFundsError";
  }
}

export class InvalidStateTransitionError extends ApiError {
  constructor(fromState: string, toState: string) {
    super(
      409,
      "invalid_state_transition",
      `Cannot move transaction from '${fromState}' to '${toState}'`
    );
    this.name = "InvalidStateTransitionError";
  }
}

export class ProviderError extends ApiError {
  constructor(message = "Payment provider error", status = 502) {
    super(status, "provider_error", message);
    this.name = "ProviderError";
  }
}

/** Raised when a provider integration lacks required credentials. */
export class ProviderNotConfiguredError extends ApiError {
  constructor(provider: string) {
    super(
      503,
      "provider_not_configured",
      `Payment provider '${provider}' is not configured. Set its credentials in the server environment and re-deploy.`
    );
    this.name = "ProviderNotConfiguredError";
  }
}

/** Raised when required server configuration is missing. */
export class ConfigurationError extends ApiError {
  constructor(message: string) {
    super(503, "server_not_configured", message);
    this.name = "ConfigurationError";
  }
}