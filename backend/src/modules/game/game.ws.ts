import { validateConnection } from "../../utils/utils";
import { PongGame } from "@shared/game/pong.ts";
import { Player } from "@shared/game/Player.ts";
import { handlePlayerDisconnect } from "src/utils/utils.ts";
import { FastifyInstance, FastifyRequest } from "fastify";
import WebSocket from "ws";

function closeSocket(socket: WebSocket, statusCode: number, errorMsg: string) {
  socket.close(1003, errorMsg);
  console.log(`🅰️ ${errorMsg}`);
  return null;
}

// todo error sometimes certain players dont show up

function compile(
  pongGame: PongGame,
  includeStaticObjects: boolean,
  settings = {},
) {
  const state = pongGame.exportState(includeStaticObjects);

  const output = {
    type: "state",
    state,
    metadata: {
      timestamp: Date.now(),
      delta: pongGame.delta,
      fps: pongGame.fps,
    },
    settings,
  };

  return JSON.stringify(output);
}

/**
 * @note websocket error code: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
 */
export default async function gameWsRoute(fastify: FastifyInstance) {
  fastify.get(
    "/ws-game",
    { websocket: true },
    async (socket: WebSocket, req: FastifyRequest) => {
      const context = await validateConnection(socket, req, fastify);
      if (!context) {
        console.log("[game.ws] invalid connection, closing socket");
        return; // Invalid connection, already closed in validateConnection
      }

      // Step 1: Assign role to client (player, spectator, etc.)
      const { clientId, room, side, playerName, playerSprite } = context;
      console.log(
        `[game websocket] New connection: clientId=${clientId}, side=${side}, playerName=${playerName}, playerSprite=${playerSprite}`,
      ); ////debug

      //? implement socket for tournament use
      room.sockets.set(socket, clientId);
      room.clients.add(socket);

      //const heartbeat = createAppHeartbeat(socket, { heartbeatMs: 1000, receiveTimeoutMs: 5000, maxMissed: 3 });
      //heartbeat.start();

      // console.log("player sprite: ", playerSprite); ////debug
      // console.log("player name: ", playerName); ////debug

      // console.log("room setting", room.setting.ballSpeed); ////debug

      let expectingHandshake = true;
      let handshakeTimer: NodeJS.Timeout | null = null;
      const HANDSHAKE_MS = 2000;

      // ✅ Check BOTH dummy AND disconnected offline opponents
      const opponentTeam = side === "left" ? "right" : "left";
      const opponentPlayers = room.gameState.teams[opponentTeam];

      // ✅ Check if opponent is offline (either dummy or disconnected)
      const hasOfflineOpponent =
        opponentPlayers?.some((p) => !p.online) || false;
      const offlinePlayer = opponentPlayers?.find((p) => !p.online);

      socket.on("error", (err) => {
        console.error("ws backend error: ", err);
      });

      socket.on("message", (raw: WebSocket.Data) => {
        //console.log("Game WebSocket received:", raw.toString()); //// debug

        try {
          let msg;
          try {
            msg = JSON.parse(raw.toString());
          } catch {
            return closeSocket(socket, 1003, "Invalid JSON");
          }

          if (msg.type === "handshakePong") {
            //console.log(
            //  "[game] ✅ Handshake pong received from clientId=",
            //  clientId,
            //); ////debug
            expectingHandshake = false;
            if (handshakeTimer) {
              clearTimeout(handshakeTimer);
              handshakeTimer = null;
            }
            return;
          }

          if (expectingHandshake) {
            //console.log(`[game] ⚠️ Drop ${msg.type} from clientId=${clientId}`);
            return;
          }

          //if (msg.type === "returnHeartbeat") {
          //  heartbeat.onAck();
          //  return;
          //}

          // --- validation ---
          if (typeof msg !== "object" || msg === null)
            return closeSocket(socket, 1003, "Invalid message format");

          if (typeof msg.type !== "string")
            return closeSocket(socket, 1003, "Invalid message: missing type");

          //console.log(">>>> sprite :", playerSprite); ////debug

          // console.log(`recieved ${msg.type} : ${JSON.stringify(msg, null, 2)}` )

          const SKIN_MAPPING: Record<string, number> = {
            "/assets/yellow-ghost.png": 0,
            "/assets/green-ghost.png": 1,
            "/assets/blue-ghost.png": 2,
            "/assets/red-ghost.png": 3,
            "/assets/purple-ghost.png": 4,
            "/assets/starry-ghost.png": 5,
            "/assets/white-ghost.png": 6,
            "/assets/42-ghost.png": 7,
          };

          if (msg.type === "ready") {
            //console.log("player added =>", clientId, msg); ////debug

            // Verify socket is still open
            if (socket.readyState !== WebSocket.OPEN) {
              console.error(
                `Socket for clientId=${clientId} is not open, state=${socket.readyState}`,
              );
              return;
            }

            room.game.addPlayer(
              new Player({
                id: clientId,
                name: playerName,
                skin: SKIN_MAPPING[playerSprite] ?? 0,
                team: side === "left" ? 0 : 1,
                socket: socket,
              }),
            );

            //ensure the socket is up to date
            room.sockets.set(socket, clientId);

            //console.log("concluding handshake =>", clientId); ////debug
            socket.send(
              JSON.stringify({
                type: "ready_ack",
                payload: { clientId },
              }),
            );

            // ✅ If opponent is offline (dummy OR disconnected), add them to game and force win
            if (hasOfflineOpponent && offlinePlayer) {
              const dummyTeam = side === "left" ? 1 : 0;

              // Add dummy player to game (will be AI-controlled)
              room.game.addPlayer(
                new Player({
                  id: offlinePlayer.clientId,
                  name: offlinePlayer.playerName,
                  skin: SKIN_MAPPING[offlinePlayer.spriteUrl] ?? 0,
                  team: dummyTeam,
                  socket: null, // ✅ No socket for dummy
                }),
              );

              console.log(
                `[game] Added dummy player ${offlinePlayer.clientId} to game`,
              );
              // ✅ Broadcast updated world first
              const fullWorld = compile(room.game, true, room.setting);
              for (const s of room.sockets.keys()) {
                try {
                  s.send(fullWorld);
                } catch (err) {
                  console.error("Failed to send full world:", err);
                }
              }
              // ✅ Wait a bit then immediately force win for real player
              setTimeout(() => {
                const winner = side === "left" ? "left" : "right";
                console.log(
                  `[game] Dummy opponent detected. Real player ${clientId} (${side}) wins by forfeit.`,
                );
                // Use existing forceEnd method from pong.ts
                room.game.forceEnd(winner);
              }, 2000); // Give 2 seconds for client to load game scene
            }
            // ✅ New addition: broadcast updated world to all
            const fullWorld = compile(room.game, true, room.setting);
            for (const s of room.sockets.keys()) {
              try {
                s.send(fullWorld);
              } catch (err) {
                console.error("Failed to send full world:", err);
              }
            }
          } else if (msg.type === "fetch_world") {
            //console.log("requested for full world =>", clientId); ////debug

            const output = compile(room.game, true, room.setting);
            //   console.log(`compiled ${output.length} bytes`); ////debug
            socket.send(output);
          } else if (msg.type === "input") {
            //  console.log("received move input", msg.payload); ////debug
            room.game.movePaddle(msg["payload"]["key"], clientId);
          }
        } catch (err) {
          console.error("unexpected error in game ws message handling:", err);
          closeSocket(socket, 1011, "server error");
        }
        // console.log("Game WebSocket sent:", raw.toString()); //// debug
      });

      // Step 3: handle client disconnect
      socket.on("close", (code, reason) => {
        console.log(
          `[game websocket] Connection closed: clientId=${clientId}, code=${code}, reason=${reason}`,
        ); ////debug
        //0 loading, 1 countdown, 2 started, 3 ended
        // console.log("pong game state: ", room.game.state); ////debug

        //clean heartbeat
        //  heartbeat.stop();

        //if game still loading or game ended, ignore
        if (room.game.state === 0 || room.game.state === 3) return;

        if (!room) {
          console.log("no room found");
          return;
        }

        // get who disconnected in game
        let side: "left" | "right" | "unknown" = "unknown";
        if (room.game.teamLeft.padels.some((p) => p.player.id === clientId))
          side = "left";
        else if (
          room.game.teamRight.padels.some((p) => p.player.id === clientId)
        )
          side = "right";
        console.log(
          `❌ Player ${playerName} (${side}) disconnected. countdown 3 sec to end game`,
        );

        // handle player disconnect
        const GRACE_PERIOD = 3000;
        handlePlayerDisconnect(room, clientId, GRACE_PERIOD);
      });

      //send handshake ping with sequence after all handlers are set up
      setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          console.error(
            `[game] ❌ Socket not open for clientId=${clientId}, state=${socket.readyState}`,
          );
          return;
        }

        //console.log(`[game] 📤 Sending handshake ping to clientId=${clientId}`);
        try {
          socket.send(JSON.stringify({ type: "handshakePing" }));
          //  console.log(`[game] ✅ Handshake ping sent to clientId=${clientId}`);
        } catch (err) {
          console.error(
            `[game] ❌Failed to send handshake ping to clientId=${clientId}:`,
            err,
          );
          socket.close(1011, "handshake failed");
          return;
        }

        // Set timeout for handshake
        handshakeTimer = setTimeout(() => {
          if (expectingHandshake) {
            console.log(
              `[game] ⏱️ Handshake pong not received in time from clientId=${clientId}`,
            );
            socket.close(1002, "handshake timeout");
          }
        }, HANDSHAKE_MS);
      }, 100);
    },
  );
}

