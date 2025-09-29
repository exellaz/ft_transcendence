import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ok, ApiError } from "../../utils/response";
import { Prisma } from "@prisma/client";
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
				if (err.code === "P2002") {
					return reply.status(400).send({ error: "Friendship already exists" });
				}
				if (err.code === "P2003") {
					return reply.status(404).send({ error: "User not found" });
				}
		}

	});
}

export default friendsRoutes;
