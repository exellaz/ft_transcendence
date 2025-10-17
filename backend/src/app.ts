import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import dbConnector from "./plugins/db";
import userRoutes from "./modules/users/users.routes";
import authRoutes from "./modules/auth/auth.routes";
import gameWsRoute from "./modules/game/game.ws";
import roomWsRoutes from "./modules/room/room.ws";
import liveChatRoutes from "./modules/chat/liveChat.ws";
import roomRoutes from "./modules/room/room.routes";
import { fail, ApiError } from "./utils/response";
import friendshipRoutes from "./modules/friends/friendship/friendship.routes";
import blockedFriendshipRoutes from "./modules/friends/blockedFriendship/blockedFriendship.routes";
import friendChatMessageRoutes from "./modules/friends/friendChatMessage/friendChatMessage.routes";
import tournamentRoutes from "./modules/tournament/tournament.routes";
import errorHandler from "./plugins/errorHandler";
import testRoutes from "./modules/test/test.routes";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

const app = Fastify({
  logger: true,
});
app.register(websocketPlugin);

app.register(fastifyCors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // allow your methods
});

app.register(errorHandler);
app.register(dbConnector);

app.register(fastifySwagger, {
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "Test swagger",
      description: "Testing the Fastify swagger API",
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
      { name: "blockedFriendships", description: "Blocked Friends related end-points" },
      { name: "friendChatMessages", description: "Friend Chat Message related end-points" },

    ],
  },
});

app.register(fastifySwaggerUi, {
  routePrefix: "/docs", // visit http://localhost:3000/docs
});

app.register(userRoutes);
app.register(authRoutes);
app.register(friendshipRoutes);
app.register(blockedFriendshipRoutes);
app.register(tournamentRoutes);
app.register(gameWsRoute);
app.register(roomWsRoutes);
app.register(liveChatRoutes);
app.register(roomRoutes);
app.register(friendChatMessageRoutes);
app.register(testRoutes);

export default app;
