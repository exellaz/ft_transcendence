import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ok, ApiError } from "../../../utils/response";
import { userPublicSelect } from "../../users/users.select";

async function blockedFriendshipRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

	// POST /blockedFriendship
	fastify.post("/blockedFriendships", async (request, reply) => {
		const { blockerId, blockedId } = request.body as {
			blockerId: number;
			blockedId: number;
		};

		if (blockerId === blockedId) {
			throw new ApiError("User cannot block themselves", 400);
		}

		try {
			const blockedFriendship = await fastify.db.blockedFriendship.create({
				data: { blockerId, blockedId }
			})

			return ok(blockedFriendship);
		} catch (err: any) {
			if (err.code === "P2002")
				throw new ApiError("blocked Friendship already exists", 400);
			if (err.code === "P2003")
				throw new ApiError("User not found", 404);
		}
	});

	// DELETE /blockedFriendship/:blockerId/:blockedId - unblock (trusts frontend to place params correctly)
	fastify.delete("/blockedFriendships/:blockerId/:blockedId", async (request, reply) => {
		const { blockerId, blockedId } = request.params as { blockerId: string, blockedId: string };

		try {

			const deletedBlockedFriendship = await fastify.db.blockedFriendship.delete({
				where: {
					uq_blocked_friendship: {
						// Only the blocker can unblock
						blockerId: Number(blockerId),
						blockedId: Number(blockedId),
					}
				},
			});

			return ok(deletedBlockedFriendship);
		} catch (err: any) {
			if (err.code === "P2025") // Prisma "record not found"
				throw new ApiError("Blocked Friendship not found OR Current User is not the blocker", 404);

			throw err; // let Fastify handle other errors
		}
	});
}

export default blockedFriendshipRoutes;
