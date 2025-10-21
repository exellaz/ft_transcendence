import { WebSocketHandler } from "../../utils/webSocketHandler";
// import { Game } from "./game"
import { validateConnection } from "../../utils/utils";
// import { PongGame } from "@shared/game/pong";
const wsHandler = new WebSocketHandler();

import { PongGame } from "@shared/game/pong.ts";
import { Player } from "@shared/game/Player.ts";
import { handlePlayerDisconnect } from "src/utils/utils.ts";

function closeSocket(socket: any, statusCode: number, errorMsg: any) {
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
export default async function gameWsRoute(fastify: any) {
  fastify.get("/ws-game", { websocket: true }, (socket: any, req: any) => {
    const context = validateConnection(socket, req);
    if (!context) return; // Invalid connection, already closed in validateConnection

    // Step 1: Assign role to client (player, spectator, etc.)
    const { clientId, roomId, room, side, playerName, playerSprite } = context;

    console.log("player sprite: ", playerSprite);
    console.log("player name: ", playerName);

    console.log("room setting", room.setting.ballSpeed);

    socket.on("error", (err) => {
      console.error("ws backend error: ", err);
    });

    socket.on("message", (raw: any) => {
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

        console.log(">>>> sprite :", playerSprite);

        // console.log(`recieved ${msg.type} : ${JSON.stringify(msg, null, 2)}` )

        if (msg.type === "ready") {
          console.log("player connected ", clientId);
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
          room.sockets.set(clientId, socket);

          console.log("concluding handshake");
          socket.send(
            JSON.stringify({
              type: "ready",
              payload: {},
            }),
          );

          // ✅ New addition: broadcast updated world to all
          const fullWorld = compile(room.game, true, room.setting);
          for (const s of room.sockets.values()) {
            try {
              s.send(fullWorld);
            } catch (e) {
              // console.error("Failed to send full world:", e);
            }
          }
        } else if (msg.type === "fetch_world") {
          console.log("requested for full world");

          const output = compile(room.game, true, room.setting);
          console.log(`compiled ${output.length} bytes`);
          socket.send(output);
        } else if (msg.type === "input") {
          console.log("received move input", msg.payload);
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
