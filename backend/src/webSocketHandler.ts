import { Game } from "./game.ts";
import { rooms, startRoomLoop, roomStartGame, roomEndGame } from "./room.ts";
import { createChatMessage } from "./chat.ts";
import { broadcast, broadcastState, handleSwitchSide, scheduleTimeout } from "./utils.ts";

const game = new Game(); //create game object

/**
 * @brief Interface for WebSocketHandler class method
*/
interface IWebSocketHandler {
	assignRole(room: any, clientId: string, socket: any, roomId: string): string;
	handleMsgOrEvent(socket: any, room: any, role:string, raw:string): void;
	handleDisconnect(socket: any, room: any, clientId: string, role:string, roomId: string): void;
}

export class WebSocketHandler implements IWebSocketHandler {
	/**
	 * @brief assign role to client (player, spectator, etc.)
	 * @param room The game room object
	 * @param clientId Unique identifier for the client
	 * @param socket The WebSocket connection for the client
	 * @param roomId The ID of the room
	 * @return The assigned role as a string
	*/
	assignRole(room: any, clientId: string, socket: any, roomId: string, preferredSide?: "left" | "right"): string {
		// Add socket to room if present
		if (socket) {
			room.sockets.set(socket, clientId);
			room.clients.add(socket);
		}

		//check if client has the role
		let role = room.clientRoles.get(clientId);

		//assign the role if not exist
		if (!role) {
			// if player request a side
			if (preferredSide === "left" && room.gameState.teams.left.length < room.teamSize) {
				role = `left_player${room.gameState.teams.left.length + 1}`;
				room.gameState.teams.left.push(role);
			}
			else if (preferredSide === "right" && room.gameState.teams.right.length < room.teamSize) {
				role = `right_player${room.gameState.teams.right.length + 1}`;
				room.gameState.teams.right.push(role);
			}
			else {
				role = "spectator";
			}

			// assign the role to the client
			room.clientRoles.set(clientId, role);

			//initialize thier position and score (prevent garbage value)
			if (role !== "spectator") {
				game.setPaddlePositionWithTeam(room);
				room.gameState.score.left = 0;
				room.gameState.score.right = 0;
			}

			if (socket) {
				// send initial state immediately
				socket.send(JSON.stringify({
					type: "state",
					gameState: {
						...room.gameState,
						paused: room.gamePaused,
						countdown: room.gameState.countdown,
						gameStarted: room.gameState.gameStarted
					},
					isSpectator: role === "spectator",
					leaderId: room.leaderId,
					canStart: room.canStart || false
				}));

				console.log(`Player (${role}) [ ${clientId} ] joined room ${room.name} (${roomId})`);
				broadcast(room, createChatMessage("system", `${role} joined the game.`));
			}

			// check if room is full and start game
			const totalPlayers = room.gameState.teams.left.length + room.gameState.teams.right.length;
			if (totalPlayers === room.teamSize * 2 && !room.gameStarted) {
				roomStartGame(room);
				startRoomLoop(room);
			}
		} else {
			if (socket) {
				//if the player is reconnect
				if (room.pendingDisconnects.has(clientId)) {
					clearTimeout(room.pendingDisconnects.get(clientId)); //remove timeout
					room.pendingDisconnects.delete(clientId); //remove from pending disconnects
					room.disconnectPlayers.delete(clientId); // mark as reconnected

					//if all player reconnected, unpause game
					if (room.disconnectPlayers.size === 0) {
						room.gamePaused = false;
					}

					const role = room.clientRoles.get(clientId);
					console.log(`Player (${role}) [ ${clientId} ] reconnected as ${role} in room ${room.name} (${roomId})`);
					broadcast(room, createChatMessage("system", `${role} reconnect the game.`));

					//send full state immediately tp reconnect player
					socket.send(JSON.stringify({
						type: "state",
						gameState: {
							...room.gameState,
							paused: room.gamePaused,
							countdown: room.gameState,
							gameStarted: room.gameState.gameStarted
						},
						isSpectator: role === "spectator",
						leaderId: room.leaderId,
						canStart: room.canStart
					}));
				}
			}
		}
		return role;
	}

