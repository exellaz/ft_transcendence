import { globalChatClients } from "./server.ts";
import { Game } from "./game.ts";
import { createChatMessage } from "./chat.ts";
import { read } from "fs";

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
export function updateCanStart(room: any): boolean {
	const prevCanStart = room.canStart;

	// get leader's role
	const leaderId = room.leaderId;
	const leaderRole = room.clientRoles.get(leaderId);
	const leaderPlayer = leaderRole.role;

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

	console.log("updateCanStart:", { ////debug
	    allPlayers,
	    nonLeaderPlayers,
	    allReady,
	    canStart: room.canStart
	});
	return prevCanStart !== room.canStart;
}

/**
 * @brief Broadcast the current game state to all clients in the room.
 * @param room The game room object
 * @note Updates the "canStart" status before broadcasting
*/
export function broadcastState(room: any) {
	const canStart = updateCanStart(room);
	broadcast(room, {
		type: "state",
		gameState: {
			...room.gameState,
			paused: room.gamePaused,
			countdown: room.gameState.countdown,
		},
		leaderId: room.leaderId,
		canStart: canStart
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

    //remove the old role before reindex
    const oldRole = player.role;
    // Remove old paddle for this client (optional since we'll rebuild paddles)
    delete room.gameState.paddles[oldRole];

    // 1. collect client per team (excluding the switching client)
    const leftClientIds: string[] = [];
    const rightClientIds: string[] = [];
    for (const [cid, p] of room.clientRoles.entries()) {
        if (cid === clientId) continue; // skip moving client for now
        if (p.role.startsWith("left_player")) leftClientIds.push(cid);
        else if (p.role.startsWith("right_player")) rightClientIds.push(cid);
    }

    // add moving client to the target side
    if (newSide === "left") leftClientIds.push(clientId);
    else rightClientIds.push(clientId);

	logBoxed(
        "Switch Event",
        `Player (${oldRole}) [ ${clientId} ] switched to ${newSide} side (pending reindex)`
    );
    broadcast(
        room,
        createChatMessage("system", `${oldRole} switched to ${newSide} side`)
    );

    // 2. rebuild team role + update mapping
    function rebuildSide(clientIds: string[], side: "left" | "right"): string[] {
        const newRoles: string[] = [];

        clientIds.forEach((cid, i) => {
            const newRole = `${side}_player${i + 1}`;
            const oldPlayer = room.clientRoles.get(cid)!;
            const prevRole = oldPlayer.role;

            // update mapping (preserve other fields)
            room.clientRoles.set(cid, { ...oldPlayer, role: newRole });

            // transfer ready status from old role
            const wasReady = room.readyStatus.get(prevRole) || false;
            room.readyStatus.set(newRole, wasReady);
            if (prevRole !== newRole) room.readyStatus.delete(prevRole);

			newRoles.push(newRole);

			if (prevRole !== newRole) {
				logBoxed(
                    "Reassignment",
                    `Player (${prevRole}) [ ${cid} ] reassigned to ${newRole} in room ${room.name} (${room.id})`
                );
                broadcast(
                    room,
                    createChatMessage("system", `${prevRole} reassigned to ${newRole}`)
                );
			}
        });

        return newRoles;
    }

	room.gameState.teams.left = rebuildSide(leftClientIds, "left");
	room.gameState.teams.right = rebuildSide(rightClientIds, "right");


    // 3. reset paddles and reassign positions
    room.gameState.paddles = {};
    game.setPaddlePositionWithTeam(room);

	// 4. broadcast to all players about the switch
	const newPlayer = room.clientRoles.get(clientId);
	// broadcast(room, createChatMessage("system", `${oldRole} switched to ${newPlayer.role}`));
	// console.log(`Player (${oldRole}) [ ${clientId} ] switched to ${newPlayer.role} in room ${room.name} (${room.id})`);
	// console.log("Switch request:", clientId, "→", newSide);
	// console.log("Left clients:", leftClientIds);
	// console.log("Right clients:", rightClientIds);

	// notify to the client about his new role
    if (socket) {
        socket.send(JSON.stringify({
			type: "roleUpdate",
			newPlayer: { id: clientId, role: newPlayer.role },
			gameState: { ...room.gameState },
			leaderId: room.leaderId,
			disconnectPlayers: room.disconnectPlayers,
		}));
    }

    // notify all clients about the switch
    broadcast(room, {
		type: "roleUpdate",
		// newPlayer: { id: clientId, role: newPlayer.role },
		gameState: { ...room.gameState },
		leaderId: room.leaderId,
		disconnectPlayers: room.disconnectPlayers,
	});


    return newPlayer.role;
}


function logBoxed(title: string, message: string) {
    const border = "─".repeat(message.length + 2);
    console.log(`┌─ ${title} ${border}`);
    console.log(`│ ${message} │`);
    console.log(`└${"─".repeat(title.length + title.length + message.length) }┘`);
}

