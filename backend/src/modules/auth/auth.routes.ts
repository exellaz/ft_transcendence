import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ok, ApiError } from "../../utils/response";
import { postUserRegisterSchema } from "../users/users.schema";
import {
  hashPassword,
  generateAuthToken,
  validateRegistrationInput,
} from "../users/users.service";
import { userPublicSelect } from "../users/users.select";
import { postUserLoginSchema } from "../users/users.schema";
import { validateLoginInput, verifyPassword } from "../users/users.service";

async function authRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {

  fastify.post(
    "/auth/register",
    { schema: postUserRegisterSchema },
    async (request, reply) => {
      const { email, password, username } = request.body as {
        email: string;
        password: string;
        username: string;
      };

      // const validationErrors = validateRegistrationInput(
      //   email,
      //   password,
      //   username,
      // );
      // if (validationErrors.length > 0) {
      //   throw new ApiError(
      //     `Validation failed: ${validationErrors.join(", ")}`,
      //     400,
      //   );
      // }

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
        throw new ApiError(
          `User with this ${conflictField} already exists`,
          409,
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
    async (request, reply) => {
      const { identifier, password } = request.body as {
        identifier: string;
        password: string;
      };

      // const validationErrors = validateLoginInput(identifier, password);
      // if (validationErrors.length > 0) {
      //   throw new ApiError(
      //     `Validation failed: ${validationErrors.join(", ")}`,
      //     400,
      //   );
      // }

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
        throw new ApiError("Invalid credentials", 401);
      }

      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        throw new ApiError("Invalid credentials", 401);
      }

      const { password: _, ...userWithoutPassword } = user;

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
