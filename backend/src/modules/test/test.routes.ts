import { FastifyInstance } from "fastify";
import { ok, ApiError } from "../../utils/response.js";

async function testRoutes(fastify: FastifyInstance): Promise<void> {
  // Reset test database - remove all test users
  // POST /test/reset-db
  fastify.post("/test/reset-db", async (request) => {
    try {
      // Delete all users with 'test' in their email
      const deleteResult = await fastify.db.user.deleteMany({
        where: {
          email: { contains: "test" },
        },
      });

      request.log.info(
        { deletedCount: deleteResult.count },
        "Test users cleaned up",
      );

      return ok({
        message: "Test database reset successfully",
        deletedUsers: deleteResult.count,
      });
    } catch (error) {
      request.log.error({ error }, "Failed to reset test database");
      throw ApiError.internal("Failed to reset test database");
    }
  });
}

export default testRoutes;
