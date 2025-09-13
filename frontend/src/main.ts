// import { startConnection } from "./frontendGame";
// import { initChatConnection, initChatUI } from "./globalChat";

// const baseWeight = 800;
// const baseHeight = 400;
// const scale = Math.min(window.innerWidth / baseWeight, window.innerHeight / baseHeight, 1);
// export const scaledWidth = baseWeight * scale;
// export const scaledHeight = baseHeight * scale;

// const API_URL = `http://${window.location.hostname}:4242`;

// async function fetchRooms() {
//   const res = await fetch(`${API_URL}/rooms`);
//   return await res.json();
// }

// async function fetchMatches(limit = 10) {
//   try {
//     const res = await fetch(`${API_URL}/matches?limit=${limit}`);
//     if (!res.ok) throw new Error("Failed to fetch matches");
//     return await res.json();
//   } catch (err) {
//     console.error(err);
//     return [];
//   }
// }

// async function createRoom(teamSize: number, roomName: string, leaderId: string, width: number, height: number) {
//   const res = await fetch(`${API_URL}/create-room`, {
// 	method: "POST",
// 	headers: { "Content-Type": "application/json" },
// 	body: JSON.stringify({ teamSize, name: roomName, leaderId, width, height }),
//   });
//   return await res.json();
// }

// async function detemineSide(roomId: string): Promise<"left" | "right"> {
// 	const rooms = await fetchRooms();
// 	const room = rooms.find((r: any) => r.id === roomId);
//     if (!room) return "left";
//     return room.leftPlayers <= room.rightPlayers ? "left" : "right";
// }

// export function showLobby() {
// 	let clientId = sessionStorage.getItem("pongClientId");
// 	if (!clientId) {
// 		clientId = "P" + Math.floor(Math.random() * Math.pow(10, 6)) ////set player ID
// 			.toString()
// 			.padStart(6, "0");
// 		sessionStorage.setItem("pongClientId", clientId);
// 	}

// 	const lobbyDiv = document.createElement("div");
// 	lobbyDiv.id = "lobby";
// 	document.body.appendChild(lobbyDiv);

// 	const title = document.createElement("h1");
// 	title.textContent = "Pong Lobby";
// 	lobbyDiv.appendChild(title);

// 	// Create room button
// 	const createBtn = document.createElement("button");
// 	createBtn.textContent = "Create Room";
// 	createBtn.onclick = async () => {
// 		let teamSize = 0;
// 		while (teamSize < 1 || teamSize > 2) {
// 			teamSize = parseInt(prompt("Enter team size (1-2):", "0") || "0");
// 			if (teamSize >= 1 && teamSize <= 2)
// 				break;
// 		}
// 		let roomName = "";
// 		while (!roomName) {
// 			roomName = prompt("Enter room name:") || "";
// 			if (roomName)
// 				break;
// 			alert("Room name is required!");
// 		}
// 		console.log(`check clientid in create room: ${clientId}`); ////debug
// 		const room = await createRoom(teamSize, roomName, clientId, scaledWidth, scaledHeight);
// 		startGame(room.roomId, room.leaderId);
// 	};
// 	lobbyDiv.appendChild(createBtn);

// 	initChatConnection();
// 	initChatUI();

// 	// Room list
// 	const listDiv = document.createElement("div");
// 	listDiv.id = "roomList";
// 	lobbyDiv.appendChild(listDiv);

// 	// Refresh rooms every 2s
// 	async function refreshRooms() {
// 		const rooms = await fetchRooms();
// 		listDiv.innerHTML = "";
// 		rooms
// 			.filter((room: any) => room.leftPlayers + room.rightPlayers > 0) // Only show rooms with players
// 			.forEach((room: any) => {
// 				const item = document.createElement("div");
// 				item.textContent = `${room.name} — ${room.leftPlayers + room.rightPlayers}/${room.teamSize * 2} players ${
// 					room.gameStarted ? "(in progress)" : "(waiting)"
// 				}`;

// 				const joinBtn = document.createElement("button");
// 				joinBtn.textContent = "Join";
// 				joinBtn.onclick = () => startGame(room.id, room.leaderId); //join using room id
// 				item.appendChild(joinBtn);

// 				listDiv.appendChild(item);
// 			});
// 	}

//     setInterval(refreshRooms, 2000);
// 	refreshRooms();

