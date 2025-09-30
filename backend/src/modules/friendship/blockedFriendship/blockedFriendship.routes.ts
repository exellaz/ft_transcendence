import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ok, ApiError } from "../../../utils/response";
import { userPublicSelect } from "../../users/users.select";

async function blockedFriendshipRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

	// POST /blockedFriendship
	fastify.post("/blockedFriendships", async (request, reply) => {
	
	});

	// DELETE /blockedFriendship/:blockerId/:blockedId - unblock
}

export default blockedFriendshipRoutes;
