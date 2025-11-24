import { chatRooms } from "../modules/chat/liveChat.ws";
import { rooms, roomEndGame } from "../modules/room/room";
import { createLiveChatMessage } from "../modules/chat/liveChat";
import { URL } from "url";
import { FastifyRequest } from "fastify/types/request";
import WebSocket, { WebSocket as WSWebSocket } from "ws";
import {
  BroadcastMessage,
  WSContext,
  playerInfo,
  Room,
} from "../types/interface";
import jwt, { JwtPayload } from "jsonwebtoken";
import { FastifyInstance } from "fastify";

/**
 * @brief Validate WebSocket connection parameters
 * @param socket The WebSocket connection
 * @param req The HTTP request object
 * @return WSContext if valid, otherwise null (and closes socket)
 * @note Close the socket with appropriate code/message if validation fails
 */
export async function validateConnection(
  socket: WSWebSocket,
  req: FastifyRequest,
  fastify: FastifyInstance,
): Promise<WSContext | null> {
  const url = new URL(req.url!, `http://${req.headers.host}`); // Parse URL from client request
  //  console.log("WebSocket connection URL:", url.href); ////debug
  const roomId = url.searchParams.get("room") || "-1";
  const side = url.searchParams.get("side") as "left" | "right" | undefined;
  const sprite = url.searchParams.get("sprite") || undefined;

  if (!roomId) {
    // console.log("Invalid roomId:", roomId); ////debug
    socket.close(1008, "Room id is required");
    return null;
  }

  const token = req.headers["sec-websocket-protocol"];
  if (!token) {
    socket.close(1008, "Authentication token is required");
    return null;
  }
  const secret = process.env.JWT_SECRET as string;
  const decode = jwt.verify(token, secret) as JwtPayload;
  if (decode === null || !decode.userId) {
    socket.close(1008, "Invalid authentication token");
    return null;
  }

  const clientId: number = decode.userId;
  //  console.log("[validate token] Authenticated user id: ", clientId); ////debug
  //! need to validate user later
  //  const user = await getUserInfoById({ id: clientId });
  //  if (!user || !user.data) {
  //    socket.close(1008, "User not found");
  //    return null;
  //  }

  const user = await fastify.db.user.findUnique({
    where: { id: clientId },
  });
  if (!user) {
    socket.close(1008, "User not found in database");
    return null;
  }
  //  console.log("[validate token] Authenticated user: ", user); ////debug

  const playerName = user.username;
  if (!playerName) {
    socket.close(1008, "User has no username");
    return null;
  }

  //if have sprite from url param, use it; otherwise use avatarUrl from user profile
  const playerSprite = sprite || user.avatarUrl;
  if (!playerSprite) {
    socket.close(1008, "User has no sprite");
    return null;
  }

  const room = rooms.get(parseInt(roomId));
  if (!room) {
    // console.log("Room not found:", roomId); ////debug
    socket.close(1008, "Room not found");
    return null;
  }

  return {
    clientId: clientId,
    roomId: parseInt(roomId),
    room,
    side: side,
    playerName,
    playerSprite,
  };
}

/**
 * @brief check whether the game can start based on player readiness and team balance.
 * @param room The game room object
 * @note Updates the "canStart" property of the room and broadcasts state if it changes
 */
export function updateCanStart(room: Room): {
  canStart: boolean;
  reason: string | null;
} {
  // get leader's role
  const leaderId = room.leaderId;
  const leaderPlayer = room.clientRoles.get(leaderId);

  // get left and right players excluding spectators
  const leftPlayers = room.gameState.teams.left.filter(
    (p: playerInfo) => p.role !== "spectator",
  );
  const rightPlayers = room.gameState.teams.right.filter(
    (p: playerInfo) => p.role !== "spectator",
  );

  // combine all players and get total count
  const allPlayers = [...leftPlayers, ...rightPlayers];

  // get non-leader players and check if all are ready
  const nonLeaderPlayers = leaderPlayer
    ? allPlayers.filter((p: playerInfo) => p.clientId !== leaderId)
    : allPlayers;
  const allReady = nonLeaderPlayers.every((p: playerInfo) => p.ready);

  // check if teams are balanced
  const teamsBalanced =
    leftPlayers.length === rightPlayers.length && leftPlayers.length > 0;

  const enoughPlayers =
    leftPlayers.length + rightPlayers.length >= room.teamSize * 2;

  // --- decide why ---
  let reason: string | null = null;
  if (allPlayers.length <= 1) {
    reason = "Not enough players";
  } else if (!teamsBalanced) {
    reason = "Teams are not equal";
  } else if (!allReady) {
    reason = "Not all players are ready";
  } else if (!enoughPlayers) {
    reason = "Not enough players to start the game";
  }

  // set canStart based on conditions
  room.canStart = reason === null;

  //   console.log("updateCanStart:", { ////debug
  //       allPlayers,
  //       nonLeaderPlayers,
  //   	teamsBalanced,
  //       allReady,
  //       canStart: room.canStart
  //   });

  return { canStart: room.canStart, reason };
}

