import { detemineSide, roomSetting } from "./utils.ts";
import { startGame } from "./frontendGame.ts";
import { showLobby } from "./frontendLobby.ts";
import { initChatConnection, initChatUI } from "./globalChat.ts";

const BALLSPEED = 1;
const PADDLEHEIGHT = 10;

export let socket: WebSocket;

export async function startRoom(roomId: string, roomName: string, leaderId: string) {
	document.body.innerHTML = ""; // clear lobby

	initChatConnection();
	initChatUI();

	//prevent accidental refresh/close when in room
	const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
		e.preventDefault();
		e.returnValue = "Are you sure you want to leave the room?";
		return e.returnValue;
	};

	const keyhandler = (e: KeyboardEvent) => {
		if (e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r")) {
			e.preventDefault();
			return;
		}
	}
	window.addEventListener("contextmenu", (e) => e.preventDefault()); // disable right-click context menu
	window.addEventListener("beforeunload", beforeUnloadHandler);
	window.addEventListener("keydown", keyhandler);

	// --- UI setup ---
	const lobbyDiv = document.createElement("div");
	lobbyDiv.id = "roomLobby";
	document.body.appendChild(lobbyDiv);

	const statusText = document.createElement("h2");
	statusText.id = "lobbyStatus";
	statusText.textContent = "Connecting to room...";
	lobbyDiv.appendChild(statusText);

	const btnSwitch = document.createElement("button");
	btnSwitch.textContent = "Switch Side";
	lobbyDiv.appendChild(btnSwitch);

	const btnReady = document.createElement("button");
	const btnStart = document.createElement("button");
	btnStart.textContent = "Start Game";
	btnStart.style.display = "none";
	btnStart.disabled = true;
	lobbyDiv.appendChild(btnStart);

	const btnLeave = document.createElement("button");
	btnLeave.textContent = "Leave Room";
	lobbyDiv.appendChild(btnLeave);


	// --- Client ID ---
	let clientId = sessionStorage.getItem("pongClientId");
	if (!clientId) {
		clientId = "P" + Math.floor(Math.random() * Math.pow(10, 6))
		  .toString()
		  .padStart(6, "0");
	}
	sessionStorage.setItem("pongClientId", clientId);

	await roomSetting(roomId, BALLSPEED, PADDLEHEIGHT);

	let role = clientId === leaderId ? "left_player1" : "spectator";
	let isLeader = clientId === leaderId;
	let ready = false;
	let gameStarted = false;
	let keys = { up: false, down: false };

	if (!isLeader) {
		btnReady.textContent = "Ready";
		lobbyDiv.appendChild(btnReady);
	}

	// --- WebSocket ---
	const chooseSide = await detemineSide(roomId);
	socket = new WebSocket(
	  `ws://${window.location.hostname}:4242/ws?id=${clientId}&room=${roomId}&side=${chooseSide}`
	);

	socket.onopen = () => console.log("Connected to room lobby");

	socket.onmessage = (event) => {
		const data = JSON.parse(event.data);

		// handle leader change
		if (data.type === "state" || data.type === "roleUpdate") {
			// if leaderId is changed, update it
			if (data.leaderId) {
				leaderId = data.leaderId;
				isLeader = clientId === leaderId;
				btnStart.style.display = isLeader ? "inline-block" : "none";
			}

			// if the client is the leader, hide the ready button
			if (isLeader && btnReady) {
				btnReady.style.display = "none";
			}

			// debug info
			if (!isLeader) {
				console.log(`new leader is ${leaderId}`);
			}
		}

		btnStart.style.display = isLeader ? "inline-block" : "none";

		if (data.type === "role" || data.type === "roleUpdate") {
			role = data.newRole || data.role;

			// hide switch and ready button if spectator
			if (role === "spectator") {
				btnSwitch.style.display = "none";
				btnReady.style.display = "none";
			}

			// if roles object is provided, update the role accordingly
			if (data.roles && data.roles[clientId]) {
				role = data.roles[clientId];
			}

			btnSwitch.textContent = ready
				? `Side: ${role.startsWith("left") ? "Left" : "Right"} (locked)`
				: `Switch Side (current: ${role.startsWith("left") ? "Left" : "Right"})`;
		}

		if (data.type === "state") {
			console.log("role: ", role, ", isSpectator: ", data.isSpectator);
			console.log("clientId: ", clientId);
			console.log("roomName: ", roomName);
			const leftCount = data.gameState.teams.left.length;
			const rightCount = data.gameState.teams.right.length;
			statusText.textContent = `Room ${roomName} [${roomId}] | Left: ${leftCount} | Right: ${rightCount} | Role: ${role} | Leader: ${
				isLeader ? "Yes" : "No"
			}`;

			const canStart = data.canStart ?? false;
			btnStart.disabled = canStart;

			// if (!gameStarted && data.gameState.countdown > 0) {
			if (!gameStarted && (data.gameState.countdown > 0 || data.gameState.gameStarted)) {
				gameStarted = true;
				lobbyDiv.remove();
				cleanUp();
				startGame(roomId, roomName, socket, clientId, role, keys);
			}
		}

	};

	// clean up all event before starting the game
	function cleanUp() {
		window.removeEventListener("contextmenu", (e) => e.preventDefault());
		window.removeEventListener("beforeunload", beforeUnloadHandler);
		window.removeEventListener("keydown", keyhandler);
	}

	// --- Button handlers ---
	btnSwitch.onclick = () => {
		if (ready) return;
		const newSide = role.startsWith("left") ? "right" : "left";
		socket.send(JSON.stringify({ type: "switchSide", side: newSide }));
	};

	btnReady.onclick = () => {
		if (isLeader) return;

		ready = !ready;
		socket.send(JSON.stringify({ type: "ready", ready }));
		btnReady.textContent = ready ? "Unready" : "Ready";

		btnSwitch.textContent = ready
			? `Side: ${role.startsWith("left") ? "Left" : "Right"} (locked)`
			: `Switch Side (current: ${role.startsWith("left") ? "Left" : "Right"})`;
	};

  	btnStart.onclick = () => {
		if (!isLeader) {
			alert("Only the leader can start the game!");
			return;
		}
		socket.send(JSON.stringify({ type: "start" }));
  	};

	btnLeave.onclick = () => {
	    cleanUp();
	    document.body.innerHTML = ""; // clear the room UI
		if (socket.readyState === WebSocket.OPEN) socket.close(); //close socket connection
	    showLobby(); // go back to the lobby
	};
}
