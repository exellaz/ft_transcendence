import { globalChatClients } from "./server.ts";
import { Game } from "./game.ts";
import { createChatMessage } from "./chat.ts";

const game = new Game(); //create game object

/**
 * @brief Schedule a timeout for a client action (e.g., disconnect).
 * @param room The game room object
 * @param clientId Unique identifier for the client
 * @param timeout Duration in milliseconds before the timeout triggers
 * @param callback Function to call when the timeout triggers
 * @note Clears any existing timeout for the client before scheduling a new one
*/
export function scheduleTimeout(room: any, clientId: string, timeout: number, callback: () => void) {
	// clear existing timeout for this client if exists
	if (room.pendingDisconnects.has(clientId)) {
		clearTimeout(room.pendingDisconnects.get(clientId));
		room.pendingDisconnects.delete(clientId);
	}

	const timeoutId = setTimeout(() => {
		callback();
		room.pendingDisconnects.delete(clientId);
	}, timeout);

	room.pendingDisconnects.set(clientId, timeoutId);
}

/**
 * @brief check whether the game can start based on player readiness and team balance.
 * @param room The game room object
 * @note Updates the "canStart" property of the room and broadcasts state if it changes
*/
export function updateCanStart(room: any) {
	const prevCanStart = room.canStart;

	// get leader's role
	const leaderId = room.leaderId;
	const leaderRole = [...room.clientRoles.entries()]
		.find(([cid, role]) => cid === leaderId)?.[1];

		// get all players excluding spectators
	const leftPlayers = room.gameState.teams.left.filter((r: string) => r !== "spectator");
	const rightPlayers = room.gameState.teams.right.filter((r: string) => r !== "spectator");

	// combine all players and get total count
	const allPlayers = [...leftPlayers, ...rightPlayers];
	const totalPlayers = allPlayers.length;

	// get non-leader players and check if all are ready
	const nonLeaderPlayers = leaderRole ? allPlayers.filter(r => r !== leaderRole) : allPlayers;
	const allReady = nonLeaderPlayers.every((r: string) => room.readyStatus.get(r));

	// check if teams are balanced
	const teamsBalanced = leftPlayers.length === rightPlayers.length && leftPlayers.length > 0;

	//if all ready, more than 1 player, and teams are balanced, can start
	room.canStart = allReady && totalPlayers > 1 && teamsBalanced;

	// Broadcast state update if canStart status changed
	if (room.canStart !== prevCanStart) {
		broadcast(room, {
			type: "state",
			gameState: {
				...room.gameState,
				paused: room.gamePaused,
				countdown: room.gameState.countdown
			},
			leaderId: room.leaderId,
			canStart: room.canStart,
			allReady: allReady
		});
	}
	// console.log("updateCanStart:", { ////debug
	//     allPlayers,
	//     leaderRole,
	//     nonLeaderPlayers,
	//     allReady,
	//     totalPlayers,
	//     canStart: room.canStart
	// });
}

/**
 * @brief Broadcast the current game state to all clients in the room.
 * @param room The game room object
 * @note Updates the "canStart" status before broadcasting
*/
export function broadcastState(room: any) {
	updateCanStart(room);
	broadcast(room, {
		type: "state",
		gameState: {
			...room.gameState,
			paused: room.gamePaused,
			countdown: room.gameState.countdown,
		},
		leaderId: room.leaderId,
		canStart: room.canStart || false
	});
}

/**
 * @brief Broadcast a message to all clients in the room.
 * @param room The game room object
 * @param msg The message object to broadcast
 * @note Adds message to room chat history and sends to all connected clients
*/
export function broadcast(room: any, msg: any) {
	// console.log("Broadcasting message:", msg); ////debug
	room.chatHistory.push(msg);
	for(const client of room.clients) {
		if (client.readyState === 1) {
			client.send(JSON.stringify(msg));
		}
	}

	//send this broadcast to global chat as well
	if (msg.type === "chat") {
		for (const client of globalChatClients) {
			if (client.readyState === 1) {
				client.send(JSON.stringify(msg));
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
export function handleSwitchSide(room: any, socket: any, newSide: "left" | "right"): string | undefined {
	const clientId = room.sockets.get(socket);
	if (!clientId) return;

	//check if the new side is full
	const currentRole = room.clientRoles.get(clientId);
	if (!currentRole || currentRole === "spectator") return;

	// Remove old paddle position when change side
	delete room.gameState.paddles[currentRole];

	//remove current role from team if the player is switching side
	room.gameState.teams.left = room.gameState.teams.left.filter((r: string) => r !== currentRole);
	room.gameState.teams.right = room.gameState.teams.right.filter((r: string) => r !== currentRole);

	//assign new role
	const newRole = `${newSide}_player${room.gameState.teams[newSide].length + 1}`;
	room.gameState.teams[newSide].push(newRole);
	room.clientRoles.set(clientId, newRole);

	// Transfer ready status to new role
	room.readyStatus.set(newRole, room.readyStatus.get(currentRole) || false);
	room.readyStatus.delete(currentRole);

	//reset paddle position for all players
	game.setPaddlePositionWithTeam(room);

	//broadcast to all client
	broadcast(room, createChatMessage("system", `${currentRole} switched to ${newRole}`));
	broadcast(room, {
		type: "state",
		gameState: {
			...room.gameState,
			paused: room.gamePaused,
			countdown: room.gameState.countdown
		},
		leaderId: room.leaderId,
		canStart: room.canStart
	});
	console.log(`Player (${currentRole}) [ ${clientId} ] switched to ${newRole} in room ${room.name} (${room.id})`);

	// Notify the client of their new role
	if (socket) {
		socket.send(JSON.stringify({ type: "roleUpdate", newRole }));
	}
	return newRole;
}
