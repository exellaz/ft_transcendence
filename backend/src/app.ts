import fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import type { SignOptions, Secret } from "jsonwebtoken";
import { verifyGoogleIdToken } from "./authService.ts";
import { findOrCreateUserFromGoogle, updateLastLogin } from "./userModel.ts";
import { authConfig } from "./config/authConfig.ts";
import { authenticate } from "./plugins/authenticate.ts";

const Fastify = fastify;

dotenv.config();

const server = Fastify({ logger: true });
server.decorateRequest("user");

server.register(cors, {
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST", "OPTIONS"],
});

server.get("/health", async () => ({ status: "ok" }));

server.post("/auth/google", async (request, reply) => {
  const body = request.body as { idToken?: string };
  const idToken = body?.idToken;
  if (!idToken) return reply.code(400).send({ error: "idToken is required" });

  try {
    const payload = await verifyGoogleIdToken(idToken);
    if (!payload?.sub || !payload?.email) {
      return reply.code(400).send({ error: "Invalid Google payload" });
    }

    // 1) Use Google sub as google_id, name and email
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name ?? "Anonymous";

    // 2) Find or create user in DB
    const user = findOrCreateUserFromGoogle(googleId, email, name);

    // 3) Optional: update last login timestamp
    updateLastLogin(user.id);

    // 4) Issue JWT that references our DB user id
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      authConfig.jwtSecret as Secret,
      { expiresIn: authConfig.jwtExpiresIn } as SignOptions,
    );

    return reply.send({ ok: true, user, token });
  } catch (err) {
    request.log.error(err);
    return reply.code(401).send({ error: "Invalid Google ID token" });
  }
});

server.get("/me", { preHandler: authenticate }, async (request, reply) => {
  if (!request.user) return reply.code(401).send({ error: "Unauthorized" });
  return { ok: true, user: request.user };
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
