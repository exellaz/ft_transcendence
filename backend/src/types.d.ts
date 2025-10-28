import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      email: string;
      googleId: string | null;
      avatarUrl: string | null;
      status: string;
      joinedAt: Date;
      updatedAt: Date;
    };
  }
}