//     // --- Match History ---
//     const matchDiv = document.createElement("div");
//     matchDiv.id = "matchHistory";
//     matchDiv.style.marginTop = "20px";
//     lobbyDiv.appendChild(matchDiv);

//     async function refreshMatches() {
//       const matches = await fetchMatches(10);
//       matchDiv.innerHTML = `<h2>Recent Matches</h2>
//         <style>
//           .match-table { width:100%; border-collapse:collapse; }
//           .match-table th, .match-table td { border:1px solid #ccc; padding:6px; text-align:center; vertical-align:top; }
//           .cell-container { min-width:90px; display:inline-block; }
//           .players-table { width:100%; border:1px solid #ccc; font-size:0.95em; }
//           .players-table td { padding:2px 6px; }
//         </style>
//         <table class="match-table">
//           <thead>
//             <tr style="background:#eee;">
//               <th>Name</th>
//               <th>Room</th>
//               <th>Score</th>
//               <th>Winner</th>
//               <th>Duration</th>
//               <th>Players</th>
//             </tr>
//           </thead>
//           <tbody id="matchTableBody"></tbody>
//         </table>`;
//       const tbody = matchDiv.querySelector("#matchTableBody");
//       if (tbody) {
//         matches.forEach((m: any) => {
//           const tr = document.createElement("tr");
//           tr.innerHTML = `
//             <td><div class="cell-container"><strong>${m.name}</strong></div></td>
//             <td><div class="cell-container">${m.room_id}</div></td>
//             <td><div class="cell-container">${m.score_left} - ${m.score_right}</div></td>
//             <td><div class="cell-container">${m.winner}</div></td>
//             <td><div class="cell-container">${m.duration}s</div></td>
//             <td>
//               <table class="players-table">
//                 <tbody>
//                   ${m.players.map((p: any) => `<tr><td>${p.player_id}</td><td>${p.team}</td></tr>`).join("")}
//                 </tbody>
//               </table>
//             </td>
//           `;
//           tbody.appendChild(tr);
//         });
//       }
//     }

//     setInterval(refreshMatches, 5000); // refresh every 5s
//     refreshMatches();
// }

// async function startGame(roomId: string, leaderId: string) {
// 	document.body.innerHTML = ""; // clear lobby

// 	initChatConnection();
// 	initChatUI();

// 	// Create room lobby container
// 	const lobbyDiv = document.createElement("div");
// 	lobbyDiv.id = "roomLobby";
// 	document.body.appendChild(lobbyDiv);

// 	const statusText = document.createElement("h2");
// 	statusText.id = "lobbyStatus";
// 	statusText.textContent = "Connecting to room...";
// 	lobbyDiv.appendChild(statusText);

// 	// Add buttons
// 	const btnSwitch = document.createElement("button");
// 	btnSwitch.textContent = "Switch Side";
// 	lobbyDiv.appendChild(btnSwitch);

// 	const btnReady = document.createElement("button");
// 	const btnStart = document.createElement("button");
// 	btnStart.textContent = "Start Game";
// 	btnStart.style.display = "none"; // only leader can start
// 	btnStart.disabled = true; // disabled until all ready
// 	lobbyDiv.appendChild(btnStart);

// 	// get or generate client ID
// 	let clientId = sessionStorage.getItem("pongClientId");
// 	if (!clientId) {
// 		clientId = "P" + Math.floor(Math.random() * Math.pow(10, 6))
// 			.toString()
// 			.padStart(6, "0");
// 	}
// 	sessionStorage.setItem("pongClientId", clientId);

// 	console.log(`start game client id: ${clientId}`); ////debug
// 	console.log(`leaderId in start game: ${leaderId}`); ////debug

// 	 // Leader check
//     let role = "spectator";
//     let isLeader = clientId === leaderId;
//     let ready = false;
//     let gameStarted = false;

//     if (!isLeader) {
//         btnReady.textContent = "Ready";
//         lobbyDiv.appendChild(btnReady);
//     }

// 	// --- Start WebSocket ---
// 	const chooseSide = await detemineSide(roomId);
// 	const socket = new WebSocket(
// 		`ws://${window.location.hostname}:4242/ws?id=${clientId}&room=${roomId}&side=${chooseSide}`
// 	);

// 	socket.onopen = () => {
// 		console.log("Connected to room lobby");
// 	};

// 	socket.onmessage = (event) => {
// 		const data = JSON.parse(event.data);

