import jwt from "jsonwebtoken";
import { authConfig } from "../config/authConfig.ts";
import { getUserById } from "../userModel.ts";

// ✅ Use "import type" so this doesn't become a runtime import
import type { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = (request.headers.authorization || "") as string;
  if (!authHeader.startsWith("Bearer ")) {
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
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const user = getUserById(decoded.userId);
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    // attach user to request
    (request as any).user = user;
    return;
  } catch (err) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
