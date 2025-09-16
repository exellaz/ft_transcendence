import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { generateUniqueUserCode } from "./users.service";


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
      return user;
    } catch (err: any) {
      if (err.code === "P2002") {
        // Prisma unique constraint violation
        reply.code(400);
        return { error: "Username already exists" };
      }
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
    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }
    return user; // 200 OK
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

    if (Object.keys(data).length === 0) {
      return reply.status(400).send({ error: "No fields to update" });
    }

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

      return updatedUser;
    } catch (err: any) {
      if (err.code === "P2025") {
        // Prisma "record not found"
        return reply.status(404).send({ error: "User not found" });
      }
      throw err; // let Fastify handle other errors
    }
  });

  // DELETE
  fastify.delete("/users/:id", async (request) => {
    const { id } = request.params as { id: string };
    try {
      const user = await fastify.db.user.delete({
        where: { id: Number(id) },
      });
      return { id: user.id };
    } catch (err: any) {
      if (err.code === "P2025") {
        return { error: "User not found" };
      }
      return { error: "Database error" };
    }
  });

  // READ (all users)
  fastify.get("/users", async () => {
    return fastify.db.user.findMany({
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
  });

  // PUT /users/:id  (replace single user)
  fastify.put("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { username } = request.body as { username: string };
    try {
      const user = await fastify.db.user.update({
        where: { id: Number(id) },
        data: { username },
      });
      return user;
    } catch (err: any) {
      if (err.code === "P2025") {
        return { error: "User not found" };
      }
      reply.code(500);
      return { error: "Database error" };
    }
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

    if (!settings) {
      return reply.status(404).send({ error: "User settings not found" });
    }

    return settings; // only the 3 fields
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

    if (Object.keys(data).length === 0) {
      return reply.status(400).send({ error: "No fields to update" });
    }

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

      return updatedSettings;
    } catch (err: any) {
      if (err.code === "P2025") {
        // Prisma "record not found"
        return reply.status(404).send({ error: "User not found" });
      }
      throw err; // let Fastify handle other errors
    }
  });

}

export default userRoutes;