/**
 * @brief Broadcast a message to all clients in the room.
 * @param room The game room object
 * @param msg The message object to broadcast
 * @note Adds message to room chat history and sends to all connected clients
 */
export function broadcast(room: Room, msg: BroadcastMessage) {
  // console.log("Broadcasting message:", msg); ////debug
  if (msg.type === "chat") {
    room.chatHistory.push(msg);
  }
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg));
    }
  }

  //send this broadcast to global chat as well
  if (msg.type === "chat") {
    const clients = chatRooms.get(room.id);
    if (clients) {
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      }
    }
  }
}

/**
 * @brief handle player switching sides (left/right).
 * @param room The game room object
 * @param socket The WebSocket connection for the client
 * @param newSide The side to switch to ("left" or "right")
 * @return The new role assigned after switching sides, or undefined if switch failed
 */
export function handleSwitchSide(
  room: Room,
  socket: WSWebSocket,
  newSide: "left" | "right",
): string | undefined {
  const clientId = room.sockets.get(socket);
  if (!clientId) return;

  // only players can switch
  const player = room.clientRoles.get(clientId);
  if (!player || player.role === "spectator") return;

  //remove the old role before reindex
  const oldRole = player.role;

  // 1. collect playerInfo per team (excluding the switching client)
  const leftPlayers: playerInfo[] = [];
  const rightPlayers: playerInfo[] = [];
  for (const [cid, p] of room.clientRoles.entries()) {
    if (cid === clientId) continue; // skip moving client for now
    if (p.role.startsWith("left_player")) leftPlayers.push({ ...p });
    else if (p.role.startsWith("right_player")) rightPlayers.push({ ...p });
  }

  // add moving client to the target side
  if (newSide === "left") leftPlayers.push({ ...player });
  else rightPlayers.push({ ...player });

  // 2. rebuild team role + update mapping
  function rebuildSide(
    players: playerInfo[],
    side: "left" | "right",
  ): playerInfo[] {
    return players.map((p, i) => {
      const newRole = `${side}_player${i + 1}`;
      // preserve readiness from gameState if available
      const oldReady =
        room.gameState.teams.left.find(
          (pl: playerInfo) => pl.clientId === p.clientId,
        )?.ready ??
        room.gameState.teams.right.find(
          (pl: playerInfo) => pl.clientId === p.clientId,
        )?.ready ??
        p.ready ??
        false;

      const updated = { ...p, role: newRole, ready: oldReady };

      room.clientRoles.set(p.clientId, updated);
      return updated;
    });
  }

  room.gameState.teams.left = rebuildSide(leftPlayers, "left");
  room.gameState.teams.right = rebuildSide(rightPlayers, "right");

  // 4. broadcast to all players about the switch
  const newPlayer = room.clientRoles.get(clientId);
  if (!newPlayer) return;
  broadcast(
    room,
    createLiveChatMessage(
      -1,
      "system",
      `${newPlayer.playerName} switched to ${newPlayer.role.startsWith("left") ? "left" : "right"} side.`,
    ),
  );
  console.log(
    `Player ${newPlayer.playerName} (${oldRole}) [ ${clientId} ] switched to ${newPlayer.role.startsWith("left") ? "left" : "right"} side in room ${room.name} (${room.id})`,
  );
  //console.log ("After switch, teams:", room.gameState.teams); ////debug

  // notify to the client about his new role
  if (socket) {
    socket.send(
      JSON.stringify({
        type: "roleUpdate",
        newPlayer: newPlayer,
        gameState: room.gameState,
        leaderId: room.leaderId,
      }),
    );
  }

  // notify all clients about the switch
  const { canStart } = updateCanStart(room);
  broadcast(room, {
    type: "roleUpdate",
    newPlayer: newPlayer,
    gameState: room.gameState,
    leaderId: room.leaderId,
    readyStatus: newPlayer.ready,
    canStart: canStart,
  });

  return newPlayer.role;
}

