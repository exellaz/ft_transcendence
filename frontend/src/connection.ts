//declare these two custom properties
declare global {
	interface Window {
		pongCountdownStarted?: boolean;
		pongCountdownEnd?: number;
	}
}

export function startConnection(roomId: string) {
	createUI();

	const canvas = document.getElementById("game") as HTMLCanvasElement;
	let role = "spectator";
	const roleText = document.getElementById("roleText")!;
	const scoreText = document.getElementById("scoreText")!;

	//get the client ID from session storage or create a new one
	let clientId = sessionStorage.getItem("pongClientId");
	if (!clientId) { // if client ID does not exist
		clientId = generateUID(); // function for create unique ID and store it
		sessionStorage.setItem("pongClientId", clientId);
	}


	const socket = new WebSocket(`ws://${window.location.hostname}:4242/ws?id=${clientId}&room=${roomId}`);

	//handle the WebSocket events
	socket.onopen = () => {
		console.log("WebSocket connected");

		// Send canvas size to server
		if (canvas) {
			socket.send(JSON.stringify({ type: "setHeight", height: canvas.height }));
			socket.send(JSON.stringify({ type: "setWidth", width: canvas.width }));
		}
	};

	socket.onerror = (err) => console.error("WebSocket error:", err);
	socket.onclose = () => console.log("WebSocket closed");

	//handle incoming messages from server
	socket.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data);

			// Role assign to print
			if (data.type === "role") {
				role = data.role;
				roleText.textContent = `Room: ${data.roomId} | Role: ${role}`;
			}

			// Game state update
			if (data.type === "state") {
				draw_container(data.gameState, data.isSpectator);
				scoreText.textContent = `Score: ${data.gameState.score.left} - ${data.gameState.score.right}`;
			}

					// -------- CHAT --------
			if (data.type === "chat") {
				const chatBox = document.getElementById("chatBox")!;
				const msgDiv = document.createElement("div");
				const time = new Date(data.time).toLocaleTimeString();
				msgDiv.textContent = `[${time}] ${data.from}: ${data.text}`;
				chatBox.appendChild(msgDiv);
				chatBox.scrollTop = chatBox.scrollHeight; // auto scroll
			}
		} catch (err) {
			console.error("Invalid JSON from server:", event.data);
		}
	};

	// Key handling
	const keys = { up: false, down: false };
	window.addEventListener("keydown", (e) => {
		if (role === "spectator") return;
		if (e.key === "ArrowUp") keys.up = true;
		if (e.key === "ArrowDown") keys.down = true;
	});
	window.addEventListener("keyup", (e) => {
		if (role === "spectator") return;
		if (e.key === "ArrowUp") keys.up = false;
		if (e.key === "ArrowDown") keys.down = false;
	});

	// Chat input handling
	const chatInput = document.getElementById("chatInput") as HTMLInputElement;
	chatInput.addEventListener("keydown", (e) => {
		if (e.key === "Enter" && chatInput.value.trim() !== "") {
			socket.send(JSON.stringify({
				type: "chat",
				text: chatInput.value.trim()
			}));
			chatInput.value = "";
		}
	});

	// Send movement to server
	setInterval(() => {
		if (role === "spectator") return;
		if (keys.up) socket.send(JSON.stringify({ type: "move", role, dy: -10 }));
		if (keys.down) socket.send(JSON.stringify({ type: "move", role, dy: 10 }));
	}, 1000 / 60);
}

/////////////////////////////////// EXTERNAL FUNCTIONS ///////////////////////////////////

//generate UID
function generateUID(): string {
  return (
	Date.now().toString(36) +      // timestamp part
	Math.random().toString(36).substr(2, 8) // random part
  );
}

/**
 * @brief draw container in html (pong game)
 * @param state - current game state from server
*/
function draw_container(state: any, isSpectator?: boolean) {
    const canvas = document.getElementById("game") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas not found!");
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const paddleWidth = 10;
    const paddleHeight = 80;

    const leftPlayers = state.teams.left.length;
    const rightPlayers = state.teams.right.length;
    const allPlayersConnected = leftPlayers === rightPlayers && leftPlayers > 0;

    // If not all players connected, show only waiting message
    if (!allPlayersConnected) {
        ctx.font = "32px Arial";
        ctx.fillStyle = "gray";
        ctx.textAlign = "center";
        ctx.fillText(
            "Waiting for all players to connect...",
            canvas.width / 2,
            canvas.height / 2
        );
        return; // exit early, no ball or paddles
    }

    // Spectator view (all players connected)
    if (isSpectator) {
        // Draw ball
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = "black";
        ctx.fill();

        // Draw paddles
        for (const key in state.paddles) {
            const y = state.paddles[key];
            let x;
            if (key.startsWith("left_player")) x = 1;
            else if (key.startsWith("right_player")) x = canvas.width - paddleWidth - 1;
            else continue;
            ctx.fillStyle = "black";
            ctx.fillRect(x, y, paddleWidth, paddleHeight);
        }
        return; // spectators don't see countdown
    }

    // Player view
    if (!state.gameStarted && state.countdown > 0) {
        // Show countdown only to players
        const remaining = Math.ceil(state.countdown / 60);
        ctx.font = "48px Arial";
        ctx.fillStyle = "gray";
        ctx.textAlign = "center";
        ctx.fillText(`Game starts in ${remaining}...`, canvas.width / 2, canvas.height / 2);
        return;
    }

    // Draw ball
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();

    // Draw paddles
    for (const key in state.paddles) {
        const y = state.paddles[key];
        let x;
        if (key.startsWith("left_player")) x = 1;
        else if (key.startsWith("right_player")) x = canvas.width - paddleWidth - 1;
        else continue;
        ctx.fillStyle = "black";
        ctx.fillRect(x, y, paddleWidth, paddleHeight);
    }
}


// Create basic UI elements
function createUI() {
	const roleText = document.createElement("h1");
	roleText.id = "roleText";
	roleText.textContent = "Connecting...";
	document.body.appendChild(roleText);

	const scoreText = document.createElement("h2");
	scoreText.id = "scoreText";
	scoreText.textContent = "Score: 0 - 0";
	document.body.appendChild(scoreText);

	const canvas = document.createElement("canvas");
	canvas.id = "game";
	canvas.width = Math.min(window.innerWidth * 0.9, 600); //set fixed size (600)
	canvas.height = Math.min(window.innerHeight * 0.7, 400); //set fixed size(400)
	canvas.style.border = "5px solid black";
	document.body.appendChild(canvas);

	const chatBox = document.createElement("div");
	chatBox.id = "chatBox";
	chatBox.style.width = "600px";
	chatBox.style.height = "200px";
	chatBox.style.overflowY = "auto";
	chatBox.style.border = "2px solid gray";
	chatBox.style.marginTop = "10px";
	chatBox.style.padding = "5px";
	document.body.appendChild(chatBox);

	// Chat input
	const chatInput = document.createElement("input");
	chatInput.id = "chatInput";
	chatInput.type = "text";
	chatInput.placeholder = "Type a message and press Enter...";
	chatInput.style.width = "600px";
	chatInput.style.marginTop = "5px";
	document.body.appendChild(chatInput);
}
