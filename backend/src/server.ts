import Fastify from "fastify";
import db from "./db";
import fastifyCors from "@fastify/cors";

const fastify = Fastify({ logger: true });

await fastify.register(fastifyCors, {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE"], // allow your methods
  });

/*

POST /users { "username": "Alice" } → create user
GET /users → list users
GET /users/1 → get single user
PUT /users/1 { "username": "Bob" } → update
DELETE /users/1 → delete

*/

// CREATE
fastify.post("/users", async (request, reply) => {
  const { username } = request.body as { username: string };
  try {
    const stmt = db.prepare("INSERT INTO users (username) VALUES (?)");
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
  const rows = db.prepare("SELECT * FROM users").all();
  return rows;
});

// READ (single user)
fastify.get("/users/:id", async (request) => {
  const { id } = request.params as { id: string };
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return row || { error: "User not found" };
});

// UPDATE
fastify.put("/users/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { username } = request.body as { username: string };
  const stmt = db.prepare("UPDATE users SET username = ? WHERE id = ?");
  const info = stmt.run(username, id);
  return info.changes > 0 ? { id, username } : { error: "User not found" };
});

// DELETE
fastify.delete("/users/:id", async (request) => {
  const { id } = request.params as { id: string };
  const stmt = db.prepare("DELETE FROM users WHERE id = ?");
  const info = stmt.run(id);
  return info.changes > 0 ? { id } : { error: "User not found" };
});

// Start server
fastify.listen({ port: 3000, host: "0.0.0.0" }).then(() => {
  console.log("🚀 Server running at http://localhost:3000");
});
