import { FastifyInstance } from "fastify";
import { ok, ApiError } from "../../../utils/response";
import {
  getFriendChatMessagesByFriendshipIdSchema,
  getLastFriendChatMessageByFriendshipIdSchema,
} from "./friendChatMessage.schema";
import { authenticate } from "src/plugins/authenticate";

async function friendChatMessageRoutes(fastify: FastifyInstance) {
  // GET /friendChatMessages/:friendshipId
  fastify.get(
    "/friendChatMessages/:friendshipId",
    {
      schema: getFriendChatMessagesByFriendshipIdSchema,
      preHandler: authenticate,
    },
    async (request) => {
      const { friendshipId } = request.params as { friendshipId: string };

      const friendChatMessages = await fastify.db.friendChatMessage.findMany({
        where: { friendshipId: Number(friendshipId) },
        orderBy: { timestamp: "asc" }, // sort timestamp in ascending order
      });

      if (!friendChatMessages)
        throw ApiError.notFound(
          "Friend chat messages not found",
          "FRIEND_CHAT_MESSAGES_NOT_FOUND",
        );

      return ok(friendChatMessages); // only the 3 fields
    },
  );

  // GET /friendChatMessages/:friendshipId/lastMessage
  fastify.get(
    "/friendChatMessages/:friendshipId/lastMessage",
    {
      schema: getLastFriendChatMessageByFriendshipIdSchema,
      preHandler: authenticate,
    },
    async (request) => {
      const { friendshipId } = request.params as { friendshipId: string };

      const lastMessage = await fastify.db.friendChatMessage.findFirst({
        where: { friendshipId: Number(friendshipId) },
        orderBy: { timestamp: "desc" }, // sort timestamp in descending order
      });

      if (!lastMessage)
        throw ApiError.notFound(
          "Friend chat messages not found",
          "FRIEND_CHAT_MESSAGES_NOT_FOUND",
        );

      return ok(lastMessage); // only the 3 fields
    },
  );
}

export default friendChatMessageRoutes;
