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

const wsHandler = new WebSocketHandler();

export default async function roomWsRoutes(fastify: FastifyInstance) {
  fastify.get("/ws-room", { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
    const context = validateConnection(socket, req);
    // console.log("Websocket connection context: ", context); //// debug
    if (!context) return; // Invalid connection, already closed in validateConnection
	const { clientId, roomId, room, side, playerName, playerSprite } = context;

	//wait client to send initial data within timeout
	let player = null as playerInfo | null;
	let expectingPong = false;
	let pongTimer: NodeJS.Timeout | null = null;
	const HANDSHAKE_MS = 500; //? 2 seconds
	const handshakeTimeout = setTimeout(() => {
		if (!player) {
			console.log("Handshake timeout for client:", clientId);
			socket.close(1003, "Handshake timeout: did not receive initial data");
		}

	}, HANDSHAKE_MS);

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

		if (!player) {
			if (msg && msg.type === "confirmJoin") {
				const incomingId = (typeof msg.clientId === "number") ? msg.clientId : null;
				if (incomingId !== clientId) {
					console.warn(`Client ${clientId} sent mismatched clientId ${incomingId} in handshake.`);
					socket.close(1003, "Mismatched clientId in handshake");
					return;
				}

				expectingPong = true;
				socket.send(JSON.stringify({ type: "handshakePing" }));

				const PONG_TIMEOUT_MS = 500; //? 0.5 seconds for tight handshake
				pongTimer = setTimeout(() => {
					if (expectingPong) {
						console.log("Handshake pong timeout for client:", clientId);
						socket.close(1003, "Handshake pong timeout");
					}
				}, PONG_TIMEOUT_MS);

				return;
			}

			if (expectingPong && msg && msg.type === "handshakePong") {
				const pongId = (typeof msg.clientId === "number") ? msg.clientId : null;
				if (pongId !== clientId) {
					console.warn(`Client ${clientId} sent mismatched clientId ${pongId} in handshake pong.`);
					socket.close(1003, "Mismatched clientId in handshake pong");
					return;
				}

				expectingPong = false;
				if (pongTimer) {
					clearTimeout(pongTimer);
					pongTimer = null;
				}
				clearTimeout(handshakeTimeout);

				player = wsHandler.assignRole(
				  room,
				  clientId,
				  socket,
				  roomId,
				  side as string,
				  playerName,
				  playerSprite,
				);
				// console.log("Websocket assign role response: ", player); //// debug
				return;
			}
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
              `Player ${player.playerName} (${player.role}) [${player.clientId}] fail to switch side when ready in room (${room.name}) [${room.id}]`,
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
              `Player ${player.playerName} (${player.role}) [${player.clientId}] started the game in room (${room.name}) [${room.id}]`,
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
            `${room.name} [${room.id}] changed to ${room.private ? "private" : "public"} by leader ${player.playerName} [${player.clientId}]`,
          );
          broadcast(room, {
            type: "roomPrivacyUpdate",
            data: {
              type: room.private ? "private" : "public"
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
      if (room.game.state === 3) return;
      wsHandler.handleDisconnect(socket, room, clientId, room.id);
    });
  });
}
