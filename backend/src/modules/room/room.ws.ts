import { WebSocketHandler } from "../../utils/webSocketHandler"
import { validateConnection } from "../../utils/utils";
import type { playerInfo} from "../../modules/room/room";
import { startRoomLoop, roomStartGame } from "./room";
import { createLiveChatMessage, } from "../../modules/chat/liveChat";
import { broadcast, handleSwitchSide, updateCanStart, startCountdown, cancelCountdown } from "../../utils/utils";

const wsHandler = new WebSocketHandler();

export default async function roomWsRoutes(fastify: any) {
	fastify.get("/ws-room", { websocket: true }, (socket: any, req: any) => {
		const context = validateConnection(socket, req);
        // console.log("Websocket connection context: ", context); //// debug
		if (!context) return; // Invalid connection, already closed in validateConnection

		// step 1: Assign role to client (player, spectator, etc.)
		const { clientId, roomId, room, side, playerName, playerSprite } = context;
		const player = wsHandler.assignRole(room, clientId, socket, roomId, side as string, playerName, playerSprite);
		//  console.log("Websocket assign role response: ", player); //// debug

		// step 2: handle incoming messages from clients
		socket.on("message", (raw: any) => {
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
						const allowedTypes = ["switchSide", "ready", "start", "togglePrivacy"];
						if (!allowedTypes.includes(msg.type)) {
							socket.close(1003, `unsupported message type ${msg.type}`);
							return;
						}

						// --- handle message ---
						//get certain clientId from socket
						const clientId = room.sockets.get(socket);
						if (!clientId) return;

						if (msg.type === "switchSide") {
							if (typeof msg.side !== "string" || msg.side === null || msg.side === undefined || (msg.side !== "left" && msg.side !== "right")) {
								socket.close(1003, "Invalid side: [side]");
								return;
							}

							if (player.ready && clientId !== room.leaderId) {
								socket.send(JSON.stringify({ type: "error", text: "Cannot switch side when ready. Unready first." }));
								console.log(`Player ${player.playerName} (${player.role}) [${player.id}] fail to switch side when ready in room (${room.name}) [${room.id}]`);
								return;
							}


							const newRole = handleSwitchSide(room, socket, msg.side as "left" | "right");
							if (newRole) player.role = newRole;
							return;
						}
						if (msg.type === "ready") {
							if (typeof msg.ready !== "boolean" || msg.ready === null || msg.ready === undefined) {
								socket.close(1003, "Invalid boolean: [ready]");
								return;
							}

							// Ignore leader
							if (clientId === room.leaderId) return;

							// Step 1: check player is ready
							const player = room.clientRoles.get(clientId);
							if (!player) return;
							//update the player ready status
							if (player) {
								player.ready = msg.ready;
							}
							//update the team each player ready status in gameState
							room.gameState.teams.left = room.gameState.teams.left.map((p: playerInfo) => {
								if (p.clientId === clientId) {
									return { ...p, ready: msg.ready };
								}
								return p;
							});
							room.gameState.teams.right = room.gameState.teams.right.map((p: playerInfo) => {
								if (p.clientId === clientId) {
									return { ...p, ready: msg.ready };
								}
								return p;
							});

							if (msg.ready === true) {
								broadcast(room, createLiveChatMessage(-1, "system", `${player.playerName} is ready`));
								console.log(`Player ${player.playerName} (${player.role}) [${player.clientId}] is ready in room (${room.name}) [${room.id}]`);

								//broadcastState(room);
								const { canStart, reason } = updateCanStart(room);
								broadcast(room, {
									type: "roleUpdate",
									gameState: room.gameState,
									leaderId: room.leaderId,
									canStart: canStart,
								});
								return;
							}
							else
							{
								//if unready during countdown, cancel the countdown and broadcast the player is not ready
								console.log(`Player ${player.playerName} (${player.role}) [${player.clientId}] is not ready in room (${room.name}) [${room.id}]`); ////debug
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
								// //if not enough player, cannot start
								// const totalPlayers = room.gameState.teams.left.length + room.gameState.teams.right.length;
								// if (totalPlayers < room.teamSize * 2) {
								// 	console.log(`Player ${player.playerName} (${player.role}) [${player.id}] tried to start the game but insufficient player in room (${room.name}) [${room.id}]`);
								// 	return;
								// }

								// //if not all player ready, cannot start
								// if(!room.canStart) {
								// 	console.log(`Player ${player.playerName} (${player.role}) [${player.id}] tried to start the game but not all players are ready in room (${room.name}) [${room.id}]`);
								// 	return;
								// }

								//execute the start (leader only)
								console.log(`Player ${player.playerName} (${player.role}) [${player.id}] started the game in room (${room.name}) [${room.id}]`);
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
						if (msg.type === "togglePrivacy") {
						    // only leader can toggle
						    if (clientId !== room.leaderId) return;

						    // validate boolean
						    if (typeof msg.private !== "boolean") {
						        socket.close(1003, "Invalid boolean: [private]");
						        return;
						    }

						    // update room type
						    room.private = msg.private;

						    // broadcast to all players in room
							console.log(`${room.name} [${room.id}] changed to ${room.private ? "private" : "public"} by leader ${player.playerName} [${player.id}]`);
						    broadcast(room, {
						        type: "roomPrivacyUpdate",
						        data: {
						            type: room.private ? "private" : "public",
						        },
						    });
						}
					} catch (err) {
						console.error("unexpected error in room wsmessage handling:", err);
						socket.close(1011, "server error");
					}
		});

		// Step 3: handle client disconnect
		socket.on("close", () => {
			wsHandler.handleDisconnect(socket, room, clientId, room.id);
		});
	});
}
