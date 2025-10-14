// types/fastify.d.ts
import "fastify";
import Database from "better-sqlite3";

// Declare Fastify type augmentation (so TS knows about `fastify.db`)
declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient;
  }
  interface FastifyError {
    validation?: Array<{
      instancePath?: string;
      keyword: string;
      params?: {
        missingProperty?: string;
        [key: string]: unknown;
      };
      message?: string;
      schemaPath?: string;
      data?: unknown;
    }>;
    validationContext?: string;
  }
}

// // declare module is used to augment or extend the type definitions of an existing module (like fastify).
// declare module "fastify" {
//   interface FastifyInstance {
//     db: Database;
//   }
// }
