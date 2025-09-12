import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { generateUniqueUserCode } from "./users.service";


async function userRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // CREATE
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
        data: { username, email, password, usercode },
      });
      return user;
    } catch (err: any) {
      if (err.code === "P2002") {
        // Prisma unique constraint violation
        reply.code(400);
        return { error: "Username already exists" };
      }
      console.error("DB Insert Error:", err);
      reply.code(500);
      return { error: "Databaase error" };
    }
  });

  // READ (all users)
  fastify.get("/users", async () => {
    return fastify.db.user.findMany();
  });

  // READ (single user)
  fastify.get("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await fastify.db.user.findUnique({
      where: { id: Number(id) },
    });
    return user || { error: "User not found" };
  });

  // UPDATE
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
}

export default userRoutes;

