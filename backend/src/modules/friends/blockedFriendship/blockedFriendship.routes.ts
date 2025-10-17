import { FastifyInstance } from "fastify";
import { ok, ApiError } from "../../../utils/response";
import { userPublicSelect } from "../../users/users.select";
import { deleteBlockedFriendshipSchema, getBlockedFriendShipsByUserIdSchema, postBlockedFriendshipSchema } from "./blockedFriendship.schema";

async function blockedFriendshipRoutes(fastify: FastifyInstance) {
  // GET /blockedFriendships/:userId  (get all blocked friends by user)
  fastify.get("/blockedFriendships/:userId", 
    { schema: getBlockedFriendShipsByUserIdSchema}, 
    async (request) => {
    const { userId } = request.params as { userId: string };

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
      throw new ApiError("Blocked Friendships not found", 404);

    type BlockedFriendship = (typeof blockedFriendships)[number];

    return ok(blockedFriendships.map((b: BlockedFriendship) => b.blocked)); // 200 OK
  });

  // POST /blockedFriendships
  fastify.post("/blockedFriendships", 
    { schema: postBlockedFriendshipSchema },
    async (request) => {
    const { blockerId, blockedId } = request.body as {
      blockerId: number;
      blockedId: number;
    };

    if (blockerId === blockedId) {
      throw new ApiError("User cannot block themselves", 400);
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
        throw new ApiError("Friendship not found", 404);
      }

      const blockedFriendship = await fastify.db.blockedFriendship.create({
        data: { blockerId, blockedId },
      });

      return ok(blockedFriendship);
    } catch (err: any) {
      if (err.code === "P2002")
        throw new ApiError("blocked Friendship already exists", 400);
      if (err.code === "P2003") throw new ApiError("User not found", 404);
      throw err;
    }
  });

  // DELETE /blockedFriendships/:blockerId/:blockedId - unblock (trusts frontend to place params correctly)
  fastify.delete(
    "/blockedFriendships/:blockerId/:blockedId",
    { schema: deleteBlockedFriendshipSchema },
    async (request) => {
      const { blockerId, blockedId } = request.params as {
        blockerId: string;
        blockedId: string;
      };

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

        return ok(deletedBlockedFriendship);
      } catch (err: any) {
        if (err.code === "P2025")
          // Prisma "record not found"
          throw new ApiError(
            "Blocked Friendship not found OR Current User is not the blocker",
            404,
          );

        throw err; // let Fastify handle other errors
      }
    },
  );
}

export default blockedFriendshipRoutes;
