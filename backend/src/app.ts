import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import dbConnector from "./plugins/db";
import userRoutes from "./modules/users/users.routes";
import authRoutes from "./modules/auth/auth.routes";
import gameRoutes from "./modules/game/game.routes";
import websocketPlugin from "@fastify/websocket";
import fastifyStatic from "@fastify/static";

import { fail, ApiError } from "./utils/response";

const app = Fastify({
  logger: true
});
await app.register(websocketPlugin);

app.register(fastifyCors, {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // allow your methods
  });

app.register(dbConnector);
app.register(userRoutes);
app.register(authRoutes);
app.register(gameRoutes);

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
