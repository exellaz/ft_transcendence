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
	const leaderPlayer = room.clientRoles.get(leaderId);

	//get left and right players excluding spectators
	const leftPlayers = room.gameState.teams.left.map((r: any) => {
		const player = [...room.clientRoles.entries()].find(([cid, p]) => p.role === r)?.[1];
		return player?.role !== "spectator" ? r : null;
	}).filter(Boolean) as string[];

	const rightPlayers = room.gameState.teams.right.map((r: any) => {
		const player = [...room.clientRoles.entries()].find(([cid, p]) => p.role === r)?.[1];
		return player?.role !== "spectator" ? r : null;
	}).filter(Boolean) as string[];

	// combine all players and get total count
	const allPlayers = [...leftPlayers, ...rightPlayers];

	// get non-leader players and check if all are ready
	const nonLeaderPlayers = leaderPlayer ? allPlayers.filter(r => r !== leaderPlayer) : allPlayers;
	const allReady = nonLeaderPlayers.every((r: string) => room.readyStatus.get(r));

	// check if teams are balanced
	const teamsBalanced = leftPlayers.length === rightPlayers.length && leftPlayers.length > 0;

	//if all ready, more than 1 player, and teams are balanced, can start
	room.canStart = allReady && allPlayers.length > 1 && teamsBalanced;

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

    // only players can switch
    const player = room.clientRoles.get(clientId);
    if (!player || player.role === "spectator") return;

    // Prevent switching during countdown or when ready (you already had these checks in caller)
    // Remove old paddle for this client (optional since we'll rebuild paddles)
    const oldRole = player.role;
    delete room.gameState.paddles[oldRole];

    // Remove old role from teams
    room.gameState.teams.left = room.gameState.teams.left.filter((r: string) => r !== oldRole);
    room.gameState.teams.right = room.gameState.teams.right.filter((r: string) => r !== oldRole);

    // Rebuild team using clientRoles
    const leftClientIds: string[] = [];
    const rightClientIds: string[] = [];

    // Collect current clients on each side, excluding the moving client
    for (const [cid, p] of room.clientRoles.entries()) {
        if (cid === clientId) continue; // skip moving client for now
        if (p.role.startsWith("left_player")) leftClientIds.push(cid);
        else if (p.role.startsWith("right_player")) rightClientIds.push(cid);
    }

    // Put the moving client into target side's client list
    if (newSide === "left") leftClientIds.push(clientId);
    else rightClientIds.push(clientId);

    // Rebuild roles for left side and update mappings + readyStatus
    const newLeftRoles: string[] = [];
    leftClientIds.forEach((cid, i) => {
        const newRole = `left_player${i + 1}`;
        const oldPlayer = room.clientRoles.get(cid);
        room.clientRoles.set(cid, { clientId: cid, role: newRole });

        const oldReady = room.readyStatus.get(oldPlayer.role) || false;
        room.readyStatus.set(newRole, oldReady);
        if (oldPlayer.role !== newRole) room.readyStatus.delete(oldPlayer.role);

        newLeftRoles.push(newRole);
    });

    // Rebuild roles for right side and update mappings + readyStatus
	const newRightRoles: string[] = [];
	rightClientIds.forEach((cid, i) => {
		const newRole = `right_player${i + 1}`;
		const oldPlayer = room.clientRoles.get(cid)!;
		room.clientRoles.set(cid, { clientId: oldPlayer.clientId, role: newRole });

		const oldReady = room.readyStatus.get(oldPlayer.role) || false;
		room.readyStatus.set(newRole, oldReady);
		if (oldPlayer.role !== newRole) room.readyStatus.delete(oldPlayer.role);

		newRightRoles.push(newRole);
	});

    // Replace teams arrays with the newly computed role names
    room.gameState.teams.left = newLeftRoles;
    room.gameState.teams.right = newRightRoles;

    // Clear and rebuild paddles from scratch to avoid ghost paddles
    room.gameState.paddles = {};
    game.setPaddlePositionWithTeam(room);

    // Broadcast and logging
    const newPLayer = room.clientRoles.get(clientId);
    broadcast(room, createChatMessage("system", `${oldRole} switched to ${newPLayer.role}`));
    broadcastState(room);
    console.log(`Player (${oldRole}) [ ${clientId} ] switched to ${newPLayer.role} in room ${room.name} (${room.id})`);

    // Notify the switching client
    if (socket) {
        socket.send(JSON.stringify({ type: "roleUpdate", role: newPLayer.role }));
    }

    return newPLayer.role;
}


//function reindexTeam(room: any, side: "left" | "right") {
//    const team = room.gameState.teams[side];
//    const newTeam: string[] = [];

//    team.forEach((oldRole: string, i: number) => {
//        const newRole = `${side}_player${i + 1}`;
//        // update clientRoles mapping
//        const clientForRole = [...room.clientRoles.entries()].find(([cid, role]) => role === oldRole);
//        if (clientForRole) {
//			const [clientId] = clientForRole;
//            room.clientRoles.set(clientId, newRole);
//        }
//        // transfer ready status
//        const ready = room.readyStatus.get(oldRole) || false;
//        room.readyStatus.set(newRole, ready);
//        if (oldRole !== newRole) room.readyStatus.delete(oldRole);

//        newTeam.push(newRole);
//    });
//    room.gameState.teams[side] = newTeam;
//}

