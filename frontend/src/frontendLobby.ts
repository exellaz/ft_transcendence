import { createRoom, fetchRooms, fetchMatches } from "./utils.ts";
import { startRoom } from "./frontendRoom.ts";
// import { initChatConnection, initChatUI } from "./globalChat.ts";
import { scaledWidth, scaledHeight } from "./main.ts";

export function showLobby() {
  let clientId = sessionStorage.getItem("pongClientId");
  if (!clientId) {
	clientId = "P" + Math.floor(Math.random() * Math.pow(10, 6))
	  .toString()
	  .padStart(6, "0");
	sessionStorage.setItem("pongClientId", clientId);
  }

  const lobbyDiv = document.createElement("div");
  lobbyDiv.id = "lobby";
  document.body.appendChild(lobbyDiv);

  const title = document.createElement("h1");
  title.textContent = "Pong Lobby";
  lobbyDiv.appendChild(title);

  // --- Create room ---
  const createBtn = document.createElement("button");
  createBtn.textContent = "Create Room";
  createBtn.onclick = async () => {
	let teamSize = 0;
	while (teamSize < 1 || teamSize > 2) {
	  teamSize = parseInt(prompt("Enter team size (1-2):", "0") || "0");
	  if (teamSize >= 1 && teamSize <= 2) break;
	}

	let roomName = "";
	while (!roomName) {
	  roomName = prompt("Enter room name:") || "";
	  if (roomName) break;
	  alert("Room name is required!");
	}

	console.log(`check clientid in create room: ${clientId}`); ////debug
	const room = await createRoom(teamSize, roomName, clientId, scaledWidth, scaledHeight);
	startRoom(room.roomId, room.leaderId);
  };
  lobbyDiv.appendChild(createBtn);

  // --- Chat ---
//   initChatConnection();
//   initChatUI();

  // --- Room List ---
  const listDiv = document.createElement("div");
  listDiv.id = "roomList";
  lobbyDiv.appendChild(listDiv);

  async function refreshRooms() {
	const rooms = await fetchRooms();
	listDiv.innerHTML = "";
	rooms
	  .filter((room: any) => room.leftPlayers + room.rightPlayers > 0)
	  .forEach((room: any) => {
		const item = document.createElement("div");
		item.textContent = `${room.name} — ${room.leftPlayers + room.rightPlayers}/${
		  room.teamSize * 2
		} players ${room.gameStarted ? "(playing)" : "(waiting)"}`;

		const joinBtn = document.createElement("button");
		joinBtn.textContent = "Join";
		joinBtn.onclick = () => startRoom(room.id, room.leaderId);
		item.appendChild(joinBtn);

		listDiv.appendChild(item);
	  });
  }

  setInterval(refreshRooms, 2000);
  refreshRooms();

  // --- Match History ---
  const matchDiv = document.createElement("div");
  matchDiv.id = "matchHistory";
  matchDiv.style.marginTop = "20px";
  lobbyDiv.appendChild(matchDiv);

	async function refreshMatches() {
		const matches = await fetchMatches(10);
		matchDiv.innerHTML = `<h2>Recent Matches</h2>
		  <style>
			.match-table { width:100%; border-collapse:collapse; }
			.match-table th, .match-table td { border:1px solid #ccc; padding:6px; text-align:center; vertical-align:top; }
			.cell-container { min-width:90px; display:inline-block; }
			.players-table { width:100%; border:1px solid #ccc; font-size:0.95em; }
			.players-table td { padding:2px 6px; }
		  </style>
		  <table class="match-table">
			<thead>
			  <tr style="background:#eee;">
				<th>Name</th>
				<th>Room</th>
				<th>Score</th>
				<th>Winner</th>
				<th>Duration</th>
				<th>Players</th>
			  </tr>
			</thead>
			<tbody id="matchTableBody"></tbody>
		  </table>`;
		const tbody = matchDiv.querySelector("#matchTableBody");
		if (tbody) {
			matches.forEach((m: any) => {
				const tr = document.createElement("tr");
				tr.innerHTML = `
				  <td><div class="cell-container"><strong>${m.name}</strong></div></td>
				  <td><div class="cell-container">${m.room_id}</div></td>
				  <td><div class="cell-container">${m.score_left} - ${m.score_right}</div></td>
				  <td><div class="cell-container">${m.winner}</div></td>
				  <td><div class="cell-container">${m.duration}s</div></td>
				  <td>
					<table class="players-table">
					  <tbody>
						${m.players.map((p: any) => `<tr><td>${p.player_id}</td><td>${p.team}</td></tr>`).join("")}
					  </tbody>
					</table>
				  </td>
				`;
				tbody.appendChild(tr);
			});
		}
	}

  setInterval(refreshMatches, 5000);
  refreshMatches();
}
