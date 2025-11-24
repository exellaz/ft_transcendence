import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { doesUserIdExist } from "../users/users.service";
import jwt, { JwtPayload } from "jsonwebtoken";
import { HeartbeatWebSocket, OutgoingMessageMsg } from "./online-status.types";
import {
  addOnlineUser,
  getOnlineCount,
  getOnlineSocket,
  isUserOnline,
  notifyFriendsStatus,
  removeOnlineUser,
  sendOnlineFriendsList,
} from "./online-status.manager";

// map of online users: userId -> WebSocket
// const onlineUsers = new Map<number, HeartbeatWebSocket>();

export default async function onlineStatusRoutes(fastify: FastifyInstance) {
  // Define your online status routes here

  // ws://localhost:3000/online-status
  fastify.get(
    "/online-status",
    { websocket: true },
    async (socket: WebSocket, request) => {
      const clientIP = request.socket.remoteAddress;
      console.log(
        `[Online Status websocket] Client connected from ${clientIP}`,
      );

      const ws = socket as HeartbeatWebSocket;

      // Authenticate WebSocket connection via JWT in Sec-WebSocket-Protocol(request header)
      const protocolHeader = request.headers["sec-websocket-protocol"];
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
      } catch {
        ws.close(1008, "Invalid token");
        return;
      }
      //  console.log("[Online Status websocket] Decoded token:", decoded); ////debug

      // if not verified, close connection
      if (decoded === null || !decoded.userId) {
        ws.close(1008, "Invalid token");
        return;
      }

      // access your userId from decoded token
      const userId = decoded.userId;

      const uid = await validateUserId(ws, userId);
      if (uid === null) return;

      // check if userId exist in onlineUsers map
      if (isUserOnline(uid)) {
        console.log(
          `[DUPLICATE LOGIN] UserId ${uid} already logged in. Closing current connection.`,
        );

        try {
          ws.send(
            JSON.stringify({
              type: "DUPLICATE_LOGIN",
              message: "You have been logged out due to a duplicate login.",
            }),
          );
        } catch {
          // ignore individual socket errors
        }
        ws.close(4000, "Duplicate login"); // TODO: verify close code
        return;
      }

      ws.isAlive = true;

      // Add online user to Map
      addOnlineUser(uid, ws);
      console.log(`[Online Status websocket] User ${uid} connected.`);
      //  console.log(
      //    `[Online Status websocket] Total Online Users: ${getOnlineCount()}`,
      //  ); ////debug

      // Send initial online friends list
      sendOnlineFriendsList(uid, ws);

      // Notify friends about online status
      notifyFriendsStatus(uid, true);

      // When client responds to ping
      ws.on("pong", () => {
        //console.log(`[Online Status websocket] Received pong from user ${uid}`); ////debug
        ws.isAlive = true;

        notifyFriendsStatus(uid, true);
      });

      // listen for incoming messages, validate, save, ack
      ws.on("message", async (raw) => {
        // defined for use in the catch block
        let friendshipId: number | undefined;
        let tempId: number | undefined;
        try {
          // --- STEP 1: Parse and validate incoming JSON ---
          const parsed = parseIncomingMessage(raw);
          friendshipId = parsed.friendshipId;
          tempId = parsed.tempId;
          const { message } = parsed;

          // --- STEP 2: Validate DB state and permissions ---
          const { participants } = await validateFriendshipAndPermissions(
            fastify,
            userId,
            friendshipId!,
          );

          // --- STEP 3: Save message to DB ---
          const saved = await fastify.db.friendChatMessage.create({
            data: { friendshipId, senderId: userId, message: message },
            select: {
              id: true,
              friendshipId: true,
              senderId: true,
              message: true,
              timestamp: true,
            },
          });

          // --- STEP 4: Broadcast to both participants ---
          const friendId = participants.find((id) => id !== userId);
          if (friendId) {
            const friendSocket = getOnlineSocket(friendId);
            if (friendSocket && friendSocket.readyState === friendSocket.OPEN) {
              // fetch friend's username for toast display
              const sender = await fastify.db.user.findUnique({
                where: { id: userId },
                select: { username: true },
              });
              try {
                friendSocket.send(
                  JSON.stringify({
                    type: "FRIEND_MESSAGE",
                    username: sender?.username,
                    message: saved,
                  }),
                );
              } catch {
                // ignore individual socket errors
              }
            }
          }

          // --- STEP 5: ACK to sender for optimistic UI reconciliation ---
          ws.send(
            JSON.stringify({
              type: "MESSAGE_ACK",
              tempId,
              savedMessage: saved,
            }),
          );
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "internal server error";
          fastify.log?.error?.({ err }, "friend chat handler error");
          ws.send(
            JSON.stringify({
              type: "MESSAGE_ERR",
              friendshipId,
              tempId,
              error: message,
            }),
          );
        }
      });

      ws.on("close", (code, reason) => {
        removeOnlineUser(uid);
        console.log(
          `[Online Status websocket]Client ${clientIP} disconnected - Code: ${code}, Reason: ${reason?.toString() || "none"}`,
        );
        console.log(`[Online Status websocket] User ${uid} disconnected.`);
        console.log(
          `[Online Status websocket] Remaining Online Users: ${getOnlineCount()}`,
        );
        //console.log(`updated onlineUser map size: ${getOnlineCount()}`); ////debug
        // Notify friends about offline status
        notifyFriendsStatus(uid, false);
      });

      ws.on("error", (error) => {
        console.error(
          `[Online Status websocket] WebSocket error for ${clientIP}:`,
          error,
        );
      });
    },
  );
}

