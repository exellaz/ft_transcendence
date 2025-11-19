import { FastifyInstance } from "fastify";
import { ok, ApiError } from "../../../utils/response";
import { userPublicSelect } from "../../users/users.select";
import {
  deleteBlockedFriendshipSchema,
  getBlockedFriendShipsByUserIdSchema,
  postBlockedFriendshipSchema,
} from "./blockedFriendship.schema";
import { Prisma } from "@prisma/client";
import { notifyFriendshipUpdateToUsers } from "src/modules/online-status/online-status.manager";
import { authenticate, requireOwnership } from "src/plugins/authenticate";

async function blockedFriendshipRoutes(fastify: FastifyInstance) {
  // GET /blockedFriendships/:userId  (get all blocked friends by user)
  fastify.get(
    "/blockedFriendships/:userId",
    { schema: getBlockedFriendShipsByUserIdSchema, preHandler: authenticate },
    async (request) => {
      const { userId } = request.params as { userId: string };

      requireOwnership(request.user?.id, Number(userId));

      const blockedFriendships = await fastify.db.blockedFriendship.findMany({
        where: {
          blockerId: Number(userId),
        },
        include: {
          blocked: {
            // the sender
            select: userPublicSelect,
          },
        },
      });

      if (!blockedFriendships)
        throw ApiError.notFound(
          "Blocked Friendships not found",
          "BLOCKED_FRIENDSHIPS_NOT_FOUND",
        );

      type BlockedFriendship = (typeof blockedFriendships)[number];

      return ok(blockedFriendships.map((b: BlockedFriendship) => b.blocked)); // 200 OK
    },
  );

  // POST /blockedFriendships
  fastify.post(
    "/blockedFriendships",
    { schema: postBlockedFriendshipSchema, preHandler: authenticate },
    async (request) => {
      const { blockerId, blockedId } = request.body as {
        blockerId: number;
        blockedId: number;
      };
      requireOwnership(request.user?.id, Number(blockerId));

      if (blockerId === blockedId) {
        throw ApiError.badRequest(
          "User cannot block themselves",
          "CANNOT_BLOCK_SELF",
        );
      }

      try {
        // TODO: check if friendship exist
        // ! no response at all when i add this code secton
        const friendship = await fastify.db.friendship.findFirst({
          where: {
            OR: [
              { requesterId: Number(blockerId), accepterId: Number(blockedId) },
              { requesterId: Number(blockedId), accepterId: Number(blockerId) },
            ],
          },
        });

        if (!friendship) {
          console.log("TESTT", friendship);
          throw ApiError.notFound(
            "Friendship not found",
            "FRIENDSHIP_NOT_FOUND",
          );
        }

        const blockedFriendship = await fastify.db.blockedFriendship.create({
          data: { blockerId, blockedId },
        });

        notifyFriendshipUpdateToUsers(Number(blockerId), Number(blockedId));

        return ok(blockedFriendship);
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2002")
            throw ApiError.conflict(
              "blocked Friendship already exists",
              "BLOCKED_FRIENDSHIP_CONFLICT",
            );
          if (err.code === "P2003")
            throw ApiError.notFound("User not found", "USER_NOT_FOUND");
        }
        throw err;
      }
    },
  );

  // DELETE /blockedFriendships/:blockerId/:blockedId - unblock (trusts frontend to place params correctly)
  fastify.delete(
    "/blockedFriendships/:blockerId/:blockedId",
    { schema: deleteBlockedFriendshipSchema, preHandler: authenticate },
    async (request) => {
      const { blockerId, blockedId } = request.params as {
        blockerId: string;
        blockedId: string;
      };
      requireOwnership(request.user?.id, Number(blockerId));

      try {
        const deletedBlockedFriendship =
          await fastify.db.blockedFriendship.delete({
            where: {
              uq_blocked_friendship: {
                // Only the blocker can unblock
                blockerId: Number(blockerId),
                blockedId: Number(blockedId),
              },
            },
          });

        notifyFriendshipUpdateToUsers(Number(blockerId), Number(blockedId));

        return ok(deletedBlockedFriendship);
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2025")
            // Blocked Friendship not found OR Current User is not the blocker
            throw ApiError.notFound(
              "Blocked Friendship not found",
              "BLOCKED_FRIENDSHIP_NOT_FOUND",
            );
        }
        throw err; // let Fastify handle other errors
      }
    },
  );
}

export default blockedFriendshipRoutes;
