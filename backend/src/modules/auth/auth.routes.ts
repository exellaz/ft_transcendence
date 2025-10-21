import { FastifyInstance } from "fastify";
import { ok, ApiError } from "../../utils/response";
import { hashPassword, generateAuthToken } from "../users/users.service";
import { userPublicSelect } from "../users/users.select";
import { verifyPassword } from "../users/users.service";
import { postUserLoginSchema, postUserRegisterSchema } from "./auth.schema";

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

      const { ...userWithoutPassword } = user;

      const token = generateAuthToken(user.id, user.email);

      request.log.info(`User logged in successfully: ${user.email}`);

      return ok({
        token,
        user: userWithoutPassword,
      });
    },
  );
}

export default authRoutes;
