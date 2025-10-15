// types/fastify.d.ts
import "fastify";

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
