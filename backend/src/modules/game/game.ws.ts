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

  const output = JSON.stringify({
    type: "state",
    state,
    metadata: {
      timestamp: Date.now(),
      delta: pongGame.delta,
      fps: pongGame.fps,
    },
    settings,
  });

  return output;
}

/**
 * @note websocket error code: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
 */
export default async function gameWsRoute(fastify: FastifyInstance) {
  fastify.get("/ws-game", { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
    const context = validateConnection(socket, req);
    if (!context) return; // Invalid connection, already closed in validateConnection

    // Step 1: Assign role to client (player, spectator, etc.)
    const { clientId, room, side, playerName, playerSprite } = context;

    //? implement socket for tournament use
    room.sockets.set(socket, clientId);
    room.clients.add(socket);

    //add heartbeat
    let heartbeatInterval: NodeJS.Timeout;
    let isAlive = true;

    function startHeartbeat() {
      heartbeatInterval = setInterval(() => {
        if (!isAlive) {
          console.log(`Player ${playerName} [${clientId}] heartbeat failed - terminating connection`);
          socket.terminate();
          return;
        }

        isAlive = false;
        socket.ping();
      }, 30000); // Send ping every 30 seconds
    }

    socket.on("pong", () => {
        isAlive = true;
    });

    // console.log("player sprite: ", playerSprite); ////debug
    // console.log("player name: ", playerName); ////debug

    // console.log("room setting", room.setting.ballSpeed); ////debug

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

        // --- validation ---
        if (typeof msg !== "object" || msg === null)
          return closeSocket(socket, 1003, "Invalid message format");

        if (typeof msg.type !== "string")
          return closeSocket(socket, 1003, "Invalid message: missing type");

        //console.log(">>>> sprite :", playerSprite); ////debug

        // console.log(`recieved ${msg.type} : ${JSON.stringify(msg, null, 2)}` )

        if (msg.type === "ready") {
        //   console.log("player added ", clientId); ////debug
          room.game.addPlayer(
            new Player({
              id: clientId,
              name: playerName,
              skin: 0,
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
    socket.on("close", () => {
      //0 loading, 1 countdown, 2 started, 3 ended
      // console.log("pong game state: ", room.game.state); ////debug

      //clean heartbeat
      if (heartbeatInterval) clearInterval(heartbeatInterval);

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

    startHeartbeat();
  });
}
