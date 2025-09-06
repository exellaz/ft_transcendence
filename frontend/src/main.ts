import { startConnection } from "./connection";

const API_URL = `http://${window.location.hostname}:4242`;

async function fetchRooms() {
  const res = await fetch(`${API_URL}/rooms`);
  return await res.json();
}

async function fetchMatches(limit = 10) {
  try {
    const res = await fetch(`${API_URL}/matches?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch matches");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function createRoom(teamSize: number, roomName: string) { //input id
  const res = await fetch(`${API_URL}/create-room`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ teamSize, name: roomName }),
  });
  return await res.json();
}

function showLobby() {
	const lobbyDiv = document.createElement("div");
	lobbyDiv.id = "lobby";
	document.body.appendChild(lobbyDiv);

	const title = document.createElement("h1");
	title.textContent = "Pong Lobby";
	lobbyDiv.appendChild(title);

	// Create room button
	const createBtn = document.createElement("button");
	createBtn.textContent = "Create Room";
	createBtn.onclick = async () => {
		let teamSize = 0;
		while (teamSize < 1 || teamSize > 2) {
			teamSize = parseInt(prompt("Enter team size (1-2):", "0") || "0");
			if (teamSize >= 1 && teamSize <= 2)
				break;
		}
		let roomName = "";
		while (!roomName) {
			roomName = prompt("Enter room name:") || "";
			if (roomName)
				break;
			alert("Room name is required!");
		}
		const room = await createRoom(teamSize, roomName);
		startGame(room.roomId);
	};
	lobbyDiv.appendChild(createBtn);

	// Room list
	const listDiv = document.createElement("div");
	listDiv.id = "roomList";
	lobbyDiv.appendChild(listDiv);

	// Refresh rooms every 2s
	async function refreshRooms() {
		const rooms = await fetchRooms();
		listDiv.innerHTML = "";
		rooms
			.filter((room: any) => room.leftPlayers + room.rightPlayers > 0) // Only show rooms with players
			.forEach((room: any) => {
				const item = document.createElement("div");
				item.textContent = `${room.name} — ${room.leftPlayers + room.rightPlayers}/${room.teamSize * 2} players ${
					room.gameStarted ? "(in progress)" : "(waiting)"
				}`;

				const joinBtn = document.createElement("button");
				joinBtn.textContent = "Join";
				joinBtn.onclick = () => startGame(room.id); //join using room id
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

    setInterval(refreshMatches, 5000); // refresh every 5s
    refreshMatches();
}

async function startGame(roomId: string) {
	document.body.innerHTML = ""; // clear lobby UI

	// get or generate client ID
	let clientId = sessionStorage.getItem("pongClientId");
	if (!clientId) {
		clientId = Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
		sessionStorage.setItem("pongClientId", clientId);
	}

	startConnection(roomId); // call your existing connection.ts
}

showLobby();
