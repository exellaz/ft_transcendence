import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ok, ApiError } from "../../../utils/response";
import { BlockedFriendship, FriendshipStatus, Prisma, User } from "@prisma/client";
import { userPublicSelect } from "../../users/users.select";
import { createFriendshipSchema, getFriendShipsByUserIdSchema } from "./friendship.schema";

async function friendshipRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

	// GET /friendships/:3/pending (get friends that send friend request to u)
	fastify.get("/friendships/:userId/pending", { schema: getFriendShipsByUserIdSchema }, async (request, reply) => {
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
	});

	// GET /friendships/:userId/accepted
	fastify.get("/friendships/:userId/accepted", { schema: getFriendShipsByUserIdSchema }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		const uid = Number(userId);

		// Get all users who are in accepted friendships with me
		const friends: User[] = await fastify.db.user.findMany({
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
			select: userPublicSelect,
		});

		const blocked: BlockedFriendship[] = await fastify.db.blockedFriendship.findMany({
			where: {
				OR: [{ blockerId: uid }, { blockedId: uid }],
			},
		});

		// compile all 'otherUser' ids from the blockedFriendships
		const blockedIds = new Set(blocked.map(b => b.blockerId === uid ? b.blockedId : b.blockerId));
		// Remove users who are blocked (either direction)
		const nonBlocked = friends.filter(u => !blockedIds.has(u.id));

		return ok(nonBlocked); // just array of UserPublic
	});

	// POST /friendships
	fastify.post("/friendships", { schema: createFriendshipSchema }, async (request, reply) => {
		const {  requesterId, accepterUsername } = request.body as {
			requesterId: number;
			accepterUsername: string;
		};

		try {
			const acceptedUser = await fastify.db.user.findFirst({
				where: { username: accepterUsername }
			});
			
			const accepterId = acceptedUser.id;
			if ( requesterId === accepterId) {
				throw new ApiError("User cannot friend themselves", 400);
			}
			
			// check if inverse direction exist
			const inverseFriendship = await fastify.db.friendship.findFirst({
				where: {
					OR: [
						{ requesterId: requesterId, accepterId: accepterId },
						{ requesterId: accepterId, accepterId: requesterId },
					]
				}
			});
			if (inverseFriendship)
				throw new ApiError("Friendship already exists", 400);

			const friendship = await fastify.db.friendship.create({
				data: {
          requesterId,
          accepterId,
          status: "pending",
        }
			});
			return ok(friendship);

		} catch (err: any) {
				if (err.code === "P2002")
					throw new ApiError("Friendship already exists", 400);
				if (err.code === "P2003")
					throw new ApiError("User not found", 404);
				throw err;
		}

	});

	// PATCH /friendships/:requesterId/:accepterId
	fastify.patch("/friendships/:requesterId/:accepterId", async (request, reply) => {
		const { requesterId, accepterId } = request.params as { requesterId: string, accepterId: string };
		const { status } = request.body as {
			status?: FriendshipStatus;
		};

		if (status === undefined)
			throw new ApiError("No fields to update", 400);

		try {
			// find the friendship in either direction
			const friendship = await fastify.db.friendship.findFirst({
				where: {
					OR: [
						{ requesterId: Number(requesterId), accepterId: Number(accepterId) },
						{ requesterId: Number(accepterId), accepterId: Number(requesterId) },
					],
				},
			});

			if (!friendship)
				throw new ApiError("Friendship not found", 404);

			// update by friendship ID
			const updatedFriendship = await fastify.db.friendship.update({
				where: { id: friendship.id },
				data: { status },
			});

			return ok(updatedFriendship);
		} catch (err: any) {
			if (err.code === "P2025") // Prisma "record not found"
				throw new ApiError("Friendship not found", 404);

			throw err; // let Fastify handle other errors
		}
	});

	// DELETE /friendships/:requesterId/:accepterId
	fastify.delete("/friendships/:requesterId/:accepterId", async (request, reply) => {
		const { requesterId, accepterId } = request.params as { requesterId: string, accepterId: string };

		try {
			// find the friendship in either direction
			const friendship = await fastify.db.friendship.findFirst({
				where: {
					OR: [
						{ requesterId: Number(requesterId), accepterId: Number(accepterId) },
						{ requesterId: Number(accepterId), accepterId: Number(requesterId) },
					],
				},
			});

			if (!friendship)
				throw new ApiError("Friendship not found", 404);

			// update by friendship ID
			const deletedFriendship = await fastify.db.friendship.delete({
				where: { id: friendship.id },
			});

			return ok(deletedFriendship);
		} catch (err: any) {
			if (err.code === "P2025") // Prisma "record not found"
				throw new ApiError("Friendship not found", 404);

			throw err; // let Fastify handle other errors
		}
	});
}

export default friendshipRoutes;
