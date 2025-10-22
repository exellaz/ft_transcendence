import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { getAcceptedFriends } from "../friends/friendship/friendship.service";

const onlineUsers = new Map<number, WebSocket>();

export default async function onlineStatusRoutes(fastify: FastifyInstance) {
  // Define your online status routes here

  // ws://localhost:3000/online-status?userId=123
  fastify.get(
    "/online-status",
    { websocket: true },
    (connection: WebSocket, request) => {
      
      const clientIP = request.socket.remoteAddress;
      console.log(`Client connected from ${clientIP}`);
      
      // TODO: Authenticate user (e.g., via query string token)
      // TODO: Get userId from token
      const { userId } = request.query as { userId?: string };
      if (!userId) {
        connection.close(1008, "Missing userId");
        return;
      }

      const uid = Number(userId);
      if (isNaN(uid) || uid <= 0) {
        connection.close(1008, "Invalid userId");
        return;
      }
      // TODO: check userId is exist in database

      // Add online user to Map
      onlineUsers.set(uid, connection);
      console.log(`Total Online Users: ${onlineUsers.size}`);
      // Notify friends about online status
      notifyFriendsStatus(uid, true);

      connection.on("close", (code, reason) => {
        onlineUsers.delete(uid);
        console.log(
          `Client ${clientIP} disconnected - Code: ${code}, Reason: ${reason?.toString() || "none"}`,
        );
        console.log(`Remaining Online Users: ${onlineUsers.size}`);
        // Notify friends about offline status
        notifyFriendsStatus(uid, false);
      });

      connection.on("error", (error) => {
        console.error(`WebSocket error for ${clientIP}:`, error);
      });
    },
  );
}

// notifies all friends of a user about their online/offline status
async function notifyFriendsStatus(userId: number, isOnline: boolean) {
  const friends: number[] = await getFriendsOfUser(userId);

  console.log(`friends of user ${userId}:`, friends);
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
