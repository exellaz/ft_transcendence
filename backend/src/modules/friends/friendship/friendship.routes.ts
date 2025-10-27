import { FastifyInstance } from "fastify";
import { ok, ApiError } from "../../../utils/response";
import { BlockedFriendship, FriendshipStatus, Prisma } from "@prisma/client";
import { userPublicSelect } from "../../users/users.select";
import { getAcceptedFriends } from "./friendship.service";
import {
  createFriendshipSchema,
  deleteFriendshipSchema,
  getAcceptedFriendShipsByUserIdSchema,
  getPendingFriendShipsByUserIdSchema,
  updateFriendshipSchema,
} from "./friendship.schema";
import { notifyFriendshipUpdateToUsers } from "src/modules/online-status/online-status.routes";

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

      const acceptedFriends = await getAcceptedFriends(uid);

      return ok(acceptedFriends);
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
        if (inverseFriendship)
          throw ApiError.conflict(
            "Friendship already exists",
            "FRIENDSHIP_CONFLICT",
          );

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

        notifyFriendshipUpdateToUsers(Number(requesterId), Number(accepterId));

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
