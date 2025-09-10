import { FastifyInstance, FastifyPluginOptions } from "fastify";

/*
POST /users { "username": "Alice" } → create user
GET /users → list users
GET /users/1 → get single user
PUT /users/1 { "username": "Bob" } → update
DELETE /users/1 → delete
*/

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
async function routes (fastify: FastifyInstance, options: FastifyPluginOptions) {
	// CREATE
	fastify.post("/users", async (request, reply) => {
		const { username } = request.body as { username: string };
		try {
		  const stmt = fastify.db.prepare("INSERT INTO users (username) VALUES (?)");
		  const info = stmt.run(username);

		  return { id: info.lastInsertRowid, username };
		} catch (err: any) {
		  if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
			reply.code(400); // Bad Request
			return { error: "Username already exists" };
		  }

		  console.error("DB Insert Error:", err);
		  reply.code(500);
		  return { error: "Database error" };
		}
	  });

	  // READ (all users)
	  fastify.get("/users", async () => {
		const rows = fastify.db.prepare("SELECT * FROM users").all();
		return rows;
	  });

	  // READ (single user)
	  fastify.get("/users/:id", async (request) => {
		const { id } = request.params as { id: string };
		const row = fastify.db.prepare("SELECT * FROM users WHERE id = ?").get(id);
		return row || { error: "User not found" };
	  });

	  // UPDATE
	  fastify.put("/users/:id", async (request, reply) => {
		const { id } = request.params as { id: string };
		const { username } = request.body as { username: string };
		const stmt = fastify.db.prepare("UPDATE users SET username = ? WHERE id = ?");
		const info = stmt.run(username, id);
		return info.changes > 0 ? { id, username } : { error: "User not found" };
	  });

	  // DELETE
	  fastify.delete("/users/:id", async (request) => {
		const { id } = request.params as { id: string };
		const stmt = fastify.db.prepare("DELETE FROM users WHERE id = ?");
		const info = stmt.run(id);
		return info.changes > 0 ? { id } : { error: "User not found" };
	  });
  }

export default routes;
