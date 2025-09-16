import { FastifyInstance, FastifyPluginOptions } from "fastify";


async function authRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

	// POST /auth/login
	// DRAFT Version (without password checking)
	fastify.post("/auth/login", async (request, reply) => {

		const { username, password } = request.body as {
			username: string;
			password: string;
		};

		const user = await fastify.db.user.findUnique({
			where: { username },
		});
		if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }
    return user; // 200 OK

	});

}

export default authRoutes;