// 		// Update leaderId from backend
//     	if (data.leaderId) leaderId = data.leaderId;
//     	isLeader = clientId === leaderId;

// 		btnStart.style.display = isLeader ? "inline-block" : "none";

// 		// Role assignment / update
// 		if (data.type === "role" || data.type === "roleUpdate") {
// 			role = data.newRole || data.role;

// 			if (role === "spectator") {
// 				btnSwitch.style.display = "none";
// 				btnReady.style.display = "none";
// 			}

// 			// Update switch button label to show current side
// 			btnSwitch.textContent = ready
// 				? `Side: ${role.startsWith("left") ? "Left" : "Right"} (locked)`
// 				: `Switch Side (current: ${role.startsWith("left") ? "Left" : "Right"})`;

// 			statusText.textContent = `Room: ${roomId} | Role: ${role} | Leader: ${isLeader ? "Yes" : "No"}`;
// 			console.log(`client Id: ${clientId}, leaderId: ${leaderId}`); ////debug
// 		}

//         // state update
//         if (data.type === "state") {
//             const leftCount = data.gameState.teams.left.length;
//             const rightCount = data.gameState.teams.right.length;
//             statusText.textContent = `Room ${roomId} | Left: ${leftCount}, Right: ${rightCount}`;

// 			//only update if canStart changed
// 			const canStart = data.canStart ?? false;
// 			btnStart.disabled = canStart;
//             if (btnStart.disabled === false)
//                 console.log(`start button: yes`);
//             else
//                 console.log(`start button: no`);


// 			// switch to game view if countdown started
//             if (!gameStarted && data.gameState.countdown > 0) {
//                 gameStarted = true;
// 				const lobbyDiv = document.getElementById("roomLobby");
// 				if (lobbyDiv) lobbyDiv.remove();
//                 startConnection(roomId);
//             }
//         }
// 	};

// 	// Button handlers
// 	btnSwitch.onclick = () => {
// 		if (ready) return; // cannot switch when ready

// 		const newSide = role.startsWith("left") ? "right" : "left";
// 		socket.send(JSON.stringify({ type: "switchSide", side: newSide }));
// 	};

// 	btnReady.onclick = () => {
//     	// Leader does not need to click ready
//     	if (isLeader)
// 			return;

// 		ready = !ready;
// 		socket.send(JSON.stringify({ type: "ready", ready }));
// 		btnReady.textContent = ready ? "Unready" : "Ready";

// 		// Update switch button label to show locked when ready
// 		btnSwitch.textContent = ready
// 			? `Side: ${role.startsWith("left") ? "Left" : "Right"} (locked)`
// 			: `Switch Side (current: ${role.startsWith("left") ? "Left" : "Right"})`;
// 	};

// 	btnStart.onclick = () => {
// 		if (!isLeader) {
// 			alert("Only the leader can start the game!");
// 			return;
// 		}
// 		socket.send(JSON.stringify({ type: "start" }));
// 	};
// }

// window.addEventListener("DOMContentLoaded", () => {

//     const saveRoom = sessionStorage.getItem("pongRoomName");
//     const saveClient = sessionStorage.getItem("pongClientId") || "P" + Math.floor(Math.random() * Math.pow(10, 6)).toString().padEnd(6, "0");

// 	sessionStorage.setItem("pongClientId", saveClient); // ensure not null

//     if (saveRoom) {
// 		startGame(saveRoom, saveClient);
//     } else
//         showLobby();
// });
import { showLobby } from "./frontendLobby";
import { startRoom } from "./frontendRoom";

const baseWeight = 800;
const baseHeight = 400;
const scale = Math.min(window.innerWidth / baseWeight, window.innerHeight / baseHeight, 1);
export const scaledWidth = baseWeight * scale;
export const scaledHeight = baseHeight * scale;

window.addEventListener("DOMContentLoaded", () => {
  const saveRoom = sessionStorage.getItem("pongRoomName");
  const saveRoomId = sessionStorage.getItem("pongRoomId") || "";
  const saveClient =
    sessionStorage.getItem("pongClientId") ||
    "P" + Math.floor(Math.random() * Math.pow(10, 6)).toString().padEnd(6, "0");

  sessionStorage.setItem("pongClientId", saveClient);

  //
  if (saveRoom) {
    startRoom(saveRoomId, saveRoom, saveClient);
  } else {
    showLobby();
  }
});
