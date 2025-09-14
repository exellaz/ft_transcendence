import { useEffect, useRef, useState } from "react";
import { BASE_WIDTH, BASE_HEIGHT, PADDLEWIDTH, PADDLEHEIGHT, BALLSIZE } from "./constants";
import Chat from "./chat";

/**
 * @brief Draw the game state on the canvas
 * @param canvas The canvas element
 * @param state The game state
 * @param isSpectator Whether the current user is a spectator
 * @param winner The winner of the game, if any
 */
function draw_container(canvas: HTMLCanvasElement | null, state: any, isSpectator?: boolean, winner: string | null = null) {
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const paddleWidth = PADDLEWIDTH;
	const paddleHeight = PADDLEHEIGHT;
	const ballSize = BALLSIZE;

	ctx.clearRect(0,0,canvas.width, canvas.height);

	//if game over, show winner
	if (winner) {
		ctx.font = "48px Arial";
		ctx.fillStyle = "green";
		ctx.textAlign = "center";
		ctx.fillText(`Player ${winner} wins!`, canvas.width/2, canvas.height/2);
		return;
	}

	const leftPlayers = state.teams.left.length;
	const rightPlayers = state.teams.right.length;
	const allPlayersConnected = (leftPlayers === 2 && rightPlayers === 2) || (leftPlayers ===1 && rightPlayers ===1 && leftPlayers + rightPlayers === 2);

	// if paused, show paused message
	if (state.paused) {
		ctx.font = "48px Arial";
		ctx.fillStyle = "red";
		ctx.textAlign = "center";
		ctx.fillText(`Game Paused`, canvas.width/2, canvas.height/2);
		//if countdown was running, show where it stopped
		if (!state.gameStarted && state.countdown > 0) {
			const remaining = Math.ceil(state.countdown/60);
			ctx.font = "32px Arial";
			ctx.fillStyle = "gray";
			ctx.fillText(`Countdown stopped at ${remaining}`, canvas.width/2, canvas.height/2 + 50);
		}
		return;
	}

	// countdown before game starts
	if (!state.gameStarted && state.countdown > 0) {
		const remaining = Math.ceil(state.countdown/60);
		ctx.font = "48px Arial";
		ctx.fillStyle = "gray";
		ctx.textAlign = "center";
		ctx.fillText(`Game starts in ${remaining}...`, canvas.width/2, canvas.height/2);
		return;
	}

	// if not all players entered, show waiting message
	if (!allPlayersConnected && !state.gameStarted) {
		ctx.font = "32px Arial";
		ctx.fillStyle = "gray";
		ctx.textAlign = "center";
		ctx.fillText("Waiting for all players to connect...", canvas.width/2, canvas.height/2);
		return;
	}

	const scaleX = canvas.width / 800;
	const scaleY = canvas.height / 400;

	//spectator view
	if (isSpectator) {
		ctx.beginPath();
		ctx.arc(state.ball.x * scaleX, state.ball.y * scaleY, ballSize * scaleX, 0, Math.PI * 2);
		ctx.fillStyle = "black";
		ctx.fill();

		for (const clientId in state.paddles) {
			const y = state.paddles[clientId];
			let x: number;
			if (state.teams.left.some((p:any)=>p.clientId === clientId)) {
				x = 1 * scaleX;
			} else if (state.teams.right.some((p:any)=>p.clientId === clientId)) {
				x = canvas.width - paddleWidth * scaleX - 1;
			} else continue;
			ctx.fillStyle = "black";
			ctx.fillRect(x, y*scaleY, paddleWidth * scaleX, paddleHeight * scaleY);
		}
		return;
	}

	// Draw ball
	ctx.beginPath();
	ctx.arc(state.ball.x * scaleX, state.ball.y * scaleY, ballSize * scaleX, 0, Math.PI * 2);
	ctx.fillStyle = "black";
	ctx.fill();

	// Draw paddles
	for (const clientId in state.paddles) {
		const y = state.paddles[clientId];
		let x: number;
		if (state.teams.left.some((p:any)=>p.clientId === clientId)) {
			x = 1 * scaleX;
		} else if (state.teams.right.some((p:any)=>p.clientId === clientId)) {
			x = canvas.width - paddleWidth * scaleX - 1;
		} else continue;
		ctx.fillStyle = "black";
		ctx.fillRect(x, y*scaleY, paddleWidth * scaleX, paddleHeight * scaleY);
	}
}

