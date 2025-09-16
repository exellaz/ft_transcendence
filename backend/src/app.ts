import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import dbConnector from "./plugins/db"
import userRoutes from "./modules/users/users.routes"
import authRoutes from "./modules/auth/auth.routes";
import { fail, ApiError } from "./utils/response";

const app = Fastify({
  logger: true
});

app.register(fastifyCors, {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // allow your methods
  });

app.register(dbConnector);
app.register(userRoutes);
app.register(authRoutes);

// Global error handler (call after all routes/plugins)
app.setErrorHandler((error, request, reply) => {
	if (error instanceof ApiError) {
	  return reply.status(error.statusCode).send(fail(error.message));
	}

	console.error(error);
	return reply.status(500).send(fail("Internal server error"));
  });

export default app;
