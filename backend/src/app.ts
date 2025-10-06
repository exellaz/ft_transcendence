import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import dbConnector from "./plugins/db"
import userRoutes from "./modules/users/users.routes"
import authRoutes from "./modules/auth/auth.routes";
import { fail, ApiError } from "./utils/response";
import friendshipRoutes from "./modules/friends/friendship/friendship.routes";
import blockedFriendshipRoutes from "./modules/friends/blockedFriendship/blockedFriendship.routes";

const app = Fastify({
//   logger: true
});

app.register(fastifyCors, {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // allow your methods
  });

app.register(dbConnector);
app.register(userRoutes);
app.register(authRoutes);
app.register(friendshipRoutes);
app.register(blockedFriendshipRoutes);

// Global error handler (call after all routes/plugins)
app.setErrorHandler((error, request, reply) => {
	if (error instanceof ApiError) {
	  return reply.status(error.statusCode).send(fail(error.message));
	}

	console.log("Error Message: |, ", error.message, " |")

	// Fastify validation errors (AJV)
	if ((error as any).validation)
		return reply.status(400).send(fail(error.message || "Invalid request parameters"));

	return reply.status(500).send(fail(error.message || "Internal server error"));
  });

export default app;