	/**
	 * @brief handle incoming messages or events from clients.
	 * @param socket The WebSocket connection for the client
	 * @param room The game room object
	 * @param role The role of the client (player, spectator, etc.)
	 * @param raw The raw message string received from the client
	 * @note Handles "move", "setWidth", "setHeight", and "chat" message types
	 * @note Updates paddle positions, room dimensions, and broadcasts chat messages
	*/
	handleMsgOrEvent(socket: any, room: any, role:string, raw:string) {
		const msg = JSON.parse(raw);
		const clientId = room.sockets.get(socket);
		const currentRole = room.clientRoles.get(clientId);

		switch (msg.type) {
			case "move":
				const paddleHeight = 80; //? make public
				if (role?.startsWith("left_player") || role!.startsWith("right_player")) {
					room.gameState.paddles[role!] = game.updatePaddlePosition(
						room.gameState.paddles[role!] ?? 0,
						msg.dy,
						room.height,
						paddleHeight
					);
				}
				break;

			case "setWidth":
				room.width = msg.width;
				break;

			case "setHeight":
				room.height = msg.height;
				break;

			case "chat":
				broadcast(room, createChatMessage(role ?? "spectator", String(msg.text)));
				break;

			case "switchSide":
				//ignore if spectator or no role
				if (!currentRole || currentRole === "spectator") return;

				if (room.gameState.countdown > 0) {
					socket.send(JSON.stringify({ type: "error", text: "Cannot switch side during countdown" }));
					console.log(`Player (${role}) [${clientId}] fail to switch side during countdown in room (${room.name}) [${room.id}]`);
					return;
				}

				if (room.readyStatus.get(currentRole)) {
					socket.send(JSON.stringify({ type: "error", text: "Cannot switch side when ready. Unready first." }));
					console.log(`Player (${role}) [${clientId}] fail to switch side when ready in room (${room.name}) [${room.id}]`);
					return;
				}

				const newRole = handleSwitchSide(room, socket, msg.side as "left" | "right");
				if (newRole) role = newRole;
				broadcastState(room);
				break;

			case "ready":
				// Ignore if spectator, no role, or leader
				if (!currentRole || currentRole === "spectator" || clientId === room.leaderId) return;

				room.readyStatus.set(currentRole, msg.ready);
				broadcast(room, createChatMessage("system", `${currentRole} is ${msg.ready ? "ready" : "unready"}.`));
				console.log(`Player (${currentRole}) [${clientId}] is ${msg.ready ? "ready" : "unready"} in room (${room.name}) [${room.id}]`);
				broadcastState(room);
				break;

			case "start":
				//only leader can start the game
				if (clientId !== room.leaderId) {
					socket.send(JSON.stringify({ type: "error", text: "Only the leader can start the game" }));
					console.log(`Player (${currentRole}) [${clientId}] tried to start the game but is not the leader in room (${room.name}) [${room.id}]`);
					return;
				}

				if (room.teamSize < 1) {
					socket.send(JSON.stringify({ type: "error", text: "insufficient players" }));
					console.log(`Player (${currentRole}) [${clientId}] tried to start the game but insufficient player in room (${room.name}) [${room.id}]`);
					broadcast(room, createChatMessage("system", `Cannot start: insufficient players`));
					return;
				}

				if(!room.canStart) {
					socket.send(JSON.stringify({ type: "error", text: "Not all players are ready" }));
					console.log(`Player (${currentRole}) [${clientId}] tried to start the game but not all players are ready in room (${room.name}) [${room.id}]`);
					broadcast(room, createChatMessage("system", `Cannot start: player not ready`));
					return;
				}

				room.gameState.countdown = 5 * 60; //? 5 seconds countdown
				room.startRequestedBy = clientId;
				room.gameState.gameStarted = false;
				room.gamePaused = false;

				console.log(`Player (${currentRole}) [ ${clientId} ] started the game in room (${room.name}) [${room.id}]`);
				broadcast(room, createChatMessage("system", `Game starting in ${room.gameState.countdown / 60} seconds...`));
				broadcastState(room);
				break;

			default:
				console.log("Unknown message type:", msg);
		}
	}

