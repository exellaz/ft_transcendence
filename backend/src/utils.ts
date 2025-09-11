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

    const currentRole = room.clientRoles.get(clientId);
    if (!currentRole || currentRole === "spectator") return;

    // Prevent switching during countdown or when ready (you already had these checks in caller)
    // Remove old paddle for this client (optional since we'll rebuild paddles)
    delete room.gameState.paddles[currentRole];

    // Remove this player's role string from both teams arrays (clean)
    room.gameState.teams.left = room.gameState.teams.left.filter((r: string) => r !== currentRole);
    room.gameState.teams.right = room.gameState.teams.right.filter((r: string) => r !== currentRole);

    // Build arrays of clientIds for each side from clientRoles (single source of truth)
    const leftClientIds: string[] = [];
    const rightClientIds: string[] = [];

    for (const [cid, role] of room.clientRoles.entries()) {
        if (cid === clientId) continue; // skip moving client for now
        if (typeof role === "string") {
            if (role.startsWith("left_player")) leftClientIds.push(cid);
            else if (role.startsWith("right_player")) rightClientIds.push(cid);
        }
    }

    // Put the moving client into target side's client list
    if (newSide === "left") leftClientIds.push(clientId);
    else rightClientIds.push(clientId);

    // Rebuild roles for left side and update mappings + readyStatus
    const newLeftRoles: string[] = [];
    for (let i = 0; i < leftClientIds.length; i++) {
        const cid = leftClientIds[i];
        const newRole = `left_player${i + 1}`;
        const oldRole = room.clientRoles.get(cid);

        // update clientRoles -> canonical newRole
        room.clientRoles.set(cid, newRole);

        // move readyStatus from old role key to new role key
        const oldReady = typeof oldRole === "string" ? room.readyStatus.get(oldRole) : false;
        room.readyStatus.set(newRole, !!oldReady);
        if (typeof oldRole === "string" && oldRole !== newRole) room.readyStatus.delete(oldRole);

        newLeftRoles.push(newRole);
    }

    // Rebuild roles for right side and update mappings + readyStatus
    const newRightRoles: string[] = [];
    for (let i = 0; i < rightClientIds.length; i++) {
        const cid = rightClientIds[i];
        const newRole = `right_player${i + 1}`;
        const oldRole = room.clientRoles.get(cid);

        room.clientRoles.set(cid, newRole);

        const oldReady = typeof oldRole === "string" ? room.readyStatus.get(oldRole) : false;
        room.readyStatus.set(newRole, !!oldReady);
        if (typeof oldRole === "string" && oldRole !== newRole) room.readyStatus.delete(oldRole);

        newRightRoles.push(newRole);
    }

    // Replace teams arrays with the newly computed role names
    room.gameState.teams.left = newLeftRoles;
    room.gameState.teams.right = newRightRoles;

    // Clear and rebuild paddles from scratch to avoid ghost paddles
    room.gameState.paddles = {};
    game.setPaddlePositionWithTeam(room);

    // Broadcast and logging
    const newRole = room.clientRoles.get(clientId);
    broadcast(room, createChatMessage("system", `${currentRole} switched to ${newRole}`));
    broadcastState(room);
    console.log(`Player (${currentRole}) [ ${clientId} ] switched to ${newRole} in room ${room.name} (${room.id})`);

    // Notify the switching client
    if (socket) {
        socket.send(JSON.stringify({ type: "roleUpdate", role: newRole }));
    }

    return newRole;
}


function reindexTeam(room: any, side: "left" | "right") {
    const team = room.gameState.teams[side];
    const newTeam: string[] = [];

    team.forEach((oldRole: string, i: number) => {
        const newRole = `${side}_player${i + 1}`;
        // update clientRoles mapping
        const clientForRole = [...room.clientRoles.entries()].find(([cid, role]) => role === oldRole);
        if (clientForRole) {
			const [clientId] = clientForRole;
            room.clientRoles.set(clientId, newRole);
        }
        // transfer ready status
        const ready = room.readyStatus.get(oldRole) || false;
        room.readyStatus.set(newRole, ready);
        if (oldRole !== newRole) room.readyStatus.delete(oldRole);

        newTeam.push(newRole);
    });
    room.gameState.teams[side] = newTeam;
}

