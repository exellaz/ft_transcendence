import jwt from "jsonwebtoken";
import { ApiError } from "../utils/response.ts";
import type { FastifyRequest } from "fastify";

const AuthErrors = {
  MISSING_BEARER: "MISSING_BEARER",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  MALFORMED_TOKEN: "MALFORMED_TOKEN",
} as const;

interface JWTPayload {
  userId: number;
  email?: string;
  iat?: number;
  exp?: number;
}

export async function authenticate(request: FastifyRequest) {
  const authHeader = (request.headers.authorization || "") as string;
  if (!authHeader.startsWith("Bearer ")) {
    request.log.warn(`Authentication failed: ${AuthErrors.MISSING_BEARER}`);
    throw ApiError.unauthorized(
      "Missing or invalid Authorization header",
      AuthErrors.MISSING_BEARER,
    );
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    request.log.warn(`Authentication failed: Empty token`);
    throw ApiError.unauthorized(
      "Empty authentication token",
      AuthErrors.MALFORMED_TOKEN,
    );
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      request.log.error("JWT_SECRET not configured");
      throw ApiError.internal(
        "Authentication configuration error",
        "CONFIG_ERROR",
      );
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    if (!decoded.userId) {
      request.log.warn(`Authentication failed: ${AuthErrors.MALFORMED_TOKEN}`);
      throw ApiError.unauthorized(
        "Invalid token format",
        AuthErrors.MALFORMED_TOKEN,
      );
    }

    const user = await request.server.db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        status: true,
        joinedAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      request.log.warn(
        `Authentication failed: ${AuthErrors.USER_NOT_FOUND} - userId: ${decoded.userId}`,
      );
      throw ApiError.unauthorized("User not found", AuthErrors.USER_NOT_FOUND);
    }
    request.user = user;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err && typeof err === "object" && "name" in err) {
      const jwtError = err as jwt.JsonWebTokenError;

      switch (jwtError.name) {
        case "TokenExpiredError":
          request.log.warn(
            `Authentication failed: ${AuthErrors.TOKEN_EXPIRED}`,
          );
          throw ApiError.unauthorized(
            "Token expired",
            AuthErrors.TOKEN_EXPIRED,
          );

        case "JsonWebTokenError":
          request.log.warn(
            `Authentication failed: ${AuthErrors.INVALID_TOKEN}`,
          );
          throw ApiError.unauthorized(
            "Invalid token",
            AuthErrors.INVALID_TOKEN,
          );

        case "NotBeforeError":
          request.log.warn(`Authentication failed: Token not active yet`);
          throw ApiError.unauthorized(
            "Token not yet valid",
            AuthErrors.INVALID_TOKEN,
          );

        default:
          request.log.warn(
            `Authentication failed: Unknown JWT error - ${jwtError.name}`,
          );
          throw ApiError.unauthorized(
            "Token validation failed",
            AuthErrors.INVALID_TOKEN,
          );
      }
    }

    request.log.error(
      `Authentication failed: Unexpected error - ${String(err)}`,
    );
    throw ApiError.unauthorized(
      "Authentication failed",
      AuthErrors.INVALID_TOKEN,
    );
  }
}

export function requireOwnership(
  userId: number | undefined,
  requestUserId: number,
) {
  if (userId !== requestUserId || userId === undefined) {
    throw ApiError.forbidden(
      "Access denied: insufficient permissions",
      "ACCESS_DENIED",
    );
  }
}
