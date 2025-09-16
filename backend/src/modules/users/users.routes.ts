import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { generateUniqueUserCode } from "./users.service";
import { ok, fail, ApiError } from "../../utils/response"

async function userRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // POST /users (Create User)
  fastify.post("/users", async (request, reply) => {
    const { username, email, password } = request.body as {
	  username: string;
	  email: string;
	  password: string;
	};
    try {
	  	const usercode = await generateUniqueUserCode(fastify, username);
      console.log(usercode);
			const user = await fastify.db.user.create({
        data: {
          username,
          email,
          password,
          usercode,
          settings: { create: {} }, // use all @default values
        },
      });
      return ok(user);
    } catch (err: any) {
      if (err.code === "P2002") // Prisma unique constraint violation
        throw new ApiError("Username or Email already exists", 400);

      throw err; // let Fastify handle other errors
    }
  });


  // GET /users/:id (Get single user)
  fastify.get("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await fastify.db.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        usercode: true,
        status: true,
        joinedAt: true,
        updatedAt: true
      }
    });
    if (!user)
      throw new ApiError("User not found", 404);

    return ok(user); // 200 OK
  });


  // PATCH /users/:id  (update single user)
  fastify.patch("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { avatarUrl, username, email } = request.body as {
      avatarUrl?: string;
      username?: string;
      email?: string;
    };

    // Build update object dynamically
    const data: any = {};
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (username !== undefined) data.username = username;
    if (email !== undefined) data.email = email;

    if (Object.keys(data).length === 0)
      throw new ApiError("No fields to update", 400);

    try {
      const updatedUser = await fastify.db.user.update({
        where: { id: Number(id) }, // id is a number in SQLite schema usually
        data,
        select: { // return only these fields from database
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          joinedAt: true,
        },
      });

      return ok(updatedUser);
    } catch (err: any) {
      if (err.code === "P2025") // Prisma "record not found"
        throw new ApiError("User not found", 404);

      throw err; // let Fastify handle other errors
    }
  });

  // DELETE
  fastify.delete("/users/:id", async (request) => {
    const { id } = request.params as { id: string };
    try {
      const user = await fastify.db.user.delete({
        where: { id: Number(id) },
        select: { // return only these fields from database
          id: true,
          email: true,
          username: true,
        },
      });

      return ok(user);
    } catch (err: any) {
      if (err.code === "P2025")
        throw new ApiError("User not found", 404);
      console.log("ERRORRRR", err);
      throw err;
    }
  });

  // READ (all users)
  fastify.get("/users", async () => {
    const users = await fastify.db.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        usercode: true,
        status: true,
        joinedAt: true,
        updatedAt: true
      }
    });

    return ok(users); // even if empty array, success response
  });

  // GET /users/:id/settings
  fastify.get("/users/:id/settings", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = Number(id);

    const settings = await fastify.db.userSettings.findUnique({
      where: { userId: userId },
      select: {
        language: true,
        textSize: true,
        inGameCameraTracking: true,
      },
    });

    if (!settings)
      throw new ApiError("User settings not found", 404);

    return ok(settings); // only the 3 fields
  });

  // PATCH /users/:id/settings  (update single user settings)
  fastify.patch("/users/:id/settings", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = Number(id);

    const { language, textSize, inGameCameraTracking } = request.body as {
      language?: string;
      textSize?: string;
      inGameCameraTracking?: string;
    };

    // Build update object dynamically
    const data: any = {};
    if (language !== undefined) data.language = language;
    if (textSize !== undefined) data.textSize = textSize;
    if (inGameCameraTracking !== undefined) data.inGameCameraTracking = inGameCameraTracking;

    if (Object.keys(data).length === 0)
      throw new ApiError("No fields to update", 400);

    try {
      const updatedSettings = await fastify.db.userSettings.update({
        where: { userId: userId }, // id is a number in SQLite schema usually
        data,
        select: { // return only these fields from database
          userId: true,
          language: true,
          textSize: true,
          inGameCameraTracking: true,
        },
      });

      return ok(updatedSettings);
    } catch (err: any) {
      if (err.code === "P2025") // Prisma "record not found"
        throw new ApiError("User not found", 404);

      throw err; // let Fastify handle other errors
    }
  });

}

export default userRoutes;

