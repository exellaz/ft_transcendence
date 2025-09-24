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
