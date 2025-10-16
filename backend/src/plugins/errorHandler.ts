import fp from "fastify-plugin";
import {
  FastifyInstance,
  FastifyError,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { ApiError, fail } from "../utils/response.js";

// Error code mapping for validation patterns
// Maps field + validation keyword to error codes for i18n (Accessibility module)
const VALIDATION_ERROR_CODES: Record<string, Record<string, string>> = {
  password: {
    pattern: "PASSWORD_TOO_WEAK",
    minLength: "PASSWORD_TOO_SHORT",
    maxLength: "PASSWORD_TOO_LONG",
  },
  username: {
    pattern: "USERNAME_INVALID",
    minLength: "USERNAME_TOO_SHORT",
    maxLength: "USERNAME_TOO_LONG",
  },
  email: {
    format: "EMAIL_INVALID",
  },
  identifier: {
    pattern: "IDENTIFIER_INVALID",
    minLength: "IDENTIFIER_TOO_SHORT",
  },
};

// Human-readable error messages for backend logging and API responses
const VALIDATION_ERROR_MESSAGES: Record<string, Record<string, string>> = {
  password: {
    pattern: "Password must contain uppercase, lowercase, and numbers",
    minLength: "Password must be at least 8 characters long",
    maxLength: "Password is too long",
  },
  username: {
    pattern:
      "Username can only contain letters, numbers, underscore, and hyphen",
    minLength: "Username must be at least 2 characters long",
    maxLength: "Username is too long",
  },
  email: {
    format: "Please enter a valid email address",
  },
  identifier: {
    pattern: "Identifier cannot contain spaces",
    minLength: "Identifier is too short",
  },
};

// Get error code for validation error (for frontend i18n)
function getValidationErrorCode(field: string, keyword: string): string {
  return VALIDATION_ERROR_CODES[field]?.[keyword] || "VALIDATION_ERROR";
}

// Get human-readable error message
function getValidationErrorMessage(field: string, keyword: string): string {
  return (
    VALIDATION_ERROR_MESSAGES[field]?.[keyword] || `${field} validation failed`
  );
}

// Type guard to check if error has validation property
// Fixes TypeScript error while maintaining runtime safety
function isValidationError(
  error: FastifyError | ApiError,
): error is FastifyError & Required<Pick<FastifyError, "validation">> {
  return "validation" in error && Array.isArray(error.validation);
}

// Parse Fastify validation error and extract relevant details
function parseValidationError(error: FastifyError): {
  message: string;
  errorCode: string;
  field: string;
} {
  if (!error.validation || !error.validation.length) {
    return {
      message: "Validation failed",
      errorCode: "VALIDATION_ERROR",
      field: "unknown",
    };
  }

  // Get the first validation error
  const validationError = error.validation[0];
  if (!validationError) {
    return {
      message: "Validation failed",
      errorCode: "VALIDATION_ERROR",
      field: "unknown",
    };
  }

  // Extract field name from instance path or missing property
  const field =
    validationError.instancePath?.replace("/", "") ||
    validationError.params?.missingProperty ||
    "unknown";

  const keyword = validationError.keyword;

  // Handle special cases
  if (keyword === "required") {
    const missingField =
      (validationError.params?.missingProperty as string) || "field";
    return {
      message: `${missingField.charAt(0).toUpperCase() + missingField.slice(1)} is required`,
      errorCode: "REQUIRED_FIELD_MISSING",
      field: missingField,
    };
  }

  const fieldName = String(field);
  const errorCode = getValidationErrorCode(fieldName, keyword);
  const message = getValidationErrorMessage(fieldName, keyword);

  return { message, errorCode, field: fieldName };
}

// Error handler plugin for ft_transcendence
// Handles validation, API, Prisma, and authentication errors
async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler(
    (
      error: FastifyError | ApiError,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => {
      if (isValidationError(error)) {
        const { message, errorCode, field } = parseValidationError(error);

        // Enhanced logging for backend debugging
        request.log.error(
          {
            validation: {
              field,
              keyword: error.validation[0]?.keyword,
              errorCode,
            },
            url: request.url,
            method: request.method,
            userAgent: request.headers["user-agent"],
          },
          `Validation error: ${field}`,
        );

        return reply.status(400).send(fail(message, errorCode));
      }

      // Handle ApiError instances
      if (error instanceof ApiError) {
        request.log.error(
          {
            error: {
              message: error.message,
              statusCode: error.statusCode,
              errorCode: error.errorCode,
            },
            url: request.url,
            method: request.method,
          },
          `API error: ${error.message}`,
        );

        return reply
          .status(error.statusCode)
          .send(fail(error.message, error.errorCode));
      }

      // Handle Prisma database errors
      if ("code" in error) {
        let message = "Database error";
        let errorCode = "DATABASE_ERROR";
        let statusCode = 500;

        switch (error.code) {
          case "P2002": // Unique constraint violation
            message = "Resource already exists";
            errorCode = "CONFLICT";
            statusCode = 409;
            break;
          case "P2025": // Record not found
            message = "Resource not found";
            errorCode = "NOT_FOUND";
            statusCode = 404;
            break;
          case "P2003": // Foreign key constraint
            message = "Invalid reference";
            errorCode = "INVALID_REFERENCE";
            statusCode = 400;
            break;
        }

        request.log.error(
          {
            prisma: {
              code: error.code,
              message: error.message,
            },
            url: request.url,
            method: request.method,
          },
          `Prisma error: ${error.code}`,
        );

        return reply.status(statusCode).send(fail(message, errorCode));
      }
    },
  );
}

export default fp(errorHandlerPlugin, {
  name: "errorHandler",
});
