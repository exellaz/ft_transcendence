import { fastify } from "./app.ts";

/**
 * @brief Start the Fastify server on port 4242.
 * @note Listens on all network interfaces
 * @note Logs server address on successful start
 * @note Exits process on failure
*/
try {
	const addr = await fastify.listen({ port: 3000, host: "0.0.0.0" });
	console.log(`Server running at ${addr}`);
} catch (err) {
	console.error("Failed to start server:", err);
	process.exit(1);
}
