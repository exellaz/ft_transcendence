import jwt from "jsonwebtoken";
import { ApiError } from "../utils/response.ts";
import { authConfig } from "../config/authConfig.ts";
import { getUserById } from "../userModel.ts";
import type { FastifyReply, FastifyRequest } from "fastify";

const AuthErrors = {
  MISSING_BEARER: "MISSING_BEARER",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  MALFORMED_TOKEN: "MALFORMED_TOKEN",
} as const;

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      email: string;
      avatarUrl: string | null;
      status: string;
      joinedAt: Date;
      updatedAt: Date;
    };
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = (request.headers.authorization || "") as string;
  if (!authHeader.startsWith("Bearer ")) {
    request.log.warn(`Authentication failed: ${AuthErrors.MISSING_BEARER}`);
    throw new ApiError("Missing or invalid Authorization header", 401);
  }

  const token = authHeader.slice(7).trim();
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      request.log.error("JWT_SECRET not configured");
      throw new ApiError("Authentication configuration error", 500);
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: number;
      email?: string;
      iat?: number;
      exp?: number;
    };

    if (!decoded.userId) {
      request.log.warn(`Authentication failed: ${AuthErrors.MALFORMED_TOKEN}`);
      throw new ApiError("Invalid token format", 401);
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
      throw new ApiError("User not found", 401);
    }
    request.user = user;
    return;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err && typeof err === "object" && "name" in err) {
      if (err.name === "TokenExpiredError") {
        request.log.warn(`Authentication failed: ${AuthErrors.TOKEN_EXPIRED}`);
        throw new ApiError("Token expired", 401);
      } else if (err.name === "JsonWebTokenError") {
        request.log.warn(`Authentication failed: ${AuthErrors.INVALID_TOKEN}`);
        throw new ApiError("Invalid token", 401);
      }
    }
    request.log.error(`Authentication failed: Unknown error - ${String(err)}`);
    throw new ApiError("Unauthorized", 401);
  }
}
