import Fastify, { FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import dbConnector from "./plugins/db";
import userRoutes from "./modules/users/users.routes";
import authRoutes from "./modules/auth/auth.routes";
import gameWsRoute from "./modules/game/game.ws";
import roomWsRoutes from "./modules/room/room.ws";
import liveChatRoutes from "./modules/chat/liveChat.ws";
import roomRoutes from "./modules/room/room.routes";
import friendshipRoutes from "./modules/friends/friendship/friendship.routes";
import blockedFriendshipRoutes from "./modules/friends/blockedFriendship/blockedFriendship.routes";
import friendChatMessageRoutes from "./modules/friends/friendChatMessage/friendChatMessage.routes";
import tournamentRoutes from "./modules/tournament/tournament.routes";
import tournamentWsRoute from "./modules/tournament/tournament.ws";
import errorHandler from "./plugins/errorHandler";
import testRoutes from "./modules/test/test.routes";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { swaggerOptions, swaggerUiOptions } from "./plugins/swagger";
import { corsOptions } from "./plugins/cors";
import onlineStatusRoutes from "./modules/online-status/online-status.routes";
import multipart from "@fastify/multipart";
import avatarUploadStaticPlugin from "./plugins/avatar-upload";
import assetsStaticPlugin from "./plugins/assets.static";
import { twoFactorRoutes } from "./modules/twoFactor/twoFactor.routes";

const createApp = (): FastifyInstance => {
  console.log("Creating HTTP Fastify instance...");
  return Fastify({ logger: true });
};

const app: FastifyInstance = createApp();

app.register(websocketPlugin);
app.register(fastifyCors, corsOptions);
app.register(errorHandler);
app.register(dbConnector);
app.register(fastifySwagger, swaggerOptions);
app.register(fastifySwaggerUi, swaggerUiOptions);
app.register(multipart);
app.register(avatarUploadStaticPlugin);
app.register(assetsStaticPlugin);

// routes
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
app.register(onlineStatusRoutes);
app.register(twoFactorRoutes);
app.register(testRoutes);

export default app;
