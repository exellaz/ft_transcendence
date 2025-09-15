import { Game } from "./game.ts";
import type { Room } from "../room/room.ts";
import { rooms, startRoomLoop, roomStartGame, roomEndGame } from "../room/room.ts";
import { createLiveChatMessage } from "../chat/liveChat.ts";
import { broadcast, broadcastState, handleSwitchSide, scheduleTimeout } from "../../utils/utils.ts";

const game = new Game(); //create game object

/**
 * @brief Interface for WebSocketHandler class method
*/
interface IWebSocketHandler {
	assignRole(room: Room, clientId: string, socket: any, roomId: string): { id: string, role: string};
	handleMsgOrEvent(socket: any, room: Room, role: { id:string, role: string}, raw:string): void;
	handleDisconnect(socket: any, room: Room, clientId: string, roomId: string): void;
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
	assignRole(room: Room, clientId: string, socket: any, roomId: string, preferredSide?: "left" | "right"): { id: string, role: string} {
		// Add socket to room if present
		if (socket) {
			room.sockets.set(socket, clientId);
			room.clients.add(socket);
		}

		//check if the client already has a playerinfo
		let player = room.clientRoles.get(clientId);

		//assign the info if not exist
		if (!player) {
            let roleStr: string;

			// if player request a side
			if (preferredSide === "left" && room.gameState.teams.left.length < room.teamSize) {
				roleStr = `left_player${room.gameState.teams.left.length + 1}`;
				room.gameState.teams.left.push({ clientId, role: roleStr });
			}
			else if (preferredSide === "right" && room.gameState.teams.right.length < room.teamSize) {
				roleStr = `right_player${room.gameState.teams.right.length + 1}`;
				room.gameState.teams.right.push({ clientId, role: roleStr });
			}
			else {
				roleStr = "spectator";
			}

			// assign the role to the client
            player = { clientId, role: roleStr };
			room.clientRoles.set(clientId, player);

			//initialize thier position and score (prevent garbage value)
			if (roleStr !== "spectator") {
				game.setPaddlePositionWithTeam(room);
				room.gameState.score.left = 0;
				room.gameState.score.right = 0;
			}

			if (socket) {
				//notify to the client about his role
				socket.send(JSON.stringify({
					type: "roleUpdate",
					gameState: {
						...room.gameState,
					},
					newPlayer: { id: clientId, role: roleStr },
					isSpectator: roleStr === "spectator",
					leaderId: room.leaderId,
				}));

				// notify to all in the room about role
				console.log(`Player (${roleStr}) [ ${clientId} ] joined room ${room.name} (${roomId})`);
				broadcast(room, createLiveChatMessage("system", `${roleStr} joined the game.`));
                broadcast(room, {
					type: "roleUpdate",
					newPlayer: { id: clientId, role: roleStr },
					gameState: { ...room.gameState },
					leaderId: room.leaderId,
					disconnectPlayers: room.disconnectPlayers,
				});
			}

			// check if room is full and start game
			const totalPlayers = room.gameState.teams.left.length + room.gameState.teams.right.length;
			if (totalPlayers === room.teamSize * 2 && !room.gameState.gameStarted) {
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
					//if (room.disconnectPlayers.size === 0) room.gamePaused = false;

					//send unpause state to client
					socket.send(JSON.stringify({
						type: "roleUpdate",
						gameState: {
							...room.gameState,
						},
						//paused: room.gamePaused,
						newPlayer: { id: clientId, role: player.role },
						isSpectator: player.role === "spectator",
						leaderId: room.leaderId,
					}));

					// notify to all in the room about reconnected and unpause if needed
					console.log(`Player (${player.role}) [ ${clientId} ] reconnected as ${player.role} in room ${room.name} (${roomId})`);
					broadcast(room, createLiveChatMessage("system", `${player.role} reconnect the game.`));
					broadcastState(room);

				}
			}
		}
		return { id: clientId, role: player.role };
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
	handleMsgOrEvent(socket: any, room: Room, role: { id: string, role: string }, raw:string) {
		const msg = JSON.parse(raw);
		const clientId = room.sockets.get(socket);
		if (!clientId) return; //if no client id exit
		const player = room.clientRoles.get(clientId);

        //if no player then exit
        if (!player) return;

		switch (msg.type) {
			case "move":
				if (role.role !== "spectator") {
					room.gameState.paddles[role.id!] = game.updatePaddlePosition(
						room.gameState.paddles[role.id!] ?? 0,
						msg.dy,
						room.height,
						room.setting.paddleHeight
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
				broadcast(room, createLiveChatMessage(role.role ?? "spectator", String(msg.text)));
				break;

			case "switchSide":
                if (role.role === "spectator") return;

				if (room.gameState.countdown > 0) {
					socket.send(JSON.stringify({ type: "error", text: "Cannot switch side during countdown" }));
					console.log(`Player (${role.role}) [${role.id}] fail to switch side during countdown in room (${room.name}) [${room.id}]`);
					return;
				}

				if (room.readyStatus.get(role.id)) {
					socket.send(JSON.stringify({ type: "error", text: "Cannot switch side when ready. Unready first." }));
					console.log(`Player (${role.role}) [${role.id}] fail to switch side when ready in room (${room.name}) [${room.id}]`);
					return;
				}

				const newRole = handleSwitchSide(room, socket, msg.side as "left" | "right");
				if (newRole) role.role = newRole;
				break;

			case "ready":
				// Ignore if spectator, no role, or leader
                if (role.role === "spectator" || clientId === room.leaderId) return;

				room.readyStatus.set(role.id, msg.ready);
				broadcast(room, createLiveChatMessage("system", `(${role.role}) [${role.id}] is ${msg.ready ? "ready" : "unready"}.`));
				console.log(`Player (${role.role}) [${role.id}] is ${msg.ready ? "ready" : "unready"} in room (${room.name}) [${room.id}]`);
				broadcastState(room);
				break;

			case "start":
				//if not leader can't start
				if (clientId !== room.leaderId) {
					socket.send(JSON.stringify({ type: "error", text: "Only the leader can start the game" }));
					console.log(`Player (${role.role}) [${role.id}] tried to start the game but is not the leader in room (${room.name}) [${room.id}]`);
					broadcast(room, createLiveChatMessage("system", `Cannot start: you are not the leader`));
					return;
				}

                //if not enough player, cannot start
				const totalPlayers = room.gameState.teams.left.length + room.gameState.teams.right.length;
				if (totalPlayers < room.teamSize * 2) {
					socket.send(JSON.stringify({ type: "error", text: "insufficient players" }));
					console.log(`Player (${role.role}) [${role.id}] tried to start the game but insufficient player in room (${room.name}) [${room.id}]`);
					broadcast(room, createLiveChatMessage("system", `Cannot start: insufficient players`));
					return;
				}

                //if not all player ready, cannot start
				if(!room.canStart) {
					socket.send(JSON.stringify({ type: "error", text: "Not all players are ready" }));
					console.log(`Player (${role.role}) [${role.id}] tried to start the game but not all players are ready in room (${room.name}) [${room.id}]`);
					broadcast(room, createLiveChatMessage("system", `Cannot start: player not ready`));
					return;
                }

				room.gameState.countdown = 5 * 60; //? 5 seconds countdown
				room.startRequestedBy = clientId;
				room.gameState.gameStarted = false;
				//room.gamePaused = false;

				console.log(`Player (${role.role}) [${role.id}] started the game in room (${room.name}) [${room.id}]`);
				broadcast(room, createLiveChatMessage("system", `Game starting in ${room.gameState.countdown / 60} seconds...`));
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
	handleDisconnect(socket: any, room: Room, clientId: string, roomId: string) {
		// ---- guard check ----
        //if no room, no socket exit this function
		if (!room || !room.sockets) return;
        //if already marked as disconnected, ignore
        if (room.disconnectPlayers.has(clientId)) return;

        // always trust the latest role from the server mapping
        const player = room.clientRoles.get(clientId);
        if (!player) return;

        const role = player.role;

		// ---- Remove socket and client from room ----
		room.sockets.delete(socket);
		room.clients.delete(socket);

        // ---- mark as disconnected ----
        room.disconnectPlayers.add(clientId);

		// --- handle leader leaving ---
		let leaderChanged = false; //check if leader changed
		if (clientId === room.leaderId) {
			//check for remaining players except spectators and the leaving leader
			const remainingPlayers = room.clientRoles
				? Array.from(room.clientRoles.entries() as Iterable<[any, any]>)
					  .filter(([id, p]) => p.role !== "spectator" && id !== clientId)
					  .map(([id]) => id)
				: [];

            //if have remaining player when leader left pass leader to the player
			if (remainingPlayers.length > 0) {
				room.leaderId = remainingPlayers[0];
				leaderChanged = true;
				broadcast(room, createLiveChatMessage("system", `leader change to [ ${room.leaderId} ].`));
				console.log(`Leader [ ${clientId} ] left. New leader is [ ${room.leaderId} ] in room ${room.name} (${roomId})`);

				// only send role info instead of full object
				const rolesPayload = Object.fromEntries(
					[...room.clientRoles.entries()].map(([id, p]) => [id, p.role])
				);

				//notify all in the room about new leader
				broadcast(room, {
					type: "roleUpdate",
                    newPlayer: { id: clientId, role: room.clientRoles.get(clientId)?.role },
                    gameState: { ...room.gameState },
					leaderId: room.leaderId,
					roles: rolesPayload
				});
			} else {
				room.leaderId = "";
			}
		}

		//---- case: disconnect during game ----
		if (role && role !== "spectator" && room.gameState.gameStarted) {
            console.log(`Player (${role}) [ ${clientId} ] disconnect the room ${room.name} (${roomId})`);
            broadcast(room, createLiveChatMessage("system", `${role} disconnect.`));

            //freeze their paddle position
            if (room.gameState.paddles[clientId] !== undefined) {
                room.gameState.paddles[clientId] = room.gameState.paddles[clientId];
            }

			//notify all in the room about disconnected player and pause state
			broadcast(room, {
				type: "state",
				gameState: {
					...room.gameState,
					countdown: room.gameState.countdown,
                    disconnected: Array.from(room.disconnectPlayers),
				},
				leaderId: room.leaderId,
				canStart: room.canStart
			});

            //if both disconnected, end the game
            const totalPPlayers = room.gameState.teams.left.length + room.gameState.teams.right.length;
            if (room.disconnectPlayers.size >= totalPPlayers) {
                console.log(`All players disconnected, ending game in room ${room.name} (${roomId})`);
                roomEndGame(room);
                rooms.delete(room.id);
            }
			return;
		}

        // ---- case: disconnect during countdown ----
        if (role && role !== "spectator" && room.gameState.countdown > 0 && !room.gameState.gameStarted) {
            console.log(`Player (${role}) [ ${clientId} ] disconnected during countdown in room ${room.name} (${roomId})`);
            broadcast(room, createLiveChatMessage("system", `${role} disconnected during countdown.`));

            broadcast(room, {
                type: "state",
                gameState: { ...room.gameState },
                leaderId: room.leaderId,
                disconnected: Array.from(room.disconnectPlayers),
            });
            return;
        }

        // ---- case: spectator leave ----
		if (role === "spectator") {
			console.log(`Spectator [ ${clientId} ] left the room ${room.name} (${roomId}).`);
			broadcast(room, createLiveChatMessage("system", `Spectator left.`));
			room.clientRoles.delete(clientId);
			return;
		}

		// ---- case: leave before game start / game ended ----
		if (!room.gameState.gameStarted && room.gameState.countdown === 0) {
			console.log(`Player (${role}) [ ${clientId} ] left the room ${room.name} (${roomId}).`);
			broadcast(room, createLiveChatMessage("system", `${role} left.`));

			//remove player from team
			if (role && role !== "spectator") {
				room.gameState.teams.left = room.gameState.teams.left.filter((p: any) => p.role !== role);
				room.gameState.teams.right = room.gameState.teams.right.filter((p: any) => p.role !== role);
				room.readyStatus.delete(clientId);
				room.clientRoles.delete(clientId);
                delete room.gameState.paddles[role];
			}

            //remove room if no player
            const totalPlayers = room.gameState.teams.left.length + room.gameState.teams.right.length;
            if (totalPlayers === 0) {
                console.log(`No players left, deleting room ${room.name} (${roomId})`);
                rooms.delete(room.id);
                return;
            }

			//notify all client about the game is finish and player leave
			broadcast(room, {
                type: "roleUpdate",
                newPlayer: { id: clientId, role: room.clientRoles.get(clientId)?.role },
                gameState: { ...room.gameState },
                leaderId: room.leaderId,
                disconnectPlayers: room.disconnectPlayers,
            });
			return;
		}
	}
}
