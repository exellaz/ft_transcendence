import { FastifyInstance } from "fastify";
import { ok, ApiError } from "../../utils/response";
import {
  deleteUserByIdSchema,
  getUserByIdSchema,
  getUserSettingsByIdSchema,
  getUsersSchema,
  patchUserAvatarByIdSchema,
  patchUserByIdSchema,
  patchUserSettingsByIdSchema,
} from "./users.schema";
import { userPublicSelect, userSettingsPublicSelect } from "./users.select";
import { Prisma } from "@prisma/client";
import { authenticate, requireOwnership } from "../../plugins/authenticate";
import { MultipartFile } from "@fastify/multipart";
import { uploadFileToServerUploadsDir } from "./users.service";
import { AvatarFileValidator } from "src/utils/avatar-file-validator";

async function userRoutes(fastify: FastifyInstance) {
  // ============================ USER SETTINGS =================================

  // GET /users/:id/settings
  fastify.get(
    "/users/:id/settings",
    { schema: getUserSettingsByIdSchema, preHandler: authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      const userId = Number(id);

      requireOwnership(request.user?.id, userId);

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
    { schema: patchUserSettingsByIdSchema, preHandler: authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      const userId = Number(id);

      requireOwnership(request.user?.id, userId);

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
    { schema: patchUserByIdSchema, preHandler: authenticate },
    async (request) => {
      const { id } = request.params as { id: string };

      requireOwnership(request.user?.id, Number(id));

      const { username } = request.body as {
        username?: string;
      };

      interface UserPatchData {
        username?: string;
      }
      // Build update object dynamically
      const data: UserPatchData = {};
      if (username !== undefined) data.username = username;

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

  // PATCH /users/:id/avatar  (upload user avatar)
  fastify.patch(
    "/users/:id/avatar",
    { schema: patchUserAvatarByIdSchema },
    async (request) => {
      // get userId from param
      const { id } = request.params as { id: string };
      const userId = Number(id);
      requireOwnership(request.user?.id, userId);

      const data: MultipartFile | undefined = await request.file();
      if (!data)
        throw ApiError.badRequest("No file uploaded", "NO_FILE_UPLOADED");

      // Validate the file
      const validator = new AvatarFileValidator();
      const validation = validator.validateFile(data.filename);
      if (!validation.valid)
        throw ApiError.badRequest(
          "Invalid file extension",
          "FILE_VALIDATION_FAILED",
        );

      const filename = data.filename;

      try {
        // upload file to Server /uploads/avatars
        uploadFileToServerUploadsDir(data.file, filename);

        // save relative filepath of avatar image to user's avatarUrl in database
        const updatedUser = await fastify.db.user.update({
          where: { id: userId },
          data: { avatarUrl: `/uploads/avatars/${filename}` },
          select: userPublicSelect,
        });

        return ok(updatedUser);
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2025")
            throw ApiError.notFound("User not found", "USER_NOT_FOUND");
        }

        throw err; // let Fastify handle other errors
      }
    },
  );

  // DELETE
  fastify.delete(
    "/users/:id",
    { schema: deleteUserByIdSchema, preHandler: authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      requireOwnership(request.user?.id, Number(id));
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

  fastify.get("/users/me", { preHandler: authenticate }, async (request) => {
    return ok({ user: request.user });
  });
}

export default userRoutes;
