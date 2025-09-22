import jwt from "jsonwebtoken";
import { authConfig } from "../config/authConfig.ts";
import { getUserById } from "../userModel.ts";
import type { FastifyReply, FastifyRequest } from "fastify";

const AuthErrors = {
  MISSING_BEARER: 'MISSING_BEARER',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  MALFORMED_TOKEN: 'MALFORMED_TOKEN'
} as const;

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = (request.headers.authorization || "") as string;
  if (!authHeader.startsWith("Bearer ")) {
    request.log.warn(`Authentication failed: ${AuthErrors.MISSING_BEARER}`);
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret) as {
      userId: number;
      email?: string;
      iat?: number;
      exp?: number;
    };

    if (!decoded.userId) {
      request.log.warn(`Authentication failed: ${AuthErrors.MALFORMED_TOKEN}`);
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const user = getUserById(decoded.userId);
    if (!user) {
      request.log.warn(`Authentication failed: ${AuthErrors.USER_NOT_FOUND} - userId: ${decoded.userId}`);
      return reply.code(401).send({ error: "Unauthorized" });
    }

    request.user = user;
    return;
  } catch (err) {
    if (err && typeof err === 'object' && 'name' in err) {
      if (err.name === 'TokenExpiredError') {
        request.log.warn(`Authentication failed: ${AuthErrors.TOKEN_EXPIRED}`);
      } else if (err.name === 'JsonWebTokenError') {
        request.log.warn(`Authentication failed: ${AuthErrors.INVALID_TOKEN}`);
      } else {
        request.log.error(`Authentication failed: Unexpected error - ${err.name}`);
      }
    } else {
      request.log.error(`Authentication failed: Unknown error - ${String(err)}`);
    }

    return reply.code(401).send({ error: "Unauthorized" });
  }
}