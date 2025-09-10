// backend/db.ts
import { PrismaClient } from "@prisma/client";
import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";

async function dbConnector(fastify: FastifyInstance) {
  const prisma = new PrismaClient();

  // Decorate fastify instance with prisma
  fastify.decorate("db", prisma);

  // Close Prisma when app shuts down
  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
}

export default fp(dbConnector);




// import Database from "better-sqlite3";
// import fs from "fs";
// import path from "path";
// import fp from "fastify-plugin";
// import { FastifyInstance } from "fastify";


// async function dbConnector(fastify: FastifyInstance) {
//   // Resolve path to data/app.db relative to project root
//   const dataDir = path.resolve("./database");
//   const dbPath = path.join(dataDir, "app.db");

//   // Ensure the directory exists
//   if (!fs.existsSync(dataDir)) {
//     fs.mkdirSync(dataDir, { recursive: true });
//     console.log(`Created directory: ${dataDir}`);
//   }

//   // Open or create database file
//   const db = new Database(dbPath);

//   // Create users table if it doesn't exist
//   db.exec(`
//     CREATE TABLE IF NOT EXISTS users (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       username TEXT NOT NULL UNIQUE
//     )
//     `);
//     fastify.decorate("db", db);

//     // Close DB when app shuts down
//     fastify.addHook("onClose", (instance, done) => {
//       db.close();
//       done();
//     });
// }

// // export default db;
// export default fp(dbConnector)
