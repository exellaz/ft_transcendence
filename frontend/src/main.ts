import { startConnection } from "./connection";

const API_URL = `http://${window.location.hostname}:4242`;

async function fetchRooms() {
  const res = await fetch(`${API_URL}/rooms`);
  return await res.json();
}

async function createRoom(teamSize: number, roomName: string) { //input id
  const res = await fetch(`${API_URL}/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamSize, id: roomName }),
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
        while (teamSize < 1 || teamSize > 5) {
            teamSize = parseInt(prompt("Enter team size (1-5):", "0") || "0");
            if (teamSize >= 1 && teamSize <= 4)
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
		rooms.forEach((room: any) => {
			const item = document.createElement("div");
			item.textContent = `${room.id} — ${room.leftPlayers + room.rightPlayers}/${room.teamSize * 2} players ${
				room.gameStarted ? "(in progress)" : "(waiting)"
			}`;
			const joinBtn = document.createElement("button");
			joinBtn.textContent = "Join";
			joinBtn.onclick = () => startGame(room.id);
			item.appendChild(joinBtn);
			listDiv.appendChild(item);
		});
	}
	setInterval(refreshRooms, 2000);
	refreshRooms();
}

function startGame(roomId: string) {
	document.body.innerHTML = ""; // clear lobby UI
	startConnection(roomId); // call your existing connection.ts
}

showLobby();