export default function Game({ roomId, roomName, socket, clientId, initialRole, onBack } : { roomId:string; roomName:string; socket:WebSocket; clientId:string; initialRole:string; onBack:()=>void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [role, setRole] = useState(initialRole);
  const [scoreText, setScoreText] = useState("Score: 0 - 0");
  const [statusText, setStatusText] = useState(`Room: ${roomName}`);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const keysRef = useRef({ up:false, down:false });
  const [isSpectator, setIsSpectator] = useState(false);

  useEffect(()=>{
    // init UI
    const canvas = canvasRef.current!;
    function createUI() {
      canvas.width = Math.min(window.innerWidth / (BASE_WIDTH/BASE_WIDTH), 1) * BASE_WIDTH;
      canvas.height = Math.min(window.innerHeight / (BASE_HEIGHT/BASE_HEIGHT), 1) * BASE_HEIGHT;
      canvas.style.border = "5px solid black";
    }
    createUI();
  }, []);

  useEffect(() => {
    // send room size once open
    const onOpen = () => {
      const scale = Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT, 1);
      const scaledWidth = BASE_WIDTH * scale;
      const scaledHeight = BASE_HEIGHT * scale;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "setWidth", width: scaledWidth }));
        socket.send(JSON.stringify({ type: "setHeight", height: scaledHeight }));
        console.log(`send room size: ${scaledWidth}x${scaledHeight}`);
      }
    };
    socket.addEventListener("open", onOpen);
    return () => socket.removeEventListener("open", onOpen);
  }, [socket]);

  useEffect(() => {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (!gameOver && isSpectator === true) {
        e.preventDefault();
        e.returnValue = "Game in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    const keyhandler = (e: KeyboardEvent) => {
      if (!gameOver) {
        if (e.key === "F5" || ((e.ctrlKey||e.metaKey)&& e.key.toLowerCase()==="r")) { e.preventDefault(); return; }
        if (role !== "spectator") {
          if (e.type === "keydown") {
            if (e.key === "ArrowUp") keysRef.current.up = true;
            if (e.key === "ArrowDown") keysRef.current.down = true;
          }
          if (e.type === "keyup") {
            if (e.key === "ArrowUp") keysRef.current.up = false;
            if (e.key === "ArrowDown") keysRef.current.down = false;
          }
        }
      }
    };
    const disableContextMenu = (e:Event)=>e.preventDefault();

    window.addEventListener("contextmenu", disableContextMenu);
    window.addEventListener("beforeunload", beforeUnloadHandler);
    window.addEventListener("keydown", keyhandler);
    window.addEventListener("keyup", keyhandler);

    return () => {
      window.removeEventListener("contextmenu", disableContextMenu);
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      window.removeEventListener("keydown", keyhandler);
      window.removeEventListener("keyup", keyhandler);
    };
  }, [gameOver, role]);

  useEffect(() => {
    // handle messages
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "roleUpdate") {
        	// console.log("Role update from game:", data);

			// determine role from state
			const leftPlayer = data.gameState.teams.left.find((p:any)=>p.clientId === clientId);
			const rightPlayer = data.gameState.teams.right.find((p:any)=>p.clientId === clientId);
			const newRole = leftPlayer?.role || rightPlayer?.role || "spectator";
			console.log("roleUpdate handler:", {
				clientId,
				left: data.gameState.teams.left,
				right: data.gameState.teams.right,
				detectedRole: newRole
			});
        	setRole(newRole);
        	setIsSpectator(newRole === "spectator");
        }

        if (data.type === "state") {
        //   console.log("Game state update:", data);

		  const gameWinner = data.gameState.result?.winner || null;
          if (gameWinner && !gameOver) {
            console.log("Game Over. Winner:", gameWinner);
            setGameOver(true);
            setWinner(gameWinner);
          }

          setStatusText(`Room: ${roomName} | Role: ${role}`);
          setScoreText(`Score: ${data.gameState.score.left} - ${data.gameState.score.right}`);
		  setIsSpectator(role === "spectator");

          // draw
          draw_container(canvasRef.current!, data.gameState, data.isSpectator, gameWinner);
        }
      } catch (err) {
        console.error("Invalid JSON from server:", event.data);
      }
    };

    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, clientId, role, gameOver, winner]);

  // send key presses 60FPS
  useEffect(()=>{
    const id = window.setInterval(()=>{
      if (role !== "spectator" && !gameOver && socket && socket.readyState === WebSocket.OPEN) {
        if (keysRef.current.up) socket.send(JSON.stringify({ type: "move", role, dy: -10 }));
        if (keysRef.current.down) socket.send(JSON.stringify({ type: "move", role, dy: 10 }));
      }
    }, 1000/60);
    return () => clearInterval(id);
  }, [role, gameOver, socket]);

  function handleBack() {
	if (role !== "spectator" && !gameOver) {
		const confirmLeave = window.confirm(
			"The game is still in progress. Are you sure you want to leave?"
		);
		if (!confirmLeave) return;
	}

    // Called when user wants to go back to lobby
    try { socket.close(); } catch {}
    sessionStorage.removeItem("pongRoomName");
    sessionStorage.removeItem("pongRoomId");
    onBack();
  }

  return (
    <div className="p-4 text-center">
      <h1 id="roleText">{statusText}</h1>
      <h2 id="scoreText">{scoreText}</h2>
      <canvas id="game" ref={canvasRef} className="mx-auto block" width={BASE_WIDTH} height={BASE_HEIGHT} />
      <div className="mt-4">
		{(isSpectator || gameOver) && (
			<button id="backLobbyBtn" onClick={handleBack} className="px-3 py-1 border">Back to Lobby</button>
		)}
      </div>
      <Chat />
    </div>
  );
}
