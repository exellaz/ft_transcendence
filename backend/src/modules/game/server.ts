// // server.ts
// import Fastify from "fastify";

// import { FastifyInstance } from "fastify";

// import websocketPlugin from "@fastify/websocket";
// import fastifyStatic from "@fastify/static";
// import { join } from "path";
// import type { WebSocket } from "@fastify/websocket";
// import { PongGame } from "../../../dist/modules/game/game/pong.js";
// import { writeFileSync } from "fs";
// import type { FastifyRequest } from "fastify";


// // const fastify = FastifyInstance;



// // Register WS
// class Client {
//   keysPressed = new Map();
//   game: PongGame;
//   socket: WebSocket;
//   handshakeComplete: boolean = false;
//   outputQueue: string[] = []; // <-- each client has its own queue
//   receivedFullState = false;

//   constructor() {}

//   update(input) {
//     if (!input.payload) return;

//     if (input.type === "input") {
//       const { key, action } = input.payload;
//       if (action === "keydown") this.keysPressed.set(key, true);
//       else if (action === "keyup") this.keysPressed.delete(key);
//     }
    
//     if (input.type === "fetch_world") {
//       this.outputQueue.push(compile(true));
//     }
//   }
// }


// const clients = new Set<Client>();

// // fastify.get("/ws", { websocket: true }, (socket, req) => {
// //   const player = new Client();
// //   player.game = pongGame; 
// //   player.socket = socket;

// //   clients.add(player);
// //   console.log("!!! Client connected");

// //   socket.on("message", (msg) => {
// //     const data = JSON.parse(msg.toString());
// //     if (data["type"] === "ready") {
// //       console.log("✅ Client handshake complete");
// //       player.handshakeComplete = true; // mark ready
// //       player.socket.send(JSON.stringify({
// //         type: "ready",
// //         payload: {}
// //       }));
// //     }
// //     if (data["type"] === "received_full_state") {
// //       player.receivedFullState = true;
// //     }

// //     player.update(data); // update this player's state only
// //   });
// //   socket.on("close", () => {
// //     console.log("Client disconnected");
// //     clients.delete(player);
// //   });
// // });


// // // Serve static frontend
// // fastify.get("/", async (_, reply) => {
// //   return reply.type("text/html").send(`
// //     <!DOCTYPE html>
// //     <html lang="en">
// //     <head>
// //       <meta charset="UTF-8" />
// //       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
// //       <title>Pong2 Game</title>
// // <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.3/dist/tailwind.min.css" rel="stylesheet">
// // <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">

// //     </head>
// //     <body class="bg-gray-900 text-white min-h-screen flex items-center justify-center">
// //       <center>
// //       <div class="flex flex-col items-center justify-center h-screen w-screen overflow-auto">
// //       <canvas id="pong-canvas" width="880" height="500" class="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800 max-w-full"></canvas>
// //     <div class="mt-6 flex justify-between items-center" style="width:1000px; height:120px; border-radius:16px;">
// //     </div>    </div>
// //       </center>
// //       <script type="module" src="/client.js"></script>			</body>
// //     </html>
    
// //   `);
// // });

// // // Serve compiled client.js
// // import { readFileSync, existsSync } from "fs";
// // import { exit } from "process";
// // fastify.get("/client.js", async (_, reply) => {
// //   console.log(join(process.cwd(), "dist", "client.js"));
// //   return reply.type("application/javascript").send(
// //     readFileSync(join(process.cwd(), "dist", "client.js"), "utf-8")
// //   );
// // });

// // // First registration (dist)
// // await fastify.register(fastifyStatic, {
// //   root: join(process.cwd(), "dist"),
// // //   prefix: "/static/",
// // });


// // // Second registration (assets)
// // await fastify.register(fastifyStatic, {
// //   root: join(process.cwd(), "assets"),
// //   prefix: "/assets/",
// //   decorateReply: false // Prevents duplicate decorator error
// // });

// // fastify.get("/:file", async (request: FastifyRequest<{ Params: { file: string } }>, reply) => {
// //   const file = request.params.file;
// //   if (file.endsWith(".js")) {
// //     const filePath = join(process.cwd(), "dist", file);
// //     if (existsSync(filePath)) {
// //       return reply.type("application/javascript").send(readFileSync(filePath, "utf-8"));
// //     } else {
// //       return reply.code(404).send("File not found");
// //     }
// //   }
// //   return reply.code(404).send("Not found");
// // });

// interface Player {
//   id: number,
//   name: string,
//   skin: number,
//   team: number,
// }

// const players: Player[] = [
//   {
//     "id": 0,
//     "name": "test",
//     "skin": 0,
//     "team": 0
//   },
//   {
//     "id": 1,
//     "name": "player2",
//     "skin": 1,
//     "team": 1
//   },
//   {
//     "id": 2,
//     "name": "player3",
//     "skin": 2,
//     "team": 0
//   },
//   {
//     "id": 3,
//     "name": "player4",
//     "skin": 3,
//     "team": 1
//   },
//   // {
//   //   "name": "player5",
//   //   "skin": 4
//   // },
//   // {
//   //   "name": "player6",
//   //   "skin": 5
//   // }
// ]




// const pongGame = new PongGame(clients, false, players);  

// function compile(includeStaticObjects: boolean) {
//   const state = pongGame.exportState(includeStaticObjects);

//   const output = JSON.stringify({
//     state: state,
//     metadata: {
//       timestamp: Date.now(),
//       delta: pongGame.delta,
//       fps: pongGame.fps,
//     }
//   }, null, 2);

//   if (includeStaticObjects) {
//     writeFileSync("game_state_full.json", output, "utf-8");
//   }

//   return output;
// }


// // Game loop function
// function updateGameObjects() {
//   const output = compile(false);

//   writeFileSync("game_state.json", output, "utf-8");

//   for (const client of clients) {
//     if (client.socket.readyState === 1) {
//       if (client.handshakeComplete && client.receivedFullState) {
//         client.socket.send(output);
//       }
  
//       while (client.outputQueue.length > 0) {
//         console.log("sending queued state to", client.socket.url);
//         client.socket.send(client.outputQueue.shift()!);
//       }
//     }
//   }

//   pongGame.update();
// }





export function testMyGame() {

  // const TICK_RATE = 1000 / 55; // 60 FPS
  // setInterval(updateGameObjects, TICK_RATE);

  // pongGame.startGame();

  // fastify.listen({ port: 3000 }, (err, address) => {
  //   if (err) throw err;
  //   console.log(`🚀 Server running at ${address}`);
  // });

}

