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
import tournamentWsRoute from "./modules/tournament/tournament.ws";

const app = Fastify({
  //  logger: true
});
await app.register(websocketPlugin);

app.register(fastifyCors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // allow your methods
});

app.register(dbConnector);
app.register(userRoutes);
app.register(authRoutes);
app.register(friendshipRoutes);
app.register(blockedFriendshipRoutes);
app.register(tournamentRoutes);
app.register(tournamentWsRoute);
app.register(gameWsRoute);
app.register(roomWsRoutes);
app.register(liveChatRoutes);
app.register(roomRoutes);
app.register(friendChatMessageRoutes);

// Global error handler (call after all routes/plugins)
app.setErrorHandler((error, request, reply) => {
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send(fail(error.message));
  }

  console.log("Error Message: |, ", error.message, " |");

  // Fastify validation errors (AJV)
  if ((error as any).validation)
    return reply
      .status(400)
      .send(fail(error.message || "Invalid request parameters"));

  return reply.status(500).send(fail(error.message || "Internal server error"));
});

export default app;