//export function createAppHeartbeat(
//  socket: WebSocket,
//  opts?: {
//    heartbeatMs?: number;
//    receiveTimeoutMs?: number;
//    maxMissed?: number;
//    closeCode?: number;
//    closeReason?: string;
//  },
//) {
//  const heartbeatMs = opts?.heartbeatMs ?? 1000;
//  const receiveTimeoutMs = opts?.receiveTimeoutMs ?? 10000;
//  const maxMissed = opts?.maxMissed ?? 3;
//  const closeCode = opts?.closeCode ?? 1003;
//  const closeReason = opts?.closeReason ?? "Heartbeat timeout";

//  let isAlive = true;
//  let missed = 0;
//  let interval: NodeJS.Timeout | null = null;
//  let receiveTimeout: NodeJS.Timeout | null = null;

//  function cleanupTimers() {
//    if (interval) {
//      clearInterval(interval);
//      interval = null;
//    }
//    if (receiveTimeout) {
//      clearTimeout(receiveTimeout);
//      receiveTimeout = null;
//    }
//  }

//  function start() {
//    cleanupTimers();
//    isAlive = true;
//    missed = 0;
//    interval = setInterval(() => {
//      if (!isAlive) {
//        missed++;
//        if (missed >= maxMissed) {
//          cleanupTimers();
//          try {
//            socket.close(closeCode, closeReason);
//          } catch {}
//          return;
//        }
//      }
//      isAlive = false;
//      try {
//        console.log("sending heartbeat"); ////debug
//        socket.send(JSON.stringify({ type: "heartbeat" }));
//      } catch (err) {
//        console.error("failed to send heartbeat:", err);
//        cleanupTimers();
//        try {
//          socket.close(1011, "server error");
//        } catch {}
//        return;
//      }
//      if (receiveTimeout) clearTimeout(receiveTimeout);
//      receiveTimeout = setTimeout(() => {
//        // no ack within window -> treat as missed
//        if (!isAlive) {
//          missed++;
//          if (missed >= maxMissed) {
//            cleanupTimers();
//            try {
//              socket.close(closeCode, closeReason);
//            } catch {}
//          }
//        }
//      }, receiveTimeoutMs);
//    }, heartbeatMs);
//  }

//  function onAck() {
//    console.log("heartbeat ack received"); ////debug
//    isAlive = true;
//    missed = 0;
//    if (receiveTimeout) {
//      clearTimeout(receiveTimeout);
//      receiveTimeout = null;
//    }
//  }

//  function stop() {
//    cleanupTimers();
//  }

//  return { start, stop, onAck };
//}
