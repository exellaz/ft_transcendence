import { HeartbeatWebSocket, HEARTBEAT_INTERVAL } from "./online-status.types";
import { getAcceptedFriends } from "../friends/friendship/friendship.service";

export const onlineUsers = new Map<number, HeartbeatWebSocket>();

export function addOnlineUser(userId: number, ws: HeartbeatWebSocket) {
  onlineUsers.set(userId, ws);
}

export function removeOnlineUser(userId: number) {
  onlineUsers.delete(userId);
}

export function getOnlineSocket(
  userId: number,
): HeartbeatWebSocket | undefined {
  return onlineUsers.get(userId);
}

export function getOnlineCount(): number {
  return onlineUsers.size;
}

export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId);
}

// notifies all friends of a user about their online/offline status
export async function notifyFriendsStatus(userId: number, isOnline: boolean) {
  //  console.log(
  //    `[Online Status websocket] Notify friends of ${userId}: now ${isOnline ? "online" : "offline"}`,
  //  ); ////debug

  const friends: number[] = await getFriendsOfUser(userId);

  friends.forEach((friendId) => {
    const friendSocket = onlineUsers.get(friendId);
    if (friendSocket) {
      friendSocket.send(
        JSON.stringify({
          type: "FRIEND_STATUS",
          friendId: userId,
          online: isOnline,
        }),
      );
    }
  });
}

export async function sendOnlineFriendsList(
  userId: number,
  ws: HeartbeatWebSocket,
) {
  const friends: number[] = await getFriendsOfUser(userId);
  const onlineFriendIds: number[] = friends.filter((friendId) =>
    onlineUsers.has(friendId),
  );
  //  console.log(
  //    `[Online Status websocket] Sending online friends to ${userId}:`,
  //    onlineFriendIds,
  //  ); ////debug

  ws.send(
    JSON.stringify({
      type: "ONLINE_FRIENDS_LIST",
      onlineFriends: onlineFriendIds,
    }),
  );
}

// returns a list of friend userIds for a given userId
export async function getFriendsOfUser(userId: number) {
  const acceptedFriends = await getAcceptedFriends(userId);

  const friendIds: number[] = acceptedFriends.map((friend) => friend.id);
  return friendIds;
}

export async function notifyFriendshipUpdateToUsers(
  requesterId: number,
  accepterId: number,
) {
  const sockets = [onlineUsers.get(requesterId), onlineUsers.get(accepterId)];
  const userIds = [accepterId, requesterId];

  sockets.forEach((socket, i) => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "FRIENDSHIP_UPDATE",
          userId: userIds[i],
        }),
      );
    }
  });
}

// periodic heartbeat
setInterval(() => {
  //  console.log("[Online Status websocket] Running heartbeat check..."); ////debug
  for (const [uid, ws] of onlineUsers.entries()) {
    if (!ws.isAlive) {
      //  console.log(
      //    `[Online Status websocket] User ${uid} did not respond. Removing...`,
      //  ); ////debug
      ws.terminate(); // use ws.close to specify code/reason if needed
      onlineUsers.delete(uid);
      notifyFriendsStatus(uid, false);
      continue;
    }

    ws.isAlive = false;
    ws.ping(); // triggers "pong" event when client replies
    //console.log(`[Online Status websocket] Sent ping to user ${uid}`); ////debug
  }
}, HEARTBEAT_INTERVAL);
