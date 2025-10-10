import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ok, ApiError } from "../../../utils/response";

async function friendChatMessageRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  // GET /friendChatMessages/:friendshipId
  fastify.get("/friendChatMessages/:friendshipId", async (request, reply) => {
    const { friendshipId } = request.params as { friendshipId: string };

    const friendChatMessages = await fastify.db.friendChatMessage.findMany({
      where: { friendshipId: Number(friendshipId) },
      orderBy: { timestamp: "asc" }, // sort timestamp in ascending order
    });

    if (!friendChatMessages)
      throw new ApiError("friendChatMessages not found", 404);

    return ok(friendChatMessages); // only the 3 fields
  });
}

export default friendChatMessageRoutes;
