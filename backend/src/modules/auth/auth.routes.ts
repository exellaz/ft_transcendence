import { FastifyInstance } from "fastify";
import { ok, ApiError } from "../../utils/response";
import { hashPassword, generateAuthToken } from "../users/users.service";
import { userPublicSelect } from "../users/users.select";
import { verifyPassword } from "../users/users.service";
import {
  postUserLoginSchema,
  postUserRegisterSchema,
  postGoogleAuthSchema,
} from "./auth.schema";
import { verifyGoogleIdToken } from "../auth/auth.service";
import { findOrCreateGoogleUser, sanitizeUsername } from "../auth/auth.service";
import { onlineUsers } from "../online-status/online-status.manager";

async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/auth/register",
    { schema: postUserRegisterSchema },
    async (request, reply) => {
      const { email, password, username } = request.body as {
        email: string;
        password: string;
        username: string;
      };

      const existingUser = await fastify.db.user.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase().trim() },
            { username: username.trim() },
          ],
        },
      });

      if (existingUser) {
        const conflictField =
          existingUser.email === email.toLowerCase().trim()
            ? "email"
            : "username";
        throw ApiError.conflict(
          `User with this ${conflictField} already exists`,
          conflictField === "email"
            ? "EMAIL_ALREADY_EXISTS"
            : "USERNAME_ALREADY_EXISTS",
        );
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user with settings
      const user = await fastify.db.user.create({
        data: {
          username: username.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          settings: { create: {} },
        },
        select: userPublicSelect,
      });

      // Generate JWT token
      const token = generateAuthToken(user.id, user.email);

      request.log.info(`User registered successfully: ${user.email}`);

      return reply.status(201).send(
        ok({
          token,
          user,
        }),
      );
    },
  );

  fastify.post(
    "/auth/login",
    { schema: postUserLoginSchema },
    async (request) => {
      const { identifier, password } = request.body as {
        identifier: string;
        password: string;
      };

      const user = await fastify.db.user.findFirst({
        where: {
          OR: [
            { email: identifier.toLowerCase().trim() },
            { username: identifier.trim() },
          ],
        },
        select: {
          ...userPublicSelect,
          password: true,
          twoFactorEnabled: true,
        },
      });

      if (!user || !user.password) {
        throw ApiError.unauthorized(
          "Invalid credentials",
          "INVALID_CREDENTIALS",
        );
      }

      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        throw ApiError.unauthorized(
          "Invalid credentials",
          "INVALID_CREDENTIALS",
        );
      }

      if (user.twoFactorEnabled) {
        throw ApiError.unauthorized(
          "Two-factor authentication required",
          "TWO_FACTOR_REQUIRED",
        );
      }

      // Check if userId exist in OnlineUsers Map
      if (onlineUsers.has(user.id)) {
        console.log(`[DUPLICATE LOGIN] UserId ${user.id} already logged in`);
        throw ApiError.conflict(
          "User is already logged in from another device",
          "USER_ALREADY_LOGGED_IN",
        );
      }

      const { ...userWithoutPassword } = user;

      const token = generateAuthToken(user.id, user.email);

      request.log.info(`User logged in successfully: ${user.email}`);

      return ok({
        token,
        user: userWithoutPassword,
      });
    },
  );

  fastify.post(
    "/auth/google",
    { schema: postGoogleAuthSchema },
    async (request) => {
      const { idToken, twoFactorCode } = request.body as {
        idToken?: string;
        twoFactorCode?: string;
      };

      if (!idToken) {
        throw ApiError.badRequest("idToken is required", "MISSING_ID_TOKEN");
      }

      try {
        // Verify Google token
        const payload = await verifyGoogleIdToken(idToken);
        if (!payload?.sub || !payload?.email) {
          throw ApiError.badRequest(
            "Invalid Google payload",
            "INVALID_GOOGLE_PAYLOAD",
          );
        }

        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name ?? "lil_bro";

        // Remove invalid characters keeping only alphanumeric, underscore, and hyphen

        const sanitizedUsername = sanitizeUsername(name, googleId);

        // Find or create user with Google account linking
        const user = await findOrCreateGoogleUser(
          googleId,
          email,
          sanitizedUsername,
          fastify,
          twoFactorCode,
        );

        if (onlineUsers.has(user.id)) {
          console.log(`[DUPLICATE LOGIN] UserId ${user.id} already logged in`);
          throw ApiError.conflict(
            "User is already logged in from another device",
            "USER_ALREADY_LOGGED_IN",
          );
        }

        const token = generateAuthToken(user.id, user.email);
        request.log.info(`Google OAuth login successful: ${user.email}`);

        return ok({
          token,
          user,
        });
      } catch (err) {
        if (err instanceof ApiError) {
          throw err;
        }

        request.log.error(`Google OAuth failed: ${err}`);
        throw ApiError.unauthorized(
          "Google authentication failed",
          "GOOGLE_AUTH_FAILED",
        );
      }
    },
  );
}

export default authRoutes;
