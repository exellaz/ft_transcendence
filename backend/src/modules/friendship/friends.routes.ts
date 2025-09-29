import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ok, ApiError } from "../../utils/response";
import { FriendshipStatus, Prisma } from "@prisma/client";
import { userPublicSelect } from "../users/users.select";
import { createFriendshipSchema, getFriendShipsByUserIdSchema } from "./friends.schema";

async function friendsRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

	// GET /friendships/:userId?status=_____  (get all friendships by userId, filtered by status)
	fastify.get("/friendships/:userId", { schema: getFriendShipsByUserIdSchema }, async (request, reply) => {
		const { userId } = request.params as { userId: string };
		const { status } = request.query as { status?: "pending" | "accepted" | "blocked" };

		if (!status)
			throw new ApiError("Missing status query param", 400);

		type FriendshipWithUsers = Prisma.FriendshipGetPayload<{
			include: { user: true; friend: true };
		}>;


		const friendships: FriendshipWithUsers[] = await fastify.db.friendship.findMany({
			where: {
				status,
				OR: [
					{ userId: Number(userId) },
					{ friendId: Number(userId) },
				],
			},
			include: {
				user: {
					select: userPublicSelect
				},
				friend: {
					select: userPublicSelect
				}
			},
		});

		if (!friendships)
			throw new ApiError("Friendship not found", 404);

		// map to always return "the other user"
		const result = friendships.map(f => {
			const otherUser = f.userId === Number(userId) ? f.friend : f.user;
			return {
				id: f.id,
				status: f.status,
				createdAt: f.createdAt,
				updatedAt: f.updatedAt,
				user: otherUser,
			};
		});

		return ok(result); // 200 OK
	});

	// POST /friendships
	fastify.post("/friendships", { schema: createFriendshipSchema }, async (request, reply) => {
		const { userId, friendId } = request.body as {
			userId: number;
			friendId: number;
		};

		if (userId === friendId) {
			throw new ApiError("User cannot friend themselves", 400);
		}

		try {
			const friendship = await fastify.db.friendship.create({
				data: {
          userId,
          friendId,
          status: "pending",
        }
			});
			return ok(friendship);

		} catch (err: any) {
				if (err.code === "P2002")
					throw new ApiError("Friendship already exists", 400);
				if (err.code === "P2003")
					throw new ApiError("User not found", 404);
		}

	});

	// PATCH /friendships/:userId/:friendId
	fastify.patch("/friendships/:userId/:friendId", async (request, reply) => {
		const { userId, friendId } = request.params as { userId: string, friendId: string };
		const { status } = request.body as {
			status?: FriendshipStatus;
		};

		// Build update object dynamically
		const data: any = {};
		if (status !== undefined) data.status = status;

		if (Object.keys(data).length === 0)
			throw new ApiError("No fields to update", 400);

		try {
			// find the friendship in either direction
			const friendship = await fastify.db.friendship.findFirst({
				where: {
					OR: [
						{ userId: Number(userId), friendId: Number(friendId) },
						{ userId: Number(friendId), friendId: Number(userId) },
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

	// DELETE /friendships/:userId/:friendId
	fastify.delete("/friendships/:userId/:friendId", async (request, reply) => {
		const { userId, friendId } = request.params as { userId: string, friendId: string };

		try {
			// find the friendship in either direction
			const friendship = await fastify.db.friendship.findFirst({
				where: {
					OR: [
						{ userId: Number(userId), friendId: Number(friendId) },
						{ userId: Number(friendId), friendId: Number(userId) },
					],
				},
			});

			if (!friendship)
				throw new ApiError("Friendship not found", 404);

			// update by friendship ID
			const deletedFriendship = await fastify.db.friendship.delete({
				where: { id: friendship.id },
				// select: {} // ! not done
			});

			return ok(deletedFriendship);
		} catch (err: any) {
			if (err.code === "P2025") // Prisma "record not found"
				throw new ApiError("Friendship not found", 404);

			throw err; // let Fastify handle other errors
		}
	});
}

export default friendsRoutes;
