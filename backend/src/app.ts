import fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import type { SignOptions, Secret } from "jsonwebtoken";
import { verifyGoogleIdToken } from "./authService.ts";
import { findOrCreateUserFromGoogle, updateLastLogin } from "./userModel.ts";
import { authConfig } from "./config/authConfig.ts";
import { authenticate } from "./plugins/authenticate.ts";
import { hashPassword, verifyPassword } from "./authService.ts";
import { createUserWithPassword, getUserByEmail } from "./userModel.ts";

const Fastify = fastify;

dotenv.config();

const server = Fastify({ logger: true });
server.decorateRequest("user");

server.register(cors, {
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST", "OPTIONS"],
});

server.get("/health", async () => ({ status: "ok" }));

function validateRegistrationInput(
  email: string,
  password: string,
  name: string,
) {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Invalid email format");
  }
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (name.trim().length < 2) {
    errors.push("Name must be at least 2 characters");
  }
  if (name.length > 24) {
    errors.push("Name must be at most 24 characters");
  }
  return errors;
}

server.post("/auth/register", async (request, reply) => {
  const { email, password, name } = request.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password || !name) {
    return reply
      .code(400)
      .send({ error: "Missing required fields: email, password, name" });
  }

  const validationErrors = validateRegistrationInput(email, password, name);
  if (validationErrors.length > 0) {
    return reply
      .code(400)
      .send({ error: "Validation failed", details: validationErrors });
  }

  const exists = getUserByEmail(email.toLocaleLowerCase().trim());
  if (exists) {
    return reply.code(400).send({ error: "Email already registered" });
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = createUserWithPassword(email, name, passwordHash);
    if (!user) {
      throw new Error("Failed to create user");
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      authConfig.jwtSecret as Secret,
      { expiresIn: authConfig.jwtExpiresIn } as SignOptions,
    );

    request.log.info(`User registered successfully: ${user.email}`);

    return reply.send({
      ok: true,
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Registration failed" });
  }
});

server.post("/auth/login", async (request, reply) => {
  const { email, password } = request.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return reply.code(400).send({ error: "Missing email or password" });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = getUserByEmail(email);
    if (!user || !user.password_hash) {
      request.log.warn(`Login failed for email: ${normalizedEmail}`);
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      request.log.warn(`Failed password attempt for email: ${normalizedEmail}`);
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    updateLastLogin(user.id);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      authConfig.jwtSecret as Secret,
      { expiresIn: authConfig.jwtExpiresIn } as SignOptions,
    );

    return reply.send({
      ok: true,
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Login failed" });
  }
});

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
