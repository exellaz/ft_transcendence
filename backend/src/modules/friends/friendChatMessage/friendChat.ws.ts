import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { doesUserIdExist, validateUserId } from "../../users/users.service";
import jwt, { JwtPayload } from "jsonwebtoken";
import { authenticate } from "src/plugins/authenticate";

export default async function friendChatRoutes(
  fastify: FastifyInstance
) {
  fastify.get(
    "/ws-friendChat",
    { websocket: true },
    async (socket: WebSocket, req) => {
      const clientIP = req.socket.remoteAddress;
      console.log(`Client connected from ${clientIP}`);

      const ws = socket;

      // TODO: Authenticate user (e.g., via query string token)
      // TODO: Get userId from token

      const token = req.headers["sec-websocket-protocol"];
      if (!token) {
        ws.close(1008, "Missing token");
        return;
      }

      // Verify token
      const secret = process.env.JWT_SECRET as string;
      const decoded = jwt.verify(token, secret) as JwtPayload;
      console.log("Decoded token:", decoded);

      // if not verified, close connection
      if (decoded === null || !decoded.userId) {
        ws.close(1008, "Invalid token");
        return;
      }

      // access your userId from decoded token
      const userId = decoded.userId;
      console.log("User ID:", userId);

      const uid = await validateUserId(ws, userId);
      if (uid === null) return;

      ws.on("close", (code, reason) => {
        console.log(
          `Client ${clientIP} disconnected - Code: ${code}, Reason: ${reason?.toString() || "none"}`
        );
        console.log(`User ${uid} disconnected.`);
      });

      ws.on("error", (error) => {
        console.error(`WebSocket error for ${clientIP}:`, error);
      });
    }
  );
}
