import { Game } from "../modules/game/game";
import type { Room } from "../modules/room/room";
import { rooms, startRoomLoop, roomStartGame} from "../modules/room/room";
import { createLiveChatMessage, } from "../modules/chat/liveChat";
import { broadcast, handleSwitchSide, updateCanStart, handlePlayerDisconnect, startCountdown, cancelCountdown } from "./utils";
import { start } from "repl";

const game = new Game(); //create game object

/**
 * @brief Interface for WebSocketHandler class method
*/
interface IWebSocketHandler {
	assignRole(room: Room, clientId: string, socket: any, roomId: string, preferredSide: string, playerName: string, playerSprite: string): { id: string, role: string, playerName: string, team: string, leader: boolean, spriteUrl: string, ready: boolean };
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
	assignRole(room: Room, clientId: string, socket: any, roomId: string, preferredSide: string, playerName: string, playerSprite: string): { id: string, role: string, playerName: string, team: string, leader: boolean, spriteUrl: string, ready: boolean } {
		// Add socket to room if present
		if (socket) {
			room.sockets.set(socket, clientId);
			room.clients.add(socket);
		}

		//---- check if the client already has a playerinfo ----
		let player = room.clientRoles.get(clientId);
		//assign the info if not exist
		if (!player) {
			let roleStr: string;

			// assign player side according preferred side
			if (preferredSide === "left" && room.gameState.teams.left.length < room.teamSize) {
				roleStr = `left_player${room.gameState.teams.left.length + 1}`;
				room.gameState.teams.left.push({
					clientId,
					role: roleStr,
					playerName,
					team: "left",
					leader: clientId === room.leaderId,
					spriteUrl: playerSprite,
					ready: clientId === room.leaderId // leader is always ready
				}); // add playerName to playerInfo
			}
			else if (preferredSide === "right" && room.gameState.teams.right.length < room.teamSize) {
				roleStr = `right_player${room.gameState.teams.right.length + 1}`;
				room.gameState.teams.right.push({
					clientId,
					role: roleStr,
					playerName,
					team: "right",
					leader: clientId === room.leaderId,
					spriteUrl: 	playerSprite,
					ready: clientId === room.leaderId // leader is always ready
				}); // add playerName to playerInfo
			}
			else {
				roleStr = "spectator";
			}

			// assign the player id and role to the map
			player = {
				clientId,
				role: roleStr,
				playerName,
				team: roleStr.startsWith("left") ? "left" : "right",
				leader: clientId === room.leaderId,
				spriteUrl: playerSprite,
				ready: clientId === room.leaderId // leader is always ready
			};
			room.clientRoles.set(clientId, player);

			//initialize thier position and score (prevent garbage value)
			if (roleStr !== "spectator") {
				game.setPaddlePositionWithTeam(room);
				room.gameState.score.left = 0;
				room.gameState.score.right = 0;
			}

			if (socket) {
				//notify to the client about his
				const playerInfo = room.clientRoles.get(clientId);
				socket.send(JSON.stringify({
					type: "roleUpdate",
					gameState: room.gameState,
					newPlayer: playerInfo,
					isSpectator: roleStr === "spectator",
					leaderId: room.leaderId,
				}));

				// notify to all in the room about role
				console.log(`Player ${playerName} (${roleStr}) [ ${clientId} ] joined room ${room.name} (${roomId})`);
				console.log("player info: ", playerInfo);
				broadcast(room, createLiveChatMessage("system", "system", `${playerName} joined the game.`));
				broadcast(room, {
					type: "roleUpdate",
					newPlayer: playerInfo,
					gameState: room.gameState,
					leaderId: room.leaderId,
					disconnectPlayers: room.disconnectPlayers,
				});
			}

			// check if room is full and start game
			// const totalPlayers = room.gameState.teams.left.length + room.gameState.teams.right.length;
			// if (totalPlayers === room.teamSize * 2 && !room.gameState.gameStarted) {
			// 	roomStartGame(room);
			// 	startRoomLoop(room);
			// }
		} else {
			if (socket) {
				//reconnect during game
				if (room.disconnectPlayers.has(clientId)) {
                    //prevent reconnect after game ended
                    if (room.gameState.gameEnded) {
                        console.log(`Player ${player.playerName} (${player.role}) [ ${clientId} ] fail to reconnect to game because game end`);
                        return { id: clientId, role: player.role, playerName: player.playerName, team: player.team, leader: player.leader, spriteUrl: player.spriteUrl, ready: player.ready};
                    }

                    // Cancel any disconnect timer
                    if (room.disconnectTimers && room.disconnectTimers.has(clientId)) {
                        clearTimeout(room.disconnectTimers.get(clientId)!);
                        room.disconnectTimers.delete(clientId);
                    }

                    // mark as reconnected
					room.disconnectPlayers.delete(clientId);

					// notify to all in the room about reconnected and unpause if needed
					console.log(`Player ${player.playerName} (${player.role}) [ ${clientId} ] reconnected as ${player.role} in room ${room.name} (${roomId})`);
					broadcast(room, createLiveChatMessage("system", "system", `${player.playerName} reconnect the game.`));

					const playerInfo = room.clientRoles.get(clientId);
					//send to the client about his role
					socket.send(JSON.stringify({
						type: "roleUpdate",
						gameState: room.gameState,
						newPlayer: playerInfo,
						isSpectator: player.role === "spectator",
						leaderId: room.leaderId,
					}));

				}
			}
		}
		return { id: clientId, role: player.role, playerName: player.playerName, team: player.team, leader: player.leader, spriteUrl: player.spriteUrl, ready: player.ready};
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
		try {
			let msg;
			try {
				msg = JSON.parse(raw);
			} catch {
				socket.close(1003, "Invalid JSON");
				return;
			}

			// --- validation ---
			if (typeof msg !== "object" || msg === null) {
				socket.close(1003, "Invalid message format");
				return;
			}
			if (typeof msg.type !== "string") {
				socket.close(1003, "Invalid message: missing type");
				return;
			}

			// --- allow type ---
			const allowedTypes = ["switchSide", "ready", "start"];
			if (!allowedTypes.includes(msg.type)) {
				socket.close(1003, `unsupported message type ${msg.type}`);
				return;
			}

			// --- handle message ---
            //get certain clientId from socket
			const clientId = room.sockets.get(socket);
			if (!clientId) return;
            // get player info from clientId
			const player = room.clientRoles.get(clientId);
			if (!player) return;

			if (msg.type === "switchSide") {
				if (typeof msg.side !== "string" || msg.side === null || msg.side === undefined || (msg.side !== "left" && msg.side !== "right")) {
					socket.close(1003, "Invalid side: [side]");
					return;
				}

				if (role.role === "spectator") return;

				if (player.ready && clientId !== room.leaderId) {
					socket.send(JSON.stringify({ type: "error", text: "Cannot switch side when ready. Unready first." }));
					console.log(`Player ${player.playerName} (${role.role}) [${role.id}] fail to switch side when ready in room (${room.name}) [${room.id}]`);
					return;
				}

				const newRole = handleSwitchSide(room, socket, msg.side as "left" | "right");
				if (newRole) role.role = newRole;
				return;
			}
			if (msg.type === "ready") {
				if (typeof msg.ready !== "boolean" || msg.ready === null || msg.ready === undefined) {
					socket.close(1003, "Invalid boolean: [ready]");
					return;
				}

				// Ignore if spectator, no role, or leader
				if (role.role === "spectator" || clientId === room.leaderId) return;

				// Step 1: check player is ready
				const player = room.clientRoles.get(clientId);
				if (!player) return;
				//update the player ready status
				if (player) {
					player.ready = msg.ready;
				}
				//update the team each player ready status in gameState
				room.gameState.teams.left = room.gameState.teams.left.map((p:any) => {
					if (p.clientId === clientId) {
						return { ...p, ready: msg.ready };
					}
					return p;
				});
				room.gameState.teams.right = room.gameState.teams.right.map((p:any) => {
					if (p.clientId === clientId) {
						return { ...p, ready: msg.ready };
					}
					return p;
				});

				if (msg.ready === true) {
					broadcast(room, createLiveChatMessage("system", "system", `${player.playerName} is ready`));
					console.log(`Player ${player.playerName} (${role.role}) [${role.id}] is ready in room (${room.name}) [${room.id}]`);

					//broadcastState(room);
					const { canStart, reason } = updateCanStart(room);
					broadcast(room, {
						type: "roleUpdate",
						gameState: room.gameState,
						leaderId: room.leaderId,
						canStart: canStart,
					});

					// auto-start check for equal teams (alert message only)
					if (!canStart && reason && msg.ready) {
						if (reason === "Teams are not equal") {
							broadcast(room, createLiveChatMessage("system", "system", `Cannot start: Teams are not equal`));
							console.log(`Cannot auto-start game in room (${room.name}) [${room.id}]: Teams are not equal`);
						}
						return;
					}

					// Step 2: auto-start (public room)
					if (canStart && !room.gameState.gameStarted && room.teamSize * 2 === (room.gameState.teams.left.length + room.gameState.teams.right.length) && room.leaderId === "") {
						//room.startRequestedBy = "auto";
						room.gameState.gameStarted = false;

						console.log(`All players ready, auto-starting game in room (${room.name}) [${room.id}], room leader is (${room.leaderId ? room.leaderId : "none"})`);

						startCountdown(room, () => {
							if (!room.gameState.gameStarted && !room.gameState.gameEnded) {
								roomStartGame(room);
								startRoomLoop(room);
							}
						});
					}
					return;
				}
				else
				{
					//if unready during countdown, cancel the countdown and broadcast the player is not ready
					// console.log(`Player ${player.playerName} (${role.role}) [${role.id}] is not ready in room (${room.name}) [${room.id}]`); ////debug
					cancelCountdown(room);
					const { canStart } = updateCanStart(room);
					broadcast(room, {
						type: "roleUpdate",
						gameState: room.gameState,
						leaderId: room.leaderId,
						canStart: canStart,
					});
					return;
				}
			}
			if (msg.type === "start") {
				if (typeof msg.start !== "boolean" || msg.start === null || msg.start === undefined) {
					socket.close(1003, "Invalid boolean: [start]");
					return;
				}

				if (msg.start === true) {
					//if not enough player, cannot start
					const totalPlayers = room.gameState.teams.left.length + room.gameState.teams.right.length;
					if (totalPlayers < room.teamSize * 2) {
						console.log(`Player ${player.playerName} (${role.role}) [${role.id}] tried to start the game but insufficient player in room (${room.name}) [${room.id}]`);
						return;
					}

					//if not all player ready, cannot start
					if(!room.canStart) {
						console.log(`Player ${player.playerName} (${role.role}) [${role.id}] tried to start the game but not all players are ready in room (${room.name}) [${room.id}]`);
						return;
					}

					//execute the start (leader only)
					console.log(`Player ${player.playerName} (${role.role}) [${role.id}] started the game in room (${room.name}) [${room.id}]`);
					const { canStart } = updateCanStart(room);
					broadcast(room, {
						type: "roleUpdate",
						gameState: room.gameState,
						leaderId: room.leaderId,
						canStart: canStart,
					});

					// Start the countdown to start the game
					startCountdown(room, () => {
						if (!room.gameState.gameStarted && !room.gameState.gameEnded) {
							roomStartGame(room);
							startRoomLoop(room);
						}
					});
					return;
				}
			}

		} catch (err) {
			console.error("unexpected error in room wsmessage handling:", err);
			socket.close(1011, "server error");
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

        // Cancel any existing timer
        if (!room.disconnectTimers) room.disconnectTimers = new Map();
        if (room.disconnectTimers.has(clientId)) {
            clearTimeout(room.disconnectTimers.get(clientId)!);
            room.disconnectTimers.delete(clientId);
        }

		// ---- Remove socket and client from room ----
		room.sockets.delete(socket);
		room.clients.delete(socket);

        // ---- mark as disconnected ----
        if (!room.disconnectPlayers.has(clientId)) {
            room.disconnectPlayers.add(clientId);
        }

		// --- handle leader leaving ---
		if (clientId === room.leaderId) {
			//check for remaining players except spectators and the leaving leader
			const remainingPlayers = room.clientRoles
				? Array.from(room.clientRoles.entries() as Iterable<[any, any]>)
					  .filter(([id, p]) => p.role !== "spectator" && id !== clientId)
					  .map(([id]) => id)
				: [];

			//if have remaining player when leader left pass leader to the player
			if (remainingPlayers.length > 0 && !room.gameState.gameStarted) {
				room.leaderId = remainingPlayers[0];
                const newLeader = room.clientRoles.get(room.leaderId);
                if (newLeader) {
                    newLeader.leader = true;
                };
				broadcast(room, createLiveChatMessage("system", "system", `leader change to ${room.clientRoles.get(room.leaderId)?.playerName}.`));
				console.log(`Leader ${room.clientRoles.get(clientId)?.playerName} [ ${clientId} ] left. New leader is ${room.clientRoles.get(room.leaderId)?.playerName} [ ${room.leaderId} ] in room ${room.name} (${roomId})`);

				//notify all in the room about new leader
				broadcast(room, {
					type: "roleUpdate",
					newPlayer: newLeader,
					gameState: room.gameState,
					leaderId: room.leaderId,
				});
			} else {
				room.leaderId = "";
			}
		}

        const GRACE_PERIOD = 10 * 1000; //? timeout for reconnect

        // ---- case: disconnect during game ----
        if (role && role !== "spectator" && room.gameState.gameStarted) {
            handlePlayerDisconnect(room, clientId, GRACE_PERIOD, true);
            return;
        }

		// ---- case: spectator leave ----
		if (role === "spectator") {
			console.log(`Spectator [ ${clientId} ] left the room ${room.name} (${roomId}).`);
			broadcast(room, createLiveChatMessage("system", "system", `Spectator left.`));
			room.clientRoles.delete(clientId);
			return;
		}

		// ---- case: disconnect during countdown ----
		if (!room.gameState.gameStarted && !room.gameState.gameEnded) {
			cancelCountdown(room);
		}

		// ---- case: leave before game start / game ended ----
		if (!room.gameState.gameStarted || room.gameState.gameEnded) {
			console.log(`Player ${player.playerName} (${role}) [ ${clientId} ] left the room ${room.name} (${roomId}).`);
			broadcast(room, createLiveChatMessage("system", "system", `${player.playerName} left.`));

			//remove player from team
			if (role && role !== "spectator") {
				room.gameState.teams.left = room.gameState.teams.left.filter((p: any) => p.role !== role);
				room.gameState.teams.right = room.gameState.teams.right.filter((p: any) => p.role !== role);
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
			const playerInfo = room.clientRoles.get(clientId);
			broadcast(room, {
				type: "roleUpdate",
				newPlayer: playerInfo,
				gameState: room.gameState,
				leaderId: room.leaderId,
				disconnectPlayers: room.disconnectPlayers,
			});
			return;
		}
	}
}
