import { SwaggerOptions } from "@fastify/swagger";
import { FastifySwaggerUiOptions } from "@fastify/swagger-ui";

// Swagger OpenAPI configuration
export const swaggerOptions: SwaggerOptions = {
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "ft_transcendence's API",
      // description: "Testing the Fastify swagger API",
      version: "0.1.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      { name: "user", description: "User related end-points" },
      { name: "auth", description: "Auth related end-points" },
      { name: "friendships", description: "Friends related end-points" },
      {
        name: "blockedFriendships",
        description: "Blocked Friends related end-points",
      },
      {
        name: "friendChatMessages",
        description: "Friend Chat Message related end-points",
      },
      { name: "tournaments", description: "Tournament related end-points" },
    ],
  },
};

// Swagger UI configuration
export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: "/docs", // visit http://localhost:3000/docs
};