async function validateUserId(
  ws: WebSocket,
  userId: string | undefined,
): Promise<number | null> {
  if (!userId) {
    ws.close(1008, "Missing userId");
    return null;
  }

  const uid = Number(userId);
  if (isNaN(uid) || uid <= 0) {
    ws.close(1008, "Invalid userId");
    return null;
  }

  // check userId is exist in database
  if (!(await doesUserIdExist(uid))) {
    ws.close(1008, "User does not exist");
    return null;
  }

  return uid;
}

// HELPER FUNCTIONS FOR MESSAGE EVENT
function parseIncomingMessage(raw: WebSocket.RawData) {
  let msg: OutgoingMessageMsg;
  // 1) Validate JSON
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    throw new Error("malformed json");
  }

  // 2) Validate message fields
  if (
    msg?.type !== "OUTGOING_MESSAGE" ||
    typeof msg?.tempId !== "number" ||
    typeof msg?.friendshipId !== "number" ||
    typeof msg?.message !== "string"
  ) {
    throw new Error("invalid message shape");
  }

  const tempId = msg.tempId;
  const friendshipId = msg.friendshipId;
  const message = msg.message.trim();

  // 3) Validate message length
  if (!message || message.length === 0 || message.length > 200) {
    throw new Error("invalid message length");
  }

  return { tempId, friendshipId, message };
}

async function validateFriendshipAndPermissions(
  fastify: FastifyInstance,
  userId: number,
  friendshipId: number,
) {
  // 1) Fetch friendship and check friendship status
  const friendship = await fastify.db.friendship.findUnique({
    where: { id: friendshipId },
    select: {
      requesterId: true,
      accepterId: true,
      status: true,
    },
  });

  if (!friendship || friendship.status !== "accepted") {
    throw new Error("invalid or unaccepted friendship");
  }

  const { requesterId, accepterId } = friendship;
  const participants = [requesterId, accepterId];

  // 2) Verify user is participant
  if (!participants.includes(userId)) {
    throw new Error("unauthorized");
  }

  const otherUserId = requesterId === userId ? accepterId : requesterId;

  // 3) Verify neither party is blocked
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
    throw new Error("cannot send to blocked user");
  }

  return { participants, otherUserId };
}
