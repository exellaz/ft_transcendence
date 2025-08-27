// src/connection.ts
function draw_container(state: any) {
	let ctx: CanvasRenderingContext2D;
	const PADDLE_HEIGHT = 80;

	const canvas = document.getElementById("game") as HTMLCanvasElement;
	if (!canvas) throw new Error("Canvas not found!");
	ctx = canvas.getContext("2d")!;
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

	// ball
	ctx.beginPath();
	ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
	ctx.fill();

	// paddles
	ctx.fillRect(1, state.paddles.left, 10, PADDLE_HEIGHT);
	ctx.fillRect(canvas.width - 11, state.paddles.right, 10, PADDLE_HEIGHT);
}

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
	canvas.width = Math.min(window.innerWidth * 0.9, 600);  // 90% of window or max 600
	canvas.height = Math.min(window.innerHeight * 0.7, 400); // 70% of window or max 400
	canvas.style.border = "0.5px solid black";
	document.body.appendChild(canvas);
}

function generateUUID() {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (crypto.getRandomValues(new Uint8Array(1))[0] % 15) >> 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function startConnection() {
	createUI();

	// generate the clientID follow by the same tab in browser
	let clientID = sessionStorage.getItem("clientID");
	if (!clientID) {
		clientID = generateUUID(); // generate a new UUID
		sessionStorage.setItem("clientID", clientID); // persist it for this tab~
	}

	//const socket = new WebSocket("ws://localhost:4242");
    const socket = new WebSocket(`ws://${window.location.hostname}:4242`); //set it to the same host as the webpage
	let role = "spectator";
	const roleText = document.getElementById("roleText")!;
	const scoreText = document.getElementById("scoreText")!;
	const canvas = document.getElementById("game") as HTMLCanvasElement;

	// --- CONNECTED TO SERVER ---
	socket.onopen = () => {
			console.log("WebSocket connected");
			// Send the clientID to the server so it knows this is a reconnect
			socket.send(JSON.stringify({ type: "connect", clientID }));
			// Send the canvas height to the server
			if (canvas) {
				socket.send(JSON.stringify({ type: "setHeight", height: canvas.height }));
				socket.send(JSON.stringify({ type: "setWidth", width: canvas.width }));
			}
	};

	// --- ERROR FROM SERVER ---
	socket.onerror = (err) => console.error("WebSocket error:", err);

	// --- DISCONNECTED FROM SERVER ---
	socket.onclose = () => console.log("WebSocket closed");

	// --- MESSAGE FROM SERVER ---
  	socket.onmessage = (event) => {
  	  try {
  		const data = JSON.parse(event.data);
		console.log("Received from server:", data);

		// --- ASSIGN ROLE ---
		if (data.type === "role") {
		  role = data.role;
		  roleText.textContent =
			role === "player1" ? "Player 1" : role === "player2" ? "Player 2" : "Spectator";
		}

		// --- GAME STATE UPDATE ---
  		if (data.type === "state") {
			draw_container(data.gameState);
			scoreText.textContent = `Score: ${data.gameState.score.left} - ${data.gameState.score.right}`;
		}
  	  } catch (err) {
  		console.error("Invalid JSON from server:", event.data);
  	  }
  	};

	// key tracking
	const keys = { up: false, down: false };
	window.addEventListener("keydown", e => {
	  if (role === "spectator") return;
	  if (e.key === "ArrowUp") keys.up = true;
	  if (e.key === "ArrowDown") keys.down = true;
	});
	window.addEventListener("keyup", e => {
	  if (role === "spectator") return;
	  if (e.key === "ArrowUp") keys.up = false;
	  if (e.key === "ArrowDown") keys.down = false;
	});

	// send movement to server
	setInterval(() => {
	  if (role === "spectator") return;
	  if (keys.up) socket.send(JSON.stringify({ type: "move", role, dy: -10 }));
	  if (keys.down) socket.send(JSON.stringify({ type: "move", role, dy: 10 }));
	}, 60);
}
