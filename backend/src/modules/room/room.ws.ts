import { WebSocketHandler } from "../../utils/webSocketHandler";
import { validateConnection } from "../../utils/utils";
import type { playerInfo } from "../../types/interface";
import { startRoomLoop, roomStartGame } from "./room";
import { createLiveChatMessage } from "../../modules/chat/liveChat";
import {
  broadcast,
  handleSwitchSide,
  updateCanStart,
  startCountdown,
  cancelCountdown,
} from "../../utils/utils";
import { FastifyInstance, FastifyRequest } from "fastify";
import WebSocket from "ws";
import { tournaments } from "../../modules/tournament/tournament.routes";

const wsHandler = new WebSocketHandler();

export default async function roomWsRoutes(fastify: FastifyInstance) {
  fastify.get("/ws-room", { websocket: true }, async (socket: WebSocket, req: FastifyRequest) => {
    const context = await validateConnection(socket, req);
    if (!context) return; // Invalid connection, already closed in validateConnection
	const { clientId, roomId, room, side, playerName, playerSprite } = context;

	//wait client to be reachable before assigning role
	type PlayerRole = {
		id: number;
		role: string;
		playerName: string;
		team: string;
		leader: boolean;
		spriteUrl: string;
		ready: boolean;
	};
	let player: PlayerRole | null = null;
	let expectingPong = true;
	let pongTimer: NodeJS.Timeout | null = null;
	let heartbeatInterval: NodeJS.Timeout | null = null;
	let heartbeatTimeout: NodeJS.Timeout | null = null;
    let isAlive = true;
    let missedHeartbeats = 0;
    let isConnectionClosed = false;
    const MAX_MISSED_HEARTBEATS = 3;
	const HANDSHAKE_MS = 1500; //? 1.5 seconds

    function cleanupTimer() {
        isConnectionClosed = true;

        try {
            if (pongTimer) clearTimeout(pongTimer);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
        } catch (err) {
            console.error("Error during cleanup timers:", err);
        }
    }

	// start server-initiate hanshake ping immediately
	try {
		socket.send(JSON.stringify({ type: "handshakePing", PlayerInfo: room.gameState, PlayerId: clientId }));
		pongTimer = setTimeout(() => {
			if (expectingPong) {
				console.log("Handshake timeout for client:", clientId);
				cleanupTimer();
                socket.close(1003, "Handshake timeout: did not receive initial data");
			}
		}, HANDSHAKE_MS);
	} catch (err) {
		console.error("Error sending handshake ping:", err);
        cleanupTimer();
		socket.close(1011, "server error");
	}

    // step 2: handle incoming messages from clients
    socket.on("message", (raw: WebSocket.Data) => {
      try {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          socket.close(1003, "Invalid JSON");
          return;
        }

		// First: handle initial hanshake pong (server -> client handshake)
		if (msg.type === "handshakePong") {
            console.log("Received handshake pong from client:", clientId);
			expectingPong = false;
			if (pongTimer) clearTimeout(pongTimer);

			//now safe assign player role
			player = wsHandler.assignRole(
				room,
				clientId,
				socket,
				roomId,
				side as string,
				playerName,
				playerSprite,
			);

			// start a periodic server heartbeat to check client connectivity
			const HEARTBEAT_MS = 1000;
			const RECEIVED_HEARTBEAT_MS = 2000;
			heartbeatInterval = setInterval(() => {
                if (!isAlive) {
                    missedHeartbeats++;
                    console.log(`Room WebSocket: Player ${clientId} missed heartbeat ${missedHeartbeats}/${MAX_MISSED_HEARTBEATS}`);
                }
                if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
                    console.log(`Room WebSocket: Player ${clientId} exceeded missed heartbeats. Terminating connection.`);
                    cleanupTimer();
                    socket.close(1003, "Heartbeat timeout: no response from client");
                    return;
                }
                isAlive = false;
				try {
					//console.log(`[room.ws] send heartbeat -> client: ${clientId}, time=${new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Kuala_Lumpur" })}`); ////debug
					socket.send(JSON.stringify({ type: "heartbeat" }));
					if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
					heartbeatTimeout = setTimeout(() => {
						//console.log(`[room.ws] heartbeat ack timeout -> client: ${clientId}, time=${new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Kuala_Lumpur" })}`); ////debug
						cleanupTimer();
                        socket.close(1003, "Heartbeat timeout: no ack from client");
					}, RECEIVED_HEARTBEAT_MS); // wait for client heartbeat
				} catch (err) {
					console.error("Error sending heartbeat:", err);
					cleanupTimer();
                    socket.close(1011, "server error");
				}
			}, HEARTBEAT_MS); // send heartbeat to client
			return;
		}

		if (!player && expectingPong) return; // still waiting for handshake pong

		//  also treat heartbeat ack
		if (player && msg && msg.type === "returnHeartbeat") {
            isAlive = true;
            missedHeartbeats = 0;
			//console.log(`[room.ws] received heartbeat <- client: ${clientId}, time=${new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Kuala_Lumpur" })}`); ////debug
			if (heartbeatTimeout) {
                clearTimeout(heartbeatTimeout);
                heartbeatTimeout = null;
            }
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
        const allowedTypes = [
          "switchSide",
          "ready",
          "start",
          "togglePrivacy",
          "setSprite",
          "closeTournament",
        ];
        if (!allowedTypes.includes(msg.type)) {
          socket.close(1003, `unsupported message type ${msg.type}`);
          return;
        }

        // --- handle message ---
        //get certain clientId from socket
        const socketClientId = room.sockets.get(socket);
        if (!socketClientId) return;

        if (msg.type === "switchSide") {
          if (
            typeof msg.side !== "string" ||
            msg.side === null ||
            msg.side === undefined ||
            (msg.side !== "left" && msg.side !== "right")
          ) {
            socket.close(1003, "Invalid side: [side]");
            return;
          }

		  if (!player) return;
          if (player.ready && socketClientId !== room.leaderId) {
            socket.send(
              JSON.stringify({
                type: "error",
                text: "Cannot switch side when ready. Unready first.",
              }),
            );
            console.log(
              `Player ${player.playerName} (${player.role}) [${player.id}] fail to switch side when ready in room (${room.name}) [${room.id}]`,
            );
            return;
          }

          const newRole = handleSwitchSide(
            room,
            socket,
            msg.side as "left" | "right",
          );
          if (newRole) player.role = newRole;
          return;
        }

        if (msg.type === "ready") {
          if (
            typeof msg.ready !== "boolean" ||
            msg.ready === null ||
            msg.ready === undefined
          ) {
            console.log("Invalid ready value:", msg.ready); ////debug
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
          room.gameState.teams.left = room.gameState.teams.left.map(
            (p: playerInfo) => {
              if (p.clientId === clientId) {
                return { ...p, ready: msg.ready };
              }
              return p;
            },
          );
          room.gameState.teams.right = room.gameState.teams.right.map(
            (p: playerInfo) => {
              if (p.clientId === clientId) {
                return { ...p, ready: msg.ready };
              }
              return p;
            },
          );

          if (msg.ready === true) {
            broadcast(
              room,
              createLiveChatMessage(
                -1,
                "system",
                `${player.playerName} is ready`,
              ),
            );
            console.log(
              `Player ${player.playerName} (${player.role}) [${player.clientId}] is ready in room (${room.name}) [${room.id}]`,
            );

            //broadcastState(room);
            const { canStart } = updateCanStart(room);
            broadcast(room, {
              type: "roleUpdate",
              gameState: room.gameState,
              leaderId: room.leaderId,
              canStart: canStart,
            });

            //this for match game room
            if (msg.matchGameStart === true && (room.gameState.teams.left.every((p) => p.ready) && room.gameState.teams.right.every((p) => p.ready))) {
              if (!player) return;
              if (room.game.state === 2 || room.game.state === 3) return;
              console.log(
                `match room [${room.id}] starting the game immediately`,
              );
              startRoomLoop(room);
            }

            return;
          } else {
            //if unready during countdown, cancel the countdown and broadcast the player is not ready
            console.log(
              `Player ${player.playerName} (${player.role}) [${player.clientId}] is not ready in room (${room.name}) [${room.id}]`,
            ); ////debug
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
          if (
            typeof msg.start !== "boolean" ||
            msg.start === null ||
            msg.start === undefined
          ) {
            socket.close(1003, "Invalid boolean: [start]");
            return;
          }

          if (msg.start === true) {
			if (!player) return;
            //execute the start (leader only)
            console.log(
              `Player ${player.playerName} (${player.role}) [${player.id}] started the game in room (${room.name}) [${room.id}]`,
            );
            const { canStart } = updateCanStart(room);
            broadcast(room, {
              type: "roleUpdate",
              gameState: room.gameState,
              leaderId: room.leaderId,
              canStart: canStart,
            });

            // Start the countdown to start the game
            startCountdown(room, () => {
                if (room.game.state === 2 || room.game.state === 3) return;
                roomStartGame(room);
                startRoomLoop(room);
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
		  if (!player) return;
          console.log(
            `${room.name} [${room.id}] changed to ${room.private ? "private" : "public"} by leader ${player.playerName} [${player.id}]`,
          );
          broadcast(room, {
            type: "roomPrivacyUpdate",
            data: {
              type: room.private ? "private" : "public"
            },
          });
        }

        if (msg.type === "closeTournament") {
            const tournament = tournaments.get(msg.tournamentId);
            if (!tournament) {
                console.log("Tournament not found:", msg.tournamentId);
                return;
            }
            console.log ("[room] tournament closed by room ws:", msg.tournamentId);
            tournament.lock = false;
        }

        // handle sprite change from client
        if (msg.type === "setSprite") {
          if (typeof msg.sprite !== "string" || msg.sprite.length === 0) {
            socket.close(1003, "Invalid sprite");
            return;
          }

          // update server-side player object
          const playerRecord = room.clientRoles.get(clientId);
          if (playerRecord) {
            // keep consistent field name used elsewhere (spriteUrl)
            playerRecord.spriteUrl = msg.sprite;
          }

          // update any entries in room.gameState so roleUpdate contains new sprite
          room.gameState.teams.left = room.gameState.teams.left.map(
            (p: playerInfo) =>
              p.clientId === clientId ? { ...p, spriteUrl: msg.sprite } : p,
          );
          room.gameState.teams.right = room.gameState.teams.right.map(
            (p: playerInfo) =>
              p.clientId === clientId ? { ...p, spriteUrl: msg.sprite } : p,
          );

          const { canStart } = updateCanStart(room);
          broadcast(room, {
            type: "roleUpdate",
            gameState: room.gameState,
            leaderId: room.leaderId,
            canStart,
          });

          return;
        }
      } catch (err) {
        console.error("unexpected error in room wsmessage handling:", err);
        cleanupTimer();
        socket.close(1011, "server error");
      }
    });

    // Step 3: handle client disconnect
    socket.on("close", () => {
	  //cleanup heartbeat timers
	  cleanupTimer();


	  if (room.game.state === 3) return;
      console.log("room game state: ", socket.readyState); ////debug
      wsHandler.handleDisconnect(socket, room, clientId, room.id);
    });
  });
}