	/**
	 * @brief handle client disconnection from the WebSocket.
	 * @param socket The WebSocket connection for the client
	 * @param room The game room object
	 * @param clientId Unique identifier for the client
	 * @param role The role of the client (player, spectator, etc.)
	 * @param roomId The ID of the room
	*/
	handleDisconnect(socket: any, room: any, clientId: string, _role:string, roomId: string) {
		//if no room, no socket exit this function
		if (!room || !room.sockets) return;

        // always trust the latest role from the server mapping
        const role = room.clientRoles.get(clientId);

		// Remove socket and client from room
		room.sockets.delete(socket);
		room.clients.delete(socket);

		// --- handle leader leaving ---
		let leaderChanged = false;
		if (clientId === room.leaderId) {
			//check for remaining players except spectators and the leaving leader
			const remainingPlayers = room.clientRoles
				? Array.from(room.clientRoles.entries() as Iterable<[any, any]>)
					  .filter(([id, r]) => r !== "spectator" && id !== clientId)
					  .map(([id]) => id)
				: [];

			if (remainingPlayers.length > 0) {
				room.leaderId = remainingPlayers[0];
				leaderChanged = true;
				broadcast(room, createChatMessage("system", `leader change to [ ${room.leaderId} ].`));
				console.log(`Leader [ ${clientId} ] left. New leader is [ ${room.leaderId} ] in room ${room.name} (${roomId})`);
				broadcast(room, {
					type: "roleUpdate",
					leaderId: room.leaderId,
					roles: Object.fromEntries(room.clientRoles)
				});
			} else {
				room.leaderId = "";
			}
		}

		//handle disconnect during game
		if (role && role !== "spectator" && room.gameState.gameStarted) {
			//prevent duplicate disconnect handling
			if (!room.disconnectPlayers.has(clientId)) {
				// mark as disconnected instead of removing
				room.disconnectPlayers.add(clientId);

				//if game start and not paused, pause it
				if (!room.gamePaused) {
					room.gamePaused = true;
					console.log(`Player (${role}) [ ${clientId} ] disconnect the room ${room.name} (${roomId})`);
					broadcast(room, createChatMessage("system", `${role} disconnect.`));
				}
			}

			broadcast(room, { // broadcast updated state to all remaining clients
				type: "state",
				gameState: {
					...room.gameState,
					paused: room.gamePaused,
					countdown: room.gameState.countdown,
				},
				leaderId: room.leaderId,
				canStart: room.canStart
			});

			scheduleTimeout(room, clientId, 50000, () => {
				if (room.gameState.gameStarted && room.disconnectPlayers.has(clientId)) {
					console.log(`Player (${role}) [ ${clientId} ] exited the room ${room.name} (${roomId}) due to timeout.`);
					broadcast(room, createChatMessage("system", `${role} exited the game.`));
					broadcast(room, createChatMessage("system", `Game ended due to player disconnect for long time`));
					roomEndGame(room, true); // true: forced to end game
					rooms.delete(roomId);
				}
			});
			return;
		}

		if (role === "spectator") {
			console.log(`Spectator [ ${clientId} ] left the room ${room.name} (${roomId}).`);
			broadcast(room, createChatMessage("system", `Spectator left.`));
			room.clientRoles.delete(clientId);
			return;
		}

		// handle leave game before game start / game has ended
		if (!room.gameState.gameStarted && room.gameState.countdown === 0) {
			console.log(`Player (${role}) [ ${clientId} ] left the room ${room.name} (${roomId}).`);
			broadcast(room, createChatMessage("system", `${role} left.`));

			//remove player from team
			if (role && role !== "spectator") {
				room.gameState.teams.left = room.gameState.teams.left.filter((r: string) => r !== role);
				room.gameState.teams.right = room.gameState.teams.right.filter((r: string) => r !== role);
				room.readyStatus.delete(role);
				room.clientRoles.delete(clientId);
                delete room.gameState.paddles[role];
			}

			broadcast(room, {
				type: "state",
				gameState: { ...room.gameState },
				leaderId: room.leaderId,
				canStart: room.canStart
			});
			return;
		}

		//handle empty room
		if (room.clients.size === 0) {
			console.log(`Room ${room.name} (${roomId}) is empty. countdown 10s to delete`);

			scheduleTimeout(room, clientId, 10000, () => {
				if (room.clients.size === 0) {
					console.log(`Room ${room.name} (${roomId}) deleted due to empty.`);

					// Clean up any pending disconnect timeouts
					for (const tid of room.pendingDisconnects.values())
						clearTimeout(tid);
					rooms.delete(roomId);
				}
			});
			return;
		}
	}
}
