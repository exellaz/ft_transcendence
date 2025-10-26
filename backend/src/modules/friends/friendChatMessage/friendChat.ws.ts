import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { validateUserId } from "../../users/users.service";
import jwt, { JwtPayload } from "jsonwebtoken";

export default async function friendChatRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/ws-friendChat",
    { websocket: true },
    async (socket: WebSocket, req) => {
      const clientIP = req.socket.remoteAddress;
      console.log(`Client connected from ${clientIP}`);

      const ws = socket;

      // AUTHENTICATION //
      // Authenticate WebSocket connection via JWT in Sec-WebSocket-Protocol
      const protocolHeader = req.headers["sec-websocket-protocol"];
      const token = Array.isArray(protocolHeader)
        ? protocolHeader[0]
        : protocolHeader;
      if (!token || typeof token !== "string") {
        ws.close(1008, "Missing token");
        return;
      }

      // Verify token (try-catch block used because jwt.verify throws on invalid token)
      const secret = process.env.JWT_SECRET as string;
      let decoded: JwtPayload;
      try {
        decoded = jwt.verify(token, secret) as JwtPayload;
      } catch (err) {
        ws.close(1008, "Invalid token");
        return;
      }

      const userId = decoded?.userId;
      if (!userId) {
        ws.close(1008, "Invalid token payload");
        return;
      }
      console.log("User ID:", userId);

      const uid = await validateUserId(ws, userId);
      if (uid === null) return;
      // AUTHENTICATION COMPLETE //
      // websocket functions can be safely carried out beyond this point //

      ws.on("close", (code, reason) => {
        console.log(
          `Client ${clientIP} disconnected - Code: ${code}, Reason: ${reason?.toString() || "none"}`
        );
        console.log(`User ${uid} disconnected.`);
      });

      ws.on("error", (error) => {
        console.error(`WebSocket error for ${clientIP}:`, error);
      });

      // listen for incoming messages, validate, save, ack
      ws.on("message", async (raw) => {
        // 1) json validation
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch (e) {
          ws.send(JSON.stringify({ type: "error", message: "malformed json" }));
          return;
        }

        // 2) message fields validation
        if (
          msg?.type !== "outgoing_message" ||
          !msg?.friendshipId ||
          !msg?.message
        ) {
          ws.send(
            JSON.stringify({ type: "error", message: "invalid message shape" })
          );
          return;
        }

        const friendshipId = Number(msg.friendshipId);
        const text = String(msg.payload.message).trim();
        const tempId = msg.payload?.tempId ?? null;

        // 3) message length validation
        if (!text || text.length === 0 || text.length > 200) {
          ws.send(
            JSON.stringify({ type: "error", message: "invalid message length" })
          );
          return;
        }

        // DB interactions start here
        try {
          // 1) validate friendshipId and accepted friendship status
          const friendship = await fastify.db.friendship.findUnique({
            where: { id: friendshipId },
            select: {
              requesterId: true,
              accepterId: true,
              status: true,
            },
          });

          if (!friendship || friendship.status !== "accepted") {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "invalid or unaccepted friendship",
              })
            );
            return;
          }

          const { requesterId, accepterId } = friendship;
          const participants = [requesterId, accepterId];

          // 2) validate user is participant in the friendship
          if (!participants.includes(userId)) {
            ws.send(JSON.stringify({ type: "error", message: "unauthorized" }));
            return;
          }

          const otherUserId = requesterId === userId ? accepterId : requesterId;

          // 3) validate user is not blocked by or has not blocked the other user
          const isBlocked = await fastify.db.blockedFriendship.findFirst({
            where: {
              OR: [
                { blockerId: userId, blockedId: otherUserId },
                { blockerId: otherUserId, blockedId: userId },
              ],
            },
            select: { id: true },
          });

          if (isBlocked) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "cannot send to blocked user",
              })
            );
            return;
          }

          // 4) Save message to DB
          const saved = await fastify.db.friendChatMessage.create({
            data: { friendshipId, senderId: userId, message: text },
            select: {
              id: true,
              friendshipId: true,
              senderId: true,
              message: true,
              timestamp: true,
            },
          });

          const payload = { type: "friend_message", message: saved };

          // TBC
          // 5) Broadcast to participants if online
          for (const pid of participants) {
            const sock = onlineUsers.get(pid);
            if (sock && sock.readyState === sock.OPEN) {
              try {
                sock.send(JSON.stringify(payload));
              } catch {}
            }
          }

          // TBC
          // 6) ACK to sender for optimistic UI reconciliation
          ws.send(JSON.stringify({ type: "ack", tempId, savedMessage: saved }));
        } catch (err) {
          fastify.log?.error?.({ err }, "friend chat handler error");
          ws.send(
            JSON.stringify({ type: "error", message: "internal server error" })
          );
        }
      });
    }
  );
}
