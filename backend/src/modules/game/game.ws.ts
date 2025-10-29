import { validateConnection } from "../../utils/utils";
import { PongGame } from "@shared/game/pong.ts";
import { Player } from "@shared/game/Player.ts";
import { handlePlayerDisconnect } from "src/utils/utils.ts";
import { FastifyInstance, FastifyRequest } from "fastify";
import WebSocket from "ws";
import { clear } from "console";

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
  fastify.get("/ws-game", { websocket: true }, async (socket: WebSocket, req: FastifyRequest) => {
    const context = await validateConnection(socket, req);
    if (!context) return; // Invalid connection, already closed in validateConnection

    // Step 1: Assign role to client (player, spectator, etc.)
    const { clientId, room, side, playerName, playerSprite } = context;
    console.log(`[game websocket] New connection: clientId=${clientId}, side=${side}, playerName=${playerName}, playerSprite=${playerSprite}`); ////debug

    ////after validate the connection and extract room info, check for duplicate connections
    //for (const [s, id] of room.sockets.entries()) {
    //  if (id === clientId && s !== socket) {
    //    try {
    //      console.log(`[game.ws] duplicate connection for clientId=${clientId}, closing old socket`);
    //      s.close(1000, "duplicate connection");
    //    } catch {}
    //    room.sockets.delete(s);
    //    room.clients.delete(s);
    //    break;
    //  }
    //}

    ////? implement socket for tournament use
    //room.sockets.set(socket, clientId);
    //room.clients.add(socket);

    //const heartbeat = createAppHeartbeat(socket, { heartbeatMs: 1000, receiveTimeoutMs: 5000, maxMissed: 3 });
    //heartbeat.start();

    // console.log("player sprite: ", playerSprite); ////debug
    // console.log("player name: ", playerName); ////debug

    // console.log("room setting", room.setting.ballSpeed); ////debug

    //let expectingHandshake = true;
    //let handshakeTimer: NodeJS.Timeout | null = null;
    //const HANDSHAKE_MS = 1500;

    //try {
    //    socket.send(JSON.stringify({ type: "handshakePing"}));
    //    handshakeTimer = setTimeout(() => {
    //        if (expectingHandshake) {
    //            console.log(`[game websocket] Handshake pong NOT received in time from clientId=${clientId}, closing socket`);
    //            try {
    //                if (handshakeTimer) clearTimeout(handshakeTimer);
    //            } catch {
    //                console.log("failed to clear handshake timer");
    //            }
    //            closeSocket(socket, 1003, "Handshake timeout");
    //        }
    //    }, HANDSHAKE_MS);
    //} catch (err) {
    //    console.error("Failed to send handshake ping:", err);
    //    try {
    //        if (handshakeTimer) clearTimeout(handshakeTimer);
    //    } catch {
    //        console.log("failed to clear handshake timer");
    //    }
    //    closeSocket(socket, 1011, "server error");
    //    return;
    //}

    socket.on("error", (err) => {
      console.error("ws backend error: ", err);
    });

    socket.on("message", (raw: WebSocket.Data) => {
      // console.log("Game WebSocket received:", raw.toString()); //// debug

      try {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return closeSocket(socket, 1003, "Invalid JSON");
        }

        //if (msg.type === "handshakePong") {
        //    console.log("[game websocket] Handshake pong received from clientId=", clientId); ////debug
        //    expectingHandshake = false;
        //    if(handshakeTimer) clearTimeout(handshakeTimer);
        //    return;
        //}

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
           console.log("player added ", clientId); ////debug
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

        //   console.log("concluding handshake"); ////debug
          socket.send(
            JSON.stringify({
              type: "ready",
              payload: {},
            }),
          );

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
        //   console.log("requested for full world"); ////debug

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
      console.log(`[game websocket] Connection closed: clientId=${clientId}, code=${code}, reason=${reason}`); ////debug
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
      else if (room.game.teamRight.padels.some((p) => p.player.id === clientId))
        side = "right";
      console.log(
        `❌ Player ${playerName} (${side}) disconnected. countdown 3 sec to end game`,
      );

      // handle player disconnect
      const GRACE_PERIOD = 3000;
      handlePlayerDisconnect(room, clientId, GRACE_PERIOD);
    });
  });
}


export function createAppHeartbeat(
  socket: WebSocket,
  opts?: {
    heartbeatMs?: number;
    receiveTimeoutMs?: number;
    maxMissed?: number;
    closeCode?: number;
    closeReason?: string;
  },
) {
  const heartbeatMs = opts?.heartbeatMs ?? 1000;
  const receiveTimeoutMs = opts?.receiveTimeoutMs ?? 10000;
  const maxMissed = opts?.maxMissed ?? 3;
  const closeCode = opts?.closeCode ?? 1003;
  const closeReason = opts?.closeReason ?? "Heartbeat timeout";

  let isAlive = true;
  let missed = 0;
  let interval: NodeJS.Timeout | null = null;
  let receiveTimeout: NodeJS.Timeout | null = null;

  function cleanupTimers() {
    if (interval) { clearInterval(interval); interval = null; }
    if (receiveTimeout) { clearTimeout(receiveTimeout); receiveTimeout = null; }
  }

  function start() {
    cleanupTimers();
    isAlive = true;
    missed = 0;
    interval = setInterval(() => {
      if (!isAlive) {
        missed++;
        if (missed >= maxMissed) {
          cleanupTimers();
          try { socket.close(closeCode, closeReason); } catch {}
          return;
        }
      }
      isAlive = false;
      try {
		console.log("sending heartbeat"); ////debug
        socket.send(JSON.stringify({ type: "heartbeat" }));
      } catch (err) {
        cleanupTimers();
        try { socket.close(1011, "server error"); } catch {}
        return;
      }
      if (receiveTimeout) clearTimeout(receiveTimeout);
      receiveTimeout = setTimeout(() => {
        // no ack within window -> treat as missed
        if (!isAlive) {
          missed++;
          if (missed >= maxMissed) {
            cleanupTimers();
            try { socket.close(closeCode, closeReason); } catch {}
          }
        }
      }, receiveTimeoutMs);
    }, heartbeatMs);
  }

  function onAck() {
	console.log("heartbeat ack received"); ////debug
    isAlive = true;
    missed = 0;
    if (receiveTimeout) { clearTimeout(receiveTimeout); receiveTimeout = null; }
  }

  function stop() {
    cleanupTimers();
  }

  return { start, stop, onAck };
}