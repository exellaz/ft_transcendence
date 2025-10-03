import { chatRooms } from "../modules/chat/liveChat.ws";
import { rooms, roomEndGame, type Room, playerInfo } from "../modules/room/room";
import { Game } from "../modules/game/game";
import { createLiveChatMessage } from "../modules/chat/liveChat";
import { URL } from "url";

export interface WSContext {
	clientId: number;
	roomId: number;
	room: any;
	side?: "left" | "right";
    playerName: string;
	playerSprite: string;
}

/**
 * @brief Validate WebSocket connection parameters
 * @param socket The WebSocket connection
 * @param req The HTTP request object
 * @return WSContext if valid, otherwise null (and closes socket)
 * @note Close the socket with appropriate code/message if validation fails
*/
export function validateConnection(socket: any, req:any): WSContext | null {
    const url = new URL(req.url!, `http://${req.headers.host}`); // Parse URL from client request
    const clientId = Number(url.searchParams.get("id"));
    const roomId = Number(url.searchParams.get("room"));
    const side = url.searchParams.get("side") as "left" | "right" | null;
    const playerName = url.searchParams.get("name");
	const playerSprite = url.searchParams.get("sprite");

    if (isNaN(clientId)) {
        console.log("Invalid clientId:", clientId);
		socket.close(1008, "Client id is required");
        return null;
    }

	if (isNaN(roomId)) {
        console.log("Invalid roomId:", roomId);
		socket.close(1008, "Room id is required");
		return null;
	}

	if (!side || (side && side !== "left" && side !== "right")) {
        console.log("Invalid side:", side);
		socket.close(1008, "Side is required");
		return null;
	}

    if (!playerName) {
        console.log("Invalid playerName:", playerName);
        socket.close(1008, "Player name is required");
        return null;
    }

	if (!playerSprite) {
        console.log("Invalid playerSprite:", playerSprite);
		socket.close(1008, "Player sprite is required");
		return null;
	}

	const room = rooms.get(roomId);
	if (!room) {
        console.log("Room not found:", roomId);
		socket.close(1008, "Room not found");
		return null;
	}

    return {
        clientId: Number(clientId),
        roomId: Number(roomId),
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
export function updateCanStart(room: Room): { canStart: boolean; reason: string | null } {

    // get leader's role
    const leaderId = room.leaderId;
    const leaderPlayer = room.clientRoles.get(leaderId);

    // get left and right players excluding spectators
    const leftPlayers = room.gameState.teams.left.filter((p: any) => p.role !== "spectator");
    const rightPlayers = room.gameState.teams.right.filter((p: any) => p.role !== "spectator");

    // combine all players and get total count
    const allPlayers = [...leftPlayers, ...rightPlayers];

    // get non-leader players and check if all are ready
    const nonLeaderPlayers = leaderPlayer
        ? allPlayers.filter((p: any) => p.clientId !== leaderId)
        : allPlayers;
    const allReady = nonLeaderPlayers.every((p: any) => p.ready);

    // check if teams are balanced
    const teamsBalanced = leftPlayers.length === rightPlayers.length && leftPlayers.length > 0;

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
export function broadcast(room: Room, msg: any) {
	// console.log("Broadcasting message:", msg); ////debug
	room.chatHistory.push(msg);
	for(const client of room.clients) {
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
export function handleSwitchSide(room: Room, socket: any, newSide: "left" | "right"): string | undefined {
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
    const leftPlayers: any[] = [];
    const rightPlayers: any[] = [];
    for (const [cid, p] of room.clientRoles.entries()) {
        if (cid === clientId) continue; // skip moving client for now
        if (p.role.startsWith("left_player")) leftPlayers.push({ ...p });
        else if (p.role.startsWith("right_player")) rightPlayers.push({ ...p });
    }

    // add moving client to the target side
    if (newSide === "left") leftPlayers.push({ ...player });
    else rightPlayers.push({ ...player });

    // 2. rebuild team role + update mapping
    function rebuildSide(players: any[], side: "left" | "right"): any[] {
        return players.map((p, i) => {
            const newRole = `${side}_player${i + 1}`;
            // preserve readiness from gameState if available
            const oldReady =
                room.gameState.teams.left.find((pl: playerInfo) => pl.clientId === p.clientId)?.ready ??
                room.gameState.teams.right.find((pl: playerInfo) => pl.clientId === p.clientId)?.ready ??
                p.ready ?? false;

            const updated = { ...p, role: newRole, ready: oldReady };

            room.clientRoles.set(p.clientId, updated);
            return updated;
        });
    }

    room.gameState.teams.left = rebuildSide(leftPlayers, "left");
    room.gameState.teams.right = rebuildSide(rightPlayers, "right");

    // 3. reset paddles and reassign positions
    const game = new Game(); //create game object
    game.setPaddlePositionWithTeam(room);

    // 4. broadcast to all players about the switch
    const newPlayer = room.clientRoles.get(clientId);
	if (!newPlayer) return;
    broadcast(room, createLiveChatMessage(-1, "system", `${newPlayer.playerName} switched to ${newPlayer.role.startsWith("left") ? "left" : "right"} side.`));
    console.log(`Player ${newPlayer.playerName} (${oldRole}) [ ${clientId} ] switched to ${newPlayer.role.startsWith("left") ? "left" : "right"} side in room ${room.name} (${room.id})`);
    //console.log ("After switch, teams:", room.gameState.teams); ////debug

    // notify to the client about his new role
    if (socket) {
        socket.send(JSON.stringify({
            type: "roleUpdate",
            newPlayer: newPlayer,
            gameState: room.gameState,
            leaderId: room.leaderId,
            disconnectPlayers: room.disconnectPlayers,
        }));
    }

    // notify all clients about the switch
	const { canStart } = updateCanStart(room);
    broadcast(room, {
        type: "roleUpdate",
        newPlayer: newPlayer,
        gameState: room.gameState,
        leaderId: room.leaderId,
        disconnectPlayers: room.disconnectPlayers,
		readyStatus: newPlayer.ready,
		canStart: canStart,
    });

    return newPlayer.role;
}

export function handlePlayerDisconnect(room: Room, clientId: number, gracePeriod: number, isDuringGame: boolean) {
    const player = room.clientRoles.get(clientId);
    if (!player) return;

    // mark as disconnected
    room.disconnectPlayers.add(clientId);
	// console.log("room.disconnectPlayers:", room.disconnectPlayers); ////debug

    // notify everyone
	console.log(`Player ${player.playerName} [ ${clientId} ] disconnected from room ${room.name} (${room.id}). Starting grace period of ${gracePeriod/1000} seconds.`);
    broadcast(room, createLiveChatMessage(-1, "system", `${player.playerName} disconnected.`));
    broadcast(room, {
        type: "roleUpdate",
        gameState: room.gameState,
        leaderId: room.leaderId,
    });

    // cancel any existing timer
    if (!room.disconnectTimers) room.disconnectTimers = new Map();
    if (room.disconnectTimers.has(clientId)) {
        clearTimeout(room.disconnectTimers.get(clientId)!);
        room.disconnectTimers.delete(clientId);
    }

    // start timer
    const timer = setTimeout(() => {
        console.log(`${player.playerName} fail to reconnect.`);

        // remove from disconnects
        room.disconnectPlayers.delete(clientId);

        // remove from teams and paddles
        room.gameState.teams.left = room.gameState.teams.left.filter(p => p.clientId !== clientId);
        room.gameState.teams.right = room.gameState.teams.right.filter(p => p.clientId !== clientId);
        delete room.gameState.paddles[clientId];
        room.clientRoles.delete(clientId);

        // if during game, determine winner if only one team left
        if (isDuringGame) {
            const leftRemaining = room.gameState.teams.left.length;
            const rightRemaining = room.gameState.teams.right.length;
            let winner: "left" | "right" | null = null;
            if (leftRemaining > 0 && rightRemaining === 0) winner = "left";
            else if (rightRemaining > 0 && leftRemaining === 0) winner = "right";
            if (winner && !room.gameState.gameEnded) {
                roomEndGame(room, true, winner);
                return;
            }
        }

        // notify updated state
        broadcast(room, {
            type: "roleUpdate",
            gameState: room.gameState,
            leaderId: room.leaderId,
        });

        if (room.disconnectTimers) {
            room.disconnectTimers.delete(clientId);
        }
    }, gracePeriod);

    if (room.disconnectTimers) {
        room.disconnectTimers.set(clientId, timer);
    }
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
  let remaining = 5; //? seconds
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

