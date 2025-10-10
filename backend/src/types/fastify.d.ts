// types/fastify.d.ts
import "fastify";
import Database from "better-sqlite3";

// Declare Fastify type augmentation (so TS knows about `fastify.db`)
declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient;
  }
}

// // declare module is used to augment or extend the type definitions of an existing module (like fastify).
// declare module "fastify" {
//   interface FastifyInstance {
//     db: Database;
//   }
// }
