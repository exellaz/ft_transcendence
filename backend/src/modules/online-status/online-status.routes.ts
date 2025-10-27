import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { getAcceptedFriends } from "../friends/friendship/friendship.service";
import { doesUserIdExist } from "../users/users.service";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { authenticate } from "src/plugins/authenticate";

// Attach a custom isAlive flag to this WebSocket object
interface HeartbeatWebSocket extends WebSocket {
  isAlive: boolean;
}

const onlineUsers = new Map<number, HeartbeatWebSocket>();

export default async function onlineStatusRoutes(fastify: FastifyInstance) {
  // Define your online status routes here

  // ws://localhost:3000/online-status
  fastify.get(
    "/online-status",
    { websocket: true },
    async (socket: WebSocket, request) => {

      const clientIP = request.socket.remoteAddress;
      console.log(`Client connected from ${clientIP}`);

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
      } catch (err) {
        ws.close(1008, "Invalid token");
        return;
      }
      console.log("Decoded token:", decoded);

      // if not verified, close connection
      if (decoded === null || !decoded.userId) {
        ws.close(1008, "Invalid token");
        return;
      }

      // access your userId from decoded token
      const userId = decoded.userId;
      console.log('User ID:', userId);

      const uid = await validateUserId(ws, userId);
      if (uid === null)
        return;

      ws.isAlive = true;

      // Add online user to Map
      onlineUsers.set(uid, ws);
      console.log(`User ${uid} connected.`);
      console.log(`Total Online Users: ${onlineUsers.size}`);

      // Send initial online friends list
      sendOnlineFriendsList(uid, ws);

      // Notify friends about online status
      notifyFriendsStatus(uid, true);

      // When client responds to ping
      ws.on("pong", () => {
        console.log(`Received pong from user ${uid}`);
        ws.isAlive = true;
      });

      ws.on("close", (code, reason) => {
        onlineUsers.delete(uid);
        console.log(
          `Client ${clientIP} disconnected - Code: ${code}, Reason: ${reason?.toString() || "none"}`,
        );
        console.log(`User ${uid} disconnected.`);
        console.log(`Remaining Online Users: ${onlineUsers.size}`);
        // Notify friends about offline status
        notifyFriendsStatus(uid, false);
      });

      ws.on("error", (error) => {
        console.error(`WebSocket error for ${clientIP}:`, error);
      });
    },
  );
}

const HEARTBEAT_INTERVAL = 10000; // 10s
setInterval(() => {
  console.log("Running heartbeat check...");
  for (const [uid, ws] of onlineUsers.entries()) {
    if (!ws.isAlive) {
      console.log(`User ${uid} did not respond. Removing...`);
      ws.terminate(); // use ws.close to specify code/reason if needed
      onlineUsers.delete(uid);
      notifyFriendsStatus(uid, false);
      continue;
    }

    ws.isAlive = false;
    ws.ping(); // triggers "pong" event when client replies
    console.log(`Sent ping to user ${uid}`);
  }
}, HEARTBEAT_INTERVAL);

async function validateUserId(ws: WebSocket, userId: string | undefined): Promise<number | null> {
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

async function sendOnlineFriendsList(userId: number, ws: HeartbeatWebSocket) {
  const friends: number[] = await getFriendsOfUser(userId);
  const onlineFriendIds: number[] = friends.filter((friendId) =>
    onlineUsers.has(friendId),
  );
  console.log(`Sending online friends to ${userId}:`, onlineFriendIds);

  ws.send(
    JSON.stringify({
      type: "ONLINE_FRIENDS_LIST",
      onlineFriends: onlineFriendIds,
    }),
  );
}

// notifies all friends of a user about their online/offline status
async function notifyFriendsStatus(userId: number, isOnline: boolean) {
  console.log(`Notify friends of ${userId}: now ${isOnline ? "online" : "offline"}`);

  const friends: number[] = await getFriendsOfUser(userId);

  friends.forEach((friendId) => {
    const friendSocket = onlineUsers.get(friendId);
    if (friendSocket) {
      friendSocket.send(
        JSON.stringify({
          type: "FRIEND_STATUS", // ? what is type?
          friendId: userId,
          online: isOnline,
        }),
      );
    }
  });
}

// returns a list of friend userIds for a given userId
async function getFriendsOfUser(userId: number) {
  const acceptedFriends = await getAcceptedFriends(userId);

  const friendIds: number[] = acceptedFriends.map((friend) => friend.id);
  return friendIds;
}
