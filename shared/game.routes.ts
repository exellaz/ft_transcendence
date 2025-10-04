import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";

import { WebSocket, RawData } from "ws";  // 👈 use ws types

import { writeFileSync } from "fs";
import { GameSettings, PongGame } from "./game/pong";
import { Player } from "./game/Player";

const clients = new Set<Client>();


interface Player {
  id: number,
  name: string,
  skin: number,
  team: number,
}

const players: Player[] = [
  {
    "id": 0,
    "name": "test",
    "skin": 0,
    "team": 0
  },
  {
    "id": 1,
    "name": "player2",
    "skin": 1,
    "team": 1
  },
  {
    "id": 2,
    "name": "player3",
    "skin": 2,
    "team": 0
  },
  {
    "id": 3,
    "name": "player4",
    "skin": 3,
    "team": 1
  },
]

let DEBUG_playerIndex = 0;


const settings = new GameSettings();
// settings.ballSpeed = 1000;


console.log("!!!started game");

const pongGame = new PongGame(
  clients, 
  false, 
  players, 
  settings
);

function compile(includeStaticObjects: boolean) {
  const state = pongGame.exportState(includeStaticObjects);

  const output = JSON.stringify({
    state: state,
    metadata: {
      timestamp: Date.now(),
      delta: pongGame.delta,
      fps: pongGame.fps,
    }
  }, null, 2);

  if (includeStaticObjects) {
    writeFileSync("game_state_full.json", output, "utf-8");
  }

  return output;
}



class Client {
  keysPressed = new Map();
  game: PongGame | null = null;
  socket: WebSocket | null = null;
  handshakeComplete: boolean = false;
  outputQueue: string[] = []; // <-- each client has its own queue
  receivedFullState = false;

  constructor() { }

  update(input: Record<string, any>) {
    if (!input.payload) return;

    if (input.type === "input") {
      const { key, action } = input.payload;
      if (action === "keydown") this.keysPressed.set(key, true);
      else if (action === "keyup") this.keysPressed.delete(key);
    }

    if (input.type === "fetch_world") {
      this.outputQueue.push(compile(true));
    }
  }
}




function updateGameObjects() {
  const output = compile(false);

  writeFileSync("game_state.json", output, "utf-8");

  for (const client of clients) {
    if (client.socket && client.socket.readyState === 1) {
      try {
        if (client.handshakeComplete && client.receivedFullState) {
          client.socket.send(output);
        }
        while (client.outputQueue.length > 0) {
          console.log("sent full state");
          client.socket.send(client.outputQueue.shift()!);
        }
      } catch (e) {
        console.error("Error sending to client:", e);
      }
    }
  }


  pongGame.update();
}

export async function gameRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {



  fastify.get("/ws", { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
    if (!socket)
      return req.log.info("Received normal HTTP request to /ws — ignoring");


    function onMessage(msg: Record<string, any>) {
      const data = JSON.parse(msg.toString());

      if (data["type"] === "ready") {
        console.log("✅ Client handshake complete");
        player.handshakeComplete = true; // mark ready

        console.log(JSON.stringify(data, null, 2));

        player.socket!.send(JSON.stringify({
          type: "ready",
          payload: {}
        }));

        const newPlayer = new Player(players[DEBUG_playerIndex++]);
        pongGame.addPlayer(newPlayer);
        for (const client of clients) {
          client.outputQueue.push(compile(true));
        }
      }

      else if (data["type"] === "received_full_state") {
        player.receivedFullState = true;
      }

      else {
        console.log(JSON.stringify(data, null, 2));
      }


      

      player.update(data); // update this player's state only
    }

    const player = new Client();
    player.game = pongGame;
    player.socket = socket;

    clients.add(player);
    console.log("!!! Client connected");

    socket.on("open", () => { console.log("started"); })
    socket.on("message", onMessage);
    socket.on("close", () => { clients.delete(player); });
  });
}

const TICK_RATE = 1000 / 55; // 60 FPS
setInterval(updateGameObjects, TICK_RATE);

// pongGame.startGame();

