// types/fastify.d.ts
import "fastify";

// Declare Fastify type augmentation (so TS knows about `fastify.db`)
declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient;
  }
}
