import { ApiResponse } from "../types/api";

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail(error: string, errorCode?: string): ApiResponse<never> {
  const response: ApiResponse<never> = { success: false, error };
  if (errorCode) {
    response.errorCode = errorCode;
  }
  return response;
}

export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  constructor(message: string, statusCode = 400, errorCode = "API_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }

  static badRequest(message = "Bad Request", errorCode = "BAD_REQUEST") {
    return new ApiError(message, 400, errorCode);
  }

  static unauthorized(message = "Unauthorized", errorCode = "UNAUTHORIZED") {
    return new ApiError(message, 401, errorCode);
  }

  static forbidden(message = "Forbidden", errorCode = "ACCESS_DENIED") {
    return new ApiError(message, 403, errorCode);
  }

  static notFound(message = "Resource not found", errorCode = "NOT_FOUND") {
    return new ApiError(message, 404, errorCode);
  }

  static conflict(message = "Conflict found", errorCode = "CONFLICT") {
    return new ApiError(message, 409, errorCode);
  }

  static validation(
    message: "Validation error",
    errorCode = "VALIDATION_ERROR",
  ) {
    return new ApiError(message, 422, errorCode);
  }

  static internal(
    message = "Internal server error",
    errorCode = "INTERNAL_SERVER_ERROR",
  ) {
    return new ApiError(message, 500, errorCode);
  }
}
