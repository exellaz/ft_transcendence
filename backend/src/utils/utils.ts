import { globalChatClients } from "../app.ts";
import type { Room } from "../modules/room/room.ts";
import { Game } from "../modules/game/game.ts";
import { createLiveChatMessage } from "../modules/chat/liveChat.ts";

//const game = new Game(); //create game object

/**
 * @brief check whether the game can start based on player readiness and team balance.
 * @param room The game room object
 * @note Updates the "canStart" property of the room and broadcasts state if it changes
*/
export function updateCanStart(room: Room): boolean {
    const prevCanStart = room.canStart;

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
    const allReady = nonLeaderPlayers.every((p: any) => room.readyStatus.get(p.clientId));

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
    return room.canStart;
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
            const prevRole = p.role;
            // update mapping (preserve other fields)
            room.clientRoles.set(p.clientId, { ...p, role: newRole });
            return { ...p, role: newRole };
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
    broadcast(room, createLiveChatMessage("system", `${oldRole} switched to ${newPlayer.role}`));
    console.log(`Player (${oldRole}) [ ${clientId} ] switched to ${newPlayer.role} in room ${room.name} (${room.id})`);
    //console.log ("After switch, teams:", room.gameState.teams); ////debug

    // notify to the client about his new role
    if (socket) {
        socket.send(JSON.stringify({
            type: "roleUpdate",
            newPlayer: { id: clientId, role: newPlayer.role },
            gameState: room.gameState,
            leaderId: room.leaderId,
            disconnectPlayers: room.disconnectPlayers,
        }));
    }

    // notify all clients about the switch
	const canStart = updateCanStart(room);
    broadcast(room, {
        type: "roleUpdate",
        newPlayer: { id: clientId, role: newPlayer.role },
        gameState: room.gameState,
        leaderId: room.leaderId,
        disconnectPlayers: room.disconnectPlayers,
		readyStatus: Object.fromEntries(room.readyStatus.entries()),
		canStart: canStart,
    });

    return newPlayer.role;
}
