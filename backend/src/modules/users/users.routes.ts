import { FastifyInstance } from "fastify";
import { ok, ApiError } from "../../utils/response";
import {
  deleteUserByIdSchema,
  getUserByIdSchema,
  getUserSettingsByIdSchema,
  getUsersSchema,
  patchUserByIdSchema,
  patchUserSettingsByIdSchema,
} from "./users.schema";
import { userPublicSelect, userSettingsPublicSelect } from "./users.select";
import { Prisma } from "@prisma/client";

async function userRoutes(fastify: FastifyInstance) {
  // ============================ USER SETTINGS =================================

  // GET /users/:id/settings
  fastify.get(
    "/users/:id/settings",
    { schema: getUserSettingsByIdSchema },
    async (request) => {
      const { id } = request.params as { id: string };
      const userId = Number(id);

      const settings = await fastify.db.userSettings.findUnique({
        where: { userId: userId },
        select: userSettingsPublicSelect,
      });

      if (!settings)
        throw ApiError.notFound(
          "User settings not found",
          "USER_SETTINGS_NOT_FOUND",
        );

      return ok(settings); // only the 3 fields
    },
  );

  // PATCH /users/:id/settings  (update single user settings)
  fastify.patch(
    "/users/:id/settings",
    { schema: patchUserSettingsByIdSchema },
    async (request) => {
      const { id } = request.params as { id: string };
      const userId = Number(id);

      const { language } = request.body as {
        language?: string;
      };

      interface UserSettingsPatchData {
        language?: string;
      }
      // Build update object dynamically
      const data: UserSettingsPatchData = {};
      if (language !== undefined) data.language = language;

      if (Object.keys(data).length === 0)
        throw ApiError.badRequest("No fields to update", "NO_UPDATE_FIELDS");

      try {
        const updatedSettings = await fastify.db.userSettings.update({
          where: { userId: userId }, // id is a number in SQLite schema usually
          data,
          select: userSettingsPublicSelect,
        });

        return ok(updatedSettings);
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2025")
            // Prisma "record not found"
            throw ApiError.notFound("User not found", "USER_NOT_FOUND");
        }

        throw err; // let Fastify handle other errors
      }
    },
  );

  // GET all userSettings (NEEDS TO BE BEFORE /user/:id)
  fastify.get("/users/settings", async () => {
    const userSettings = await fastify.db.userSettings.findMany({
      select: userSettingsPublicSelect,
    });

    return ok(userSettings); // even if empty array, success response
  });

  // ============================ USER =================================

  // GET /users/:id (Get single user)
  fastify.get("/users/:id", { schema: getUserByIdSchema }, async (request) => {
    const { id } = request.params as { id: string };
    const user = await fastify.db.user.findUnique({
      where: { id: Number(id) },
      select: userPublicSelect,
    });
    if (!user) throw ApiError.notFound("User not found", "USER_NOT_FOUND");

    return ok(user); // 200 OK
  });

  // PATCH /users/:id  (update single user)
  fastify.patch(
    "/users/:id",
    { schema: patchUserByIdSchema },
    async (request) => {
      const { id } = request.params as { id: string };
      const { username, avatarUrl } = request.body as {
        username?: string;
        avatarUrl?: string;
      };

      interface UserPatchData {
        username?: string;
        avatarUrl?: string;
      }
      // Build update object dynamically
      const data: UserPatchData = {};
      if (username !== undefined) data.username = username;
      if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

      if (Object.keys(data).length === 0)
        throw ApiError.badRequest("No fields to update", "NO_UPDATE_FIELDS");

      try {
        const updatedUser = await fastify.db.user.update({
          where: { id: Number(id) }, // id is a number in SQLite schema usually
          data,
          select: userPublicSelect,
        });

        return ok(updatedUser);
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2025")
            // Prisma "record not found"
            throw ApiError.notFound("User not found", "USER_NOT_FOUND");
          else if (err.code === "P2002")
            // Prisma unique constraint violation
            throw ApiError.conflict(
              "Username already exists",
              "USERNAME_CONFLICT",
            );
        }

        throw err; // let Fastify handle other errors
      }
    },
  );

  // DELETE
  fastify.delete(
    "/users/:id",
    { schema: deleteUserByIdSchema },
    async (request) => {
      const { id } = request.params as { id: string };
      try {
        const user = await fastify.db.user.delete({
          where: { id: Number(id) },
          select: userPublicSelect,
        });

        return ok(user);
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2025")
            throw ApiError.notFound("User not found", "USER_NOT_FOUND");
          console.log("ERRORRRR", err);
        }
        throw err;
      }
    },
  );

  // GET /users - get all users
  fastify.get("/users", { schema: getUsersSchema }, async () => {
    const users = await fastify.db.user.findMany({
      select: userPublicSelect,
    });

    return ok(users); // even if empty array, success response
  });
}

export default userRoutes;
