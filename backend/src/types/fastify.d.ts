// types/fastify.d.ts
import "fastify";
import Database from "better-sqlite3";

// declare module is used to augment or extend the type definitions of an existing module (like fastify).
declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
}
