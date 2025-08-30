// server.ts
import Fastify from "fastify";
import websocketPlugin, { WebSocket } from "@fastify/websocket";
import { URL } from "url";
import crypto from "crypto";
import * as Game from "./game.ts";

// ---- SETUP SERVER ----
const fastify = Fastify();                  // Create Fastify instance
await fastify.register(websocketPlugin);    // Register WebSocket plugin

// ---- WEBSOCKET ROUTE ----
await fastify.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, (socket, req) => {            //handle receive a socket(for comunication) and req(request info)
    // ----- CLIENT CONNECTION -----
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const clientId = url.searchParams.get("id") || crypto.randomUUID(); //get Client ID from client, if not then generate one
    Game.sockets.set(socket, clientId);
    Game.clients.add(socket);                             // Add socket to active clients (track connected clients)

    // Assign role to client (left_player, right_player, or spectator)
    let role = Game.clientRoles.get(clientId);
    if (!role) {
      // Assigns left/right player or spectator based on team sizes
      const leftCount = Game.gameState.teams.left.length;
      const rightCount = Game.gameState.teams.right.length;
      if (leftCount < Game.TEAM_SIZE) {
        role = `left_player${leftCount + 1}`;
        Game.gameState.teams.left.push(role);
      } else if (rightCount < Game.TEAM_SIZE) {
        role = `right_player${rightCount + 1}`;
        Game.gameState.teams.right.push(role);
      } else role = "spectator";

      // Updates game state and paddle positions
      Game.clientRoles.set(clientId, role);
      if (role !== "spectator") {
        Game.set_paddle_position_with_team();
        Game.gameState.score.left = 0;
        Game.gameState.score.right = 0;
      }
    } else {
      if (role.startsWith("left_player") && !Game.gameState.teams.left.includes(role))
        Game.gameState.teams.left.push(role);
      else if (role.startsWith("right_player") && !Game.gameState.teams.right.includes(role))
        Game.gameState.teams.right.push(role);
    }

    console.log(`Client (${role}) connected with id=${clientId}`);
    socket.send(JSON.stringify({ type: "role", role }));

    // ----- INCOMING MESSAGE/EVENT HANDLING -----
    socket.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "move") {    // update paddle position
        const dy = msg.dy;
        const paddleHeight = 80;
        if (role.startsWith("left_player") || role.startsWith("right_player")) {
          Game.gameState.paddles[role] = Game.updatePaddlePosition(
            Game.gameState.paddles[role] ?? 0,
            dy,
            Game.gameHeight,
            paddleHeight
          );
        }
      } else if (msg.type === "setWidth") {     // set game width
        Game.setGameDimensions(msg.width, Game.gameHeight);
      } else if (msg.type === "setHeight") {    // set game height
        Game.setGameDimensions(Game.gameWidth, msg.height);
      }
    });

    // ----- CLIENT DISCONNECTION HANDLING -----
    socket.on("close", () => {
      Game.sockets.delete(socket);
      console.log(`Client (${role}) disconnected (id=${clientId})`);

        // Removes player from team if not a spectator
      if (role && role !== "spectator") {
        const leftIdx = Game.gameState.teams.left.indexOf(role);
        if (leftIdx !== -1) Game.gameState.teams.left.splice(leftIdx, 1);
        const rightIdx = Game.gameState.teams.right.indexOf(role);
        if (rightIdx !== -1) Game.gameState.teams.right.splice(rightIdx, 1);
      }
    });
  });
});

// ---- START THE GAME LOOP ----
setInterval(Game.gameLoop, 1000 / 60); //run at 60 fps

// ---- start the server to listen on port 4242 ----
fastify.listen({ port: 4242, host: "0.0.0.0" }, (err, addr) => {
  if (err) throw err;
  console.log(`Server running at ${addr}`);
});
