import { FastifyInstance } from "fastify";
import { ok, ApiError } from "../../utils/response";
import {
  deleteUserByIdSchema,
  getUserByIdSchema,
  getUserSettingsByIdSchema,
  patchUserByIdSchema,
  patchUserSettingsByIdSchema,
} from "./users.schema";
import { userPublicSelect, userSettingsPublicSelect } from "./users.select";

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

      if (!settings) throw new ApiError("User settings not found", 404);

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

      // Build update object dynamically
      const data: any = {};
      if (language !== undefined) data.language = language;

      if (Object.keys(data).length === 0)
        throw new ApiError("No fields to update", 400);

      try {
        const updatedSettings = await fastify.db.userSettings.update({
          where: { userId: userId }, // id is a number in SQLite schema usually
          data,
          select: userSettingsPublicSelect,
        });

        return ok(updatedSettings);
      } catch (err: any) {
        if (err.code === "P2025")
          // Prisma "record not found"
          throw new ApiError("User not found", 404);

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
    if (!user) throw new ApiError("User not found", 404);

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

      // Build update object dynamically
      const data: any = {};
      if (username !== undefined) data.username = username;
      if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

      if (Object.keys(data).length === 0)
        throw new ApiError("No fields to update", 400);

      try {
        const updatedUser = await fastify.db.user.update({
          where: { id: Number(id) }, // id is a number in SQLite schema usually
          data,
          select: userPublicSelect,
        });

        return ok(updatedUser);
      } catch (err: any) {
        if (err.code === "P2025")
          // Prisma "record not found"
          throw new ApiError("User not found", 404);
        else if (err.code === "P2002")
          // Prisma unique constraint violation
          throw new ApiError("Username already exists", 400);

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
      } catch (err: any) {
        if (err.code === "P2025") throw new ApiError("User not found", 404);
        console.log("ERRORRRR", err);
        throw err;
      }
    },
  );

  // READ (all users)
  fastify.get("/users", async () => {
    const users = await fastify.db.user.findMany({
      select: userPublicSelect,
    });

    return ok(users); // even if empty array, success response
  });
}

export default userRoutes;