export function handlePlayerDisconnect(
  room: Room,
  clientId: number,
  gracePeriod: number,
) {
  const player = room.clientRoles.get(clientId);
  if (player) {
    player.online = false;

    //update team status
    room.gameState.teams.left = room.gameState.teams.left.map(
      (p: playerInfo) =>
        p.clientId === clientId ? { ...p, online: false } : p,
    );
    room.gameState.teams.right = room.gameState.teams.right.map(
      (p: playerInfo) =>
        p.clientId === clientId ? { ...p, online: false } : p,
    );

    //broadcast to all players about disconnection
    broadcast(room, {
      type: "playerOffline",
      clientId,
      playerName: player.playerName,
    });
  }

  // start time for end game
  setTimeout(() => {
    //check if player reconnect during grace period
    const currentPlayer = room.clientRoles.get(clientId);
    if (currentPlayer && currentPlayer.online) return;

    // ✅ PRESERVE player info BEFORE removing
    const disconnectedPlayerLeft = room.gameState.teams.left.find(
      (p) => p.clientId === clientId,
    );
    const disconnectedPlayerRight = room.gameState.teams.right.find(
      (p) => p.clientId === clientId,
    );
    const disconnectedPlayer =
      disconnectedPlayerLeft || disconnectedPlayerRight;
    const disconnectedSide = disconnectedPlayerLeft ? "left" : "right";

    // remove from teams and paddles
    room.gameState.teams.left = room.gameState.teams.left.filter(
      (p) => p.clientId !== clientId,
    );
    room.gameState.teams.right = room.gameState.teams.right.filter(
      (p) => p.clientId !== clientId,
    );
    room.clientRoles.delete(clientId);

    //determine winner if only one team left
    const leftRemaining = room.gameState.teams.left.length;
    const rightRemaining = room.gameState.teams.right.length;
    let winner: "left" | "right" | null = null;
    if (leftRemaining > 0 && rightRemaining === 0) winner = "left";
    else if (rightRemaining > 0 && leftRemaining === 0) winner = "right";
    if (winner) {
      console.log(`${winner} side wins due to opponents disconnected`);

      // ✅ Temporarily restore disconnected player to teams for roomEndGame
      if (disconnectedPlayer) {
        if (disconnectedSide === "left") {
          room.gameState.teams.left.push(disconnectedPlayer);
        } else {
          room.gameState.teams.right.push(disconnectedPlayer);
        }
      }

      room.game.forceEnd(winner);
      setTimeout(
        () => roomEndGame(room, true, winner, room.tournamentId),
        1000,
      );
      return;
    }
  }, gracePeriod);
}

/**
 * @brief Start a countdown timer for game start.
 * @param room The game room object
 * @param onComplete Callback function to execute when countdown completes
 * @note Broadcasts countdown updates to all clients in the room
 */
export function startCountdown(room: Room, onComplete: () => void) {
  if (room.countdownTimer) return; // already running

  //set timer for countdown
  let remaining = 5; //? room countdown time
  room.countdownRemaining = remaining;

  //broadcast to clients start from 5
  broadcast(room, { type: "countdown", remaining });

  room.countdownTimer = setInterval(() => {
    if (!room.countdownTimer) return;
    //update remaining time
    remaining -= 1;
    room.countdownRemaining = remaining;

    //broadcast to clients to every update countdown
    broadcast(room, { type: "countdown", remaining });

    if (remaining <= 0) {
      //countdown complete
      clearInterval(room.countdownTimer!);
      room.countdownTimer = null;
      room.countdownRemaining = null;
      onComplete();
    }
  }, 1000);
}

/**
 * @brief Cancel an ongoing countdown timer.
 * @param room The game room object
 * @note Broadcasts countdown cancellation to all clients in the room
 */
export function cancelCountdown(room: Room) {
  if (room.countdownTimer) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
    room.countdownRemaining = null;
    broadcast(room, { type: "countdownCancel" });
  }
}
