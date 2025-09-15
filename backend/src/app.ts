import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import dbConnector from "./plugins/db"
import userRoutes from "./modules/users/users.routes"
import authRoutes from "./modules/auth/auth.routes";

const app = Fastify({
  logger: true
});

app.register(fastifyCors, {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE"], // allow your methods
  });

app.register(dbConnector);
app.register(userRoutes);
app.register(authRoutes);

export default app;
