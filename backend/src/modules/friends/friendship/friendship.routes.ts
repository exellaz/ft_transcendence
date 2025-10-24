import { FastifyInstance } from "fastify";
import { ok, ApiError } from "../../../utils/response";
import { BlockedFriendship, FriendshipStatus, Prisma } from "@prisma/client";
import { userPublicSelect } from "../../users/users.select";
import {
  createFriendshipSchema,
  deleteFriendshipSchema,
  getAcceptedFriendShipsByUserIdSchema,
  getPendingFriendShipsByUserIdSchema,
  updateFriendshipSchema,
} from "./friendship.schema";

async function friendshipRoutes(fastify: FastifyInstance) {
  // GET /friendships/:userId/pending (get friends that send friend request to u)
  fastify.get(
    "/friendships/:userId/pending",
    { schema: getPendingFriendShipsByUserIdSchema },
    async (request) => {
      const { userId } = request.params as { userId: string };

      const requesters = await fastify.db.user.findMany({
        where: {
          sentFriendships: {
            some: {
              accepterId: Number(userId),
              status: "pending",
            },
          },
        },
        select: userPublicSelect,
      });

      return ok(requesters);
    },
  );

  // GET /friendships/:userId/accepted — get all accepted friends (excluding blocked ones)
  fastify.get(
    "/friendships/:userId/accepted",
    { schema: getAcceptedFriendShipsByUserIdSchema },
    async (request) => {
      const { userId } = request.params as { userId: string };
      const uid = Number(userId);

      type UserWithFriendships = Prisma.UserGetPayload<{
        include: {
          sentFriendships: true;
          receivedFriendships: true;
        };
      }>;
      /**
       *    Fetch all users who are in an accepted friendship with the current user.
       *    includes both directions (sent & received), and select only the public fields.
       *    Additionally,`id` of the accepted friendship is included
       */
      const friends: UserWithFriendships[] = await fastify.db.user.findMany({
        where: {
          OR: [
            {
              sentFriendships: {
                some: { accepterId: uid, status: "accepted" },
              },
            },
            {
              receivedFriendships: {
                some: { requesterId: uid, status: "accepted" },
              },
            },
          ],
        },
        select: {
          // include friendshipId
          ...userPublicSelect,
          sentFriendships: {
            where: { accepterId: uid, status: "accepted" },
            select: { id: true },
          },
          receivedFriendships: {
            where: { requesterId: uid, status: "accepted" },
            select: { id: true },
          },
        },
      });

      // Get all block relationships involving the current user.
      const blocked: BlockedFriendship[] =
        await fastify.db.blockedFriendship.findMany({
          where: {
            OR: [{ blockerId: uid }, { blockedId: uid }],
          },
        });

      // Build a set of all user IDs that are blocked (in either direction).
      const blockedIds = new Set(
        blocked.map((b) => (b.blockerId === uid ? b.blockedId : b.blockerId)),
      );

      /**
       * Format users:
       *    - Filter out blocked users
       *    - Exclude sentFriendships / receivedFriendships from the output
       *    - Compute a single `friendshipId` (from sent or received)
       */
      const formatted = friends
        .filter((u) => !blockedIds.has(u.id))
        .map(({ sentFriendships, receivedFriendships, ...user }) => ({
          ...user,
          friendshipId:
            sentFriendships[0]?.id ?? receivedFriendships[0]?.id ?? null,
        }));

      return ok(formatted);
    },
  );

  // POST /friendships
  fastify.post(
    "/friendships",
    { schema: createFriendshipSchema },
    async (request) => {
      const { requesterId, accepterId, accepterUsername } = request.body as {
        requesterId: number;
        accepterId?: number;
        accepterUsername?: string;
      };

      try {
        let finalAccepterId = accepterId;

        if (!finalAccepterId) {
          if (!accepterUsername) {
            throw ApiError.badRequest(
              "Either accepterId or accepterUsername must be provided",
              "MISSING_ACCEPTER_INFO",
            );
          }

          const acceptedUser = await fastify.db.user.findFirst({
            where: { username: accepterUsername },
          });
          if (!acceptedUser)
            throw ApiError.notFound("User not found", "USER_NOT_FOUND");

          finalAccepterId = acceptedUser.id;
        }

        if (requesterId === finalAccepterId) {
          throw ApiError.badRequest(
            "User cannot friend themselves",
            "CANNOT_FRIEND_SELF",
          );
        }

        // check if inverse direction exist
        const inverseFriendship = await fastify.db.friendship.findFirst({
          where: {
            OR: [
              { requesterId: requesterId, accepterId: finalAccepterId },
              { requesterId: finalAccepterId, accepterId: requesterId },
            ],
          },
        });
        if (inverseFriendship) {
          if (inverseFriendship.status === "pending")
            throw ApiError.conflict(
              "Friend request is pending",
              "FRIEND_REQUEST_PENDING",
            );
          if (inverseFriendship.status === "accepted")
            throw ApiError.conflict(
              "Users are already friends",
              "ALREADY_FRIENDS",
            );
          // fallback for any other status
          throw ApiError.conflict(
            "Friendship already exists",
            "FRIENDSHIP_CONFLICT",
          );
        }

        const friendship = await fastify.db.friendship.create({
          data: {
            requesterId,
            accepterId: finalAccepterId,
            status: "pending",
          },
        });
        return ok(friendship);
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2002")
            throw ApiError.conflict(
              "Friendship already exists",
              "FRIENDSHIP_CONFLICT",
            );

          if (err.code === "P2003")
            throw ApiError.notFound("User not found", "USER_NOT_FOUND");
        }
        throw err;
      }
    },
  );

  // PATCH /friendships/:requesterId/:accepterId
  fastify.patch(
    "/friendships/:requesterId/:accepterId",
    { schema: updateFriendshipSchema },
    async (request) => {
      const { requesterId, accepterId } = request.params as {
        requesterId: string;
        accepterId: string;
      };
      const { status } = request.body as {
        status?: FriendshipStatus;
      };

      if (status === undefined)
        throw ApiError.badRequest("No fields to update", "NO_UPDATE_FIELDS");

      try {
        // find the friendship in either direction
        const friendship = await fastify.db.friendship.findFirst({
          where: {
            OR: [
              {
                requesterId: Number(requesterId),
                accepterId: Number(accepterId),
              },
              {
                requesterId: Number(accepterId),
                accepterId: Number(requesterId),
              },
            ],
          },
        });

        if (!friendship)
          throw ApiError.notFound(
            "Friendship not found",
            "FRIENDSHIP_NOT_FOUND",
          );

        // update by friendship ID
        const updatedFriendship = await fastify.db.friendship.update({
          where: { id: friendship.id },
          data: { status },
        });

        return ok(updatedFriendship);
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2025")
            throw ApiError.notFound(
              "Friendship not found",
              "FRIENDSHIP_NOT_FOUND",
            );
        }
        throw err; // let Fastify handle other errors
      }
    },
  );

  // DELETE /friendships/:requesterId/:accepterId
  fastify.delete(
    "/friendships/:requesterId/:accepterId",
    { schema: deleteFriendshipSchema },
    async (request) => {
      const { requesterId, accepterId } = request.params as {
        requesterId: string;
        accepterId: string;
      };

      try {
        // find the friendship in either direction
        const friendship = await fastify.db.friendship.findFirst({
          where: {
            OR: [
              {
                requesterId: Number(requesterId),
                accepterId: Number(accepterId),
              },
              {
                requesterId: Number(accepterId),
                accepterId: Number(requesterId),
              },
            ],
          },
        });

        if (!friendship)
          throw ApiError.notFound(
            "Friendship not found",
            "FRIENDSHIP_NOT_FOUND",
          );

        // update by friendship ID
        const deletedFriendship = await fastify.db.friendship.delete({
          where: { id: friendship.id },
        });

        return ok(deletedFriendship);
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === "P2025")
            throw ApiError.notFound(
              "Friendship not found",
              "FRIENDSHIP_NOT_FOUND",
            );
        }
        throw err; // let Fastify handle other errors
      }
    },
  );
}

export default friendshipRoutes;
