import { chatRooms } from "../modules/chat/liveChat.ws";
import { rooms, roomEndGame } from "../modules/room/room";
import { createLiveChatMessage } from "../modules/chat/liveChat";
import { URL } from "url";
import { FastifyRequest } from "fastify/types/request";
import WebSocket, { WebSocket as WSWebSocket } from "ws";
import { BroadcastMessage, WSContext, playerInfo, Room } from "./interface";

/**
 * @brief Validate WebSocket connection parameters
 * @param socket The WebSocket connection
 * @param req The HTTP request object
 * @return WSContext if valid, otherwise null (and closes socket)
 * @note Close the socket with appropriate code/message if validation fails
 */
export function validateConnection(socket: WSWebSocket, req: FastifyRequest): WSContext | null {
  const url = new URL(req.url!, `http://${req.headers.host}`); // Parse URL from client request
  const clientId = url.searchParams.get("id");
  const roomId = url.searchParams.get("room");
  const side = url.searchParams.get("side") as "left" | "right" | null;
  const playerName = url.searchParams.get("name");
  const playerSprite = url.searchParams.get("sprite");

  if (!clientId) {
    // console.log("Invalid clientId:", clientId); ////debug
    socket.close(1008, "Client id is required");
    return null;
  }

  if (!roomId) {
    // console.log("Invalid roomId:", roomId); ////debug
    socket.close(1008, "Room id is required");
    return null;
  }

  if (!side || (side && side !== "left" && side !== "right")) {
    // console.log("Invalid side:", side); ////debug
    socket.close(1008, "Side is required");
    return null;
  }

  if (!playerName || playerName.trim() === "" || playerName === "undefined") {
    // console.log("Invalid playerName:", playerName); ////debug
    socket.close(1008, "Player name is required");
    return null;
  }

  if (!playerSprite) {
    // console.log("Invalid playerSprite:", playerSprite); ////debug
    socket.close(1008, "Player sprite is required");
    return null;
  }

  const room = rooms.get(parseInt(roomId));
  if (!room) {
    // console.log("Room not found:", roomId); ////debug
    socket.close(1008, "Room not found");
    return null;
  }

  return {
    clientId: parseInt(clientId),
    roomId: parseInt(roomId),
    room,
    side: side ?? undefined,
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

  // --- decide why ---
  let reason: string | null = null;
  if (allPlayers.length <= 1) {
    reason = "Not enough players";
  } else if (!teamsBalanced) {
    reason = "Teams are not equal";
  } else if (!allReady) {
    reason = "Not all players are ready";
  }

  // set canStart based on conditions
  room.canStart = reason === null;

  // console.log("updateCanStart:", { ////debug
  //     allPlayers,
  //     nonLeaderPlayers,
  // 	teamsBalanced,
  //     allReady,
  //     canStart: room.canStart
  // });

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
  // Remove old paddle for this client (optional since we'll rebuild paddles)
  delete room.gameState.paddles[oldRole];

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
  function rebuildSide(players: playerInfo[], side: "left" | "right"): playerInfo[] {
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
  // start time for end game
  setTimeout(() => {
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
      room.game.forceEnd(winner);
      setTimeout(() => roomEndGame(room, true, winner), 1000);
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

  //set timer for 5 seconds countdown
  let remaining = 1; //? seconds
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

// export function startTournamentCountdown(
// 	tournamentId: number,
// 	broadcast: (msg: string) => void,
// 	countdownTime: number = 10,
// 	client: Map<WebSocket, { tournamentId: number; playerId: number }>
// ) {
//   const tournament = tournaments.get(tournamentId);
//   if (!tournament || tournament.countdownTimer) return; // already running

//   //set timer for 5 seconds countdown
//   tournament.countdownRemaining = countdownTime;

//   tournament.countdownTimer = setInterval(() => {
//     const t = tournaments.get(tournamentId);
//     if (!t) return;

//     if (t.countdownRemaining! > 0) {
//         broadcast(JSON.stringify({ type: "countdown", remaining: t.countdownRemaining }));
//         t.countdownRemaining!--;
//     } else {
//       //countdown complete
//       clearInterval(t.countdownTimer);
//       t.countdownTimer = undefined;
//       t.countdownRemaining = undefined;
//       t.started = true;

//       const shuffeld = [...t.players].sort(() => 0.5 - Math.random());
//       const matches: TournamentMatch[] = [];
//       for (let i = 0; i < shuffeld.length; i += 2) {
//         const pair = shuffeld.slice(i, i + 2);
//         const room = createGameRoom(tournamentId, pair);
//         console.log("Tournament game room created:", room); ////debug

//         for (const [ws, info] of client.entries()) {
//           if (info.tournamentId === tournamentId) {
//             const matchPlayer = pair.find(p => p.id === info.playerId);
//             if (matchPlayer) {
//               room.clients.add(ws);
//               room.sockets.set(ws, info.playerId);

//               // Set sessionStorage only if playerId is defined and found in clientRoles
//               const playerInfo = room.clientRoles.get(info.playerId);
//               if (playerInfo) {
// 				ws.send(JSON.stringify({
// 					type: "getPlayerTeam",
// 					roomId: room.id,
// 					roomName: tournament.stage,
// 					team: playerInfo.team === "left" ? "left" : "right",
// 				}));
//               }
//             }
//           }
//         }

//         matches.push({ roomId: room.id, players: pair, winnerId: -1 });
//         startRoomLoop(room);
//       }

//       t.matches = matches;
//       t.stage = "quarterfinals";

//       broadcast(JSON.stringify({ type: "tournamentStarted", stage: t.stage, matches: t.matches }));
//       console.log (`Tournament ${tournamentId} started with ${t.players.length} players`); //// debug
//     }
//   }, 1000);
//   console.log (`Tournament ${tournamentId} countdown started`); //// debug
// }

// export function cancelTournamentCountdown(tournamentId: number, broadcast: (msg: string) => void) {
//     const tournament = tournaments.get(tournamentId);
//     if (!tournament || !tournament.countdownTimer) return;

//     clearInterval(tournament.countdownTimer);
//     tournament.countdownTimer = undefined;
//     tournament.countdownRemaining = undefined;
//     broadcast(JSON.stringify({ type: "countdownCancel" }));
//     console.log (`Tournament ${tournamentId} countdown cancelled`); //// debug
// }

// export function createGameRoom(
//     tournamentId: number,
//     playerPair: { id: number, username: string, spriteUrl: string }[]
// ) {
//     const roomId = generateRoomId();
//     const roomName = `Tournament ${tournamentId} - Room ${roomId}`;

//     const pongGame = new PongGame(
//       false,
//       {
//         ballSpeed: 1,
//         ballSize: 1,
//         paddleSpeed: 1,
//         scorePoint: 1,
//         map: "stadium",
//       },
// 	  (winner) => {
// 		const room = rooms.get(roomId);
// 		if (!room) return;
// 		roomEndGame(room, true, winner);
// 	  }
//     );

//     if (!playerPair[0] || !playerPair[1]) {
//         throw new Error("playerPair must contain two defined players");
//     }

//     const leftPlayer: playerInfo = {
//         clientId: playerPair[0].id,
//         playerName: playerPair[0].username,
//         role: "left_player1",
//         team: "left",
//         leader: false,
//         spriteUrl: playerPair[0].spriteUrl,
//         ready: true,
//     }

//     const rightPlayer: playerInfo = {
//         clientId: playerPair[1].id,
//         playerName: playerPair[1].username,
//         role: "right_player1",
//         team: "right",
//         leader: false,
//         spriteUrl: playerPair[1].spriteUrl,
//         ready: true,
//     }

//     const newRoom: Room = {
//         id: roomId,
//         name: roomName,
//         teamSize: 1,
//         width: 800,
//         height: 400,
//         setting: {
//             ballSpeed: 1,
//             ballSize: 1,
//             paddleSpeed: 1,
//             scorePoint: 1,
//             map: "stadium"
//         },
//         gameState: {
//             ball: { x:0, y:0, dx:0, dy:0 },
//             paddles: {},
//             teams: { left: [leftPlayer], right: [rightPlayer] },
//             score: { left: 0, right: 0 },
//             gameStarted: false,
//             gameEnded: false,
//         },
//         clients: new Set(),
//         clientRoles: new Map<number, playerInfo>([
//             [leftPlayer.clientId, leftPlayer],
//             [rightPlayer.clientId, rightPlayer],
//         ]),
//         sockets: new Map<WebSocket, number>(),
//         chatHistory: [],
//         game: pongGame,
//         duration: 0,
//         canStart: false,
//         leaderId: -1,
//         private: false,
//     };

//     rooms.set(roomId, newRoom);

//     console.log(`Created game room ${roomName} (${roomId}) for tournament ${tournamentId} with players ${leftPlayer.playerName} and ${rightPlayer.playerName}`);

//     return newRoom;
// }
