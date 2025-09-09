import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import routes from "./routes"

const fastify = Fastify({
  logger: true
});

fastify.register(fastifyCors, {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE"], // allow your methods
  });

fastify.register(routes);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log("🚀 Server runnning at http://localhost:3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
start();
