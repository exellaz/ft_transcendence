import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      email: string;
      avatarUrl: string | null;
      status: string;
      joinedAt: Date;
      updatedAt: Date;
    };
  }
}
