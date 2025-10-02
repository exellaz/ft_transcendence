import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ok, ApiError } from "../../../utils/response";
import { BlockedFriendship, FriendshipStatus, Prisma } from "@prisma/client";
import { userPublicSelect } from "../../users/users.select";
import { createFriendshipSchema, getFriendShipsByUserIdSchema } from "./friendship.schema";

async function friendshipRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

	// GET /friendships/:3/pending (get friends that send friend request to u)
	fastify.get("/friendships/:userId/pending", { schema: getFriendShipsByUserIdSchema }, async (request, reply) => {
		const { userId } = request.params as { userId: string };

		const friendships = await fastify.db.friendship.findMany({
			where: {
				accepterId: Number(userId),
				status: "pending",
			},
			include: {
				requester: { // the sender
					select: userPublicSelect
				}
			},
		});

		if (!friendships)
			throw new ApiError("Friendship not found", 404);

		return ok(friendships); // 200 OK
	});

	// GET /friendships/:userId/accepted
	fastify.get("/friendships/:userId/accepted", { schema: getFriendShipsByUserIdSchema }, async (request, reply) => {
		const { userId } = request.params as { userId: string };

		type FriendshipWithUsers = Prisma.FriendshipGetPayload<{
			include: { requester: true; accepter: true };
		}>;

		// Get all accepted friendships
		const accepted: FriendshipWithUsers[] = await fastify.db.friendship.findMany({
			where: {
				status: "accepted",
				OR: [
					{ requesterId: Number(userId) },
					{ accepterId: Number(userId) },
				],
			},
			include: {
				requester: {
					select: userPublicSelect
				},
				accepter: {
					select: userPublicSelect
				}
			},
		});

		if (!accepted)
			throw new ApiError("Friendship not found", 404);

		// Get all blocked frienships
		const blocked: BlockedFriendship[] = await fastify.db.BlockedFriendship.findMany({
			where: {
				OR: [
					{ blockerId: Number(userId) },
					{ blockedId: Number(userId) }
				]
			}
		});

		// Filter out Blocked friendships from accepted Friendships
				// convert to string eg. ("1-2", "3-5") for easy lookup
		const blockedPairs = new Set(blocked.map(b => `${b.blockerId}-${b.blockedId}`));
		const nonBlocked = accepted.filter(f =>
			!blockedPairs.has(`${userId}-${f.accepterId}`) &&
			!blockedPairs.has(`${f.accepterId}-${userId}`)
		);

		// map to always return "the other user"
		const result = nonBlocked.map(f => {
			const otherUser = f.requesterId === Number(userId) ? f.accepter : f.requester;
			return {
				id: f.id,
				status: f.status,
				createdAt: f.createdAt,
				updatedAt: f.updatedAt,
				user: otherUser, // TODO: change 'user' to other name?
			};
		});

		return ok(result); // 200 OK
	});

	// POST /friendships
	fastify.post("/friendships", { schema: createFriendshipSchema }, async (request, reply) => {
		const {  requesterId, accepterId } = request.body as {
			requesterId: number;
			accepterId: number;
		};

		if ( requesterId === accepterId) {
			throw new ApiError("User cannot friend themselves", 400);
		}

		try {
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
