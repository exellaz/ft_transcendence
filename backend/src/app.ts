import pkg from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { verifyGoogleIdToken } from "./authService.ts";
import jwt from "jsonwebtoken";
import { findOrCreateUserFromGoogle } from "./userModel.ts";
import { authConfig } from "./config/authConfig.ts";

const Fastify = pkg;

dotenv.config();

const server = Fastify({ logger: true });

server.register(cors, {
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST", "OPTIONS"],
});

server.get("/health", async () => ({ status: "ok" }));

server.post("/auth/google", async (request, reply) => {
  const body = request.body as { idToken?: string };
  const idToken = body?.idToken;

  if (!idToken) {
    return reply.code(400).send({ error: "idToken is required" });
  }

  try {
    const payload = await verifyGoogleIdToken(idToken);

    if (!payload?.sub || !payload?.email) {
      return reply.code(400).send({ error: "Invalid Google payload" });
    }

    // DB lookup or creation
    const user = findOrCreateUserFromGoogle(
      payload.sub,
      payload.email,
      payload.name || "Anonymous"
    );

    // Create JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiresIn }
    );


    return reply.send({ ok: true, user, token });
  } catch (err) {
    request.log.error(err);
    return reply.code(401).send({ error: "Invalid Google ID token" });
  }
});

server.get("/me", async (request, reply) => {
  const authHeader = request.headers["authorization"];
  if (!authHeader) {
    return reply.code(401).send({ error: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret);
    return reply.send({ ok: true, user: decoded });
  } catch {
    return reply.code(401).send({ error: "Invalid token" });
  }
});

const PORT = Number(process.env.PORT || 4000);

const start = async () => {
  try {
    await server.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`Server listening on ${PORT}`);
  } catch (err) {
    if (err instanceof Error) {
      server.log.error(err.message);
    }
    process.exit(1);
  }
};

start();
