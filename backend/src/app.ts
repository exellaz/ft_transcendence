import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import dbConnector from "./plugins/db"
import routes from "./routes"

const app = Fastify({
  logger: true
});

app.register(fastifyCors, {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE"], // allow your methods
  });

app.register(dbConnector);
app.register(routes);

export default app;
