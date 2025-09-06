// testBackend.js
import WebSocket from "ws";
import fetch from "node-fetch";

const API_URL = "http://localhost:4242";
const WS_URL = "ws://localhost:4242/ws";

async function createRoom(name = "testroom", teamSize = 1) {
  const res = await fetch(`${API_URL}/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, teamSize }),
  });
  const data = await res.json();
  console.log("Room created:", data);
  return data.roomId;
}

function createPlayer(roomId, playerId, side) {
  const ws = new WebSocket(`${WS_URL}?room=${roomId}&id=${playerId}&side=${side}`);

  ws.on("open", () => {
    console.log(`${playerId} connected as ${side}`);
  });

  ws.on("message", (msg) => {
    const data = JSON.parse(msg.toString());
    //if (data.type === "state") {
    //  console.log(`[${playerId}] game state: countdown=${data.gameState.countdown} started=${data.gameState.gameStarted}`);
    //} else if (data.type === "chat") {
    //  console.log(`[${playerId}] chat: ${data.from} -> ${data.text}`);
    //} else if (data.type === "error") {
    //  console.log(`[${playerId}] error: ${data.text}`);
    //}
  });

  return ws;
}

async function testGame() {
  // 1. Create room
  const roomId = await createRoom();

  // 2. Connect two players
  const player1 = createPlayer(roomId, "p1", "left");
  const player2 = createPlayer(roomId, "p2", "right");

  // 3. Wait 1 second, then mark both players ready
  setTimeout(() => {
    console.log("Both players sending ready...");
    player1.send(JSON.stringify({ type: "ready" }));
    player2.send(JSON.stringify({ type: "ready" }));
  }, 1000);

  // 4. Wait 2 seconds, leader starts the game
  setTimeout(() => {
    console.log("Leader starting the game...");
    player1.send(JSON.stringify({ type: "start" }));
  }, 3000);

  // 5. Optional: test move paddle and switch side
  setTimeout(() => {
    console.log("Player1 moving paddle +5");
    player1.send(JSON.stringify({ type: "move", dy: 5 }));

    //console.log("Player2 switching side to left");
    //player2.send(JSON.stringify({ type: "switchSide", side: "left" }));
  }, 5000);

//  // 6. Close connections after 20 seconds
//  setTimeout(() => {
//    player1.close();
//    player2.close();
//    console.log("Test finished, connections closed.");
//  }, 20000);
}

testGame();
