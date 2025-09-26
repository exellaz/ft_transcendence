// testBackend.js
import WebSocket from "ws";
import fetch from "node-fetch";

const API_URL = "http://localhost:4242";
const WS_URL = "ws://localhost:4242/ws";

async function createRoom(name, teamSize, leaderId, paddle) {
  const res = await fetch(`${API_URL}/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, teamSize, leaderId, paddle }),
  });
  const data = await res.json();
  console.log("Room created:", data);
  return data.roomId;
}

async function testGame() {
  // 1. Create room
  const roomId = await createRoom("testroom", 1, "p1", "left");
  const player1 = new WebSocket(`${WS_URL}?room=${roomId}&id=p1&side=left`);
  const player2 = new WebSocket(`${WS_URL}?room=${roomId}&id=p2&side=right`);

  setTimeout(() => {
    // console.log("Leader starting the game...");
    // player1.send(JSON.stringify({ type: "start" }));
    // console.log("Player1 switching side to left");
    // player1.send(JSON.stringify({ type: "switchSide", side: "right" }));
}, 1000);

  // 3. then mark both players ready
  setTimeout(() => {
    console.log("Both players sending ready...");
    player1.send(JSON.stringify({ type: "ready" }));
    player2.send(JSON.stringify({ type: "ready" }));
  }, 2000);

  // 4. leader starts the game
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
