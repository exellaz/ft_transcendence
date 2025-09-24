import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: number;
      email?: string;
      name?: string;
    };
  }
}
