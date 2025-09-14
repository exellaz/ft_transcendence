import { useEffect, useRef, useState } from "react";
import { ensureClientId, roomSetting, determineSide } from "./utils";
import { BALLSPEED, PADDLEHEIGHT, PADDLEWIDTH, BALLSIZE } from "./constants";
import Game from "./game";
import Chat from "./chat";

export default function Room({ roomId, roomName, leaderId, onBack }: { roomId:string; roomName:string; leaderId:string; onBack:()=>void }) {
	const [statusText, setStatusText] = useState("Connecting to room...");
	const [playerText, setPlayerText] = useState("Waiting for players...");
	const [leaderText, setLeaderText] = useState("waiting for leader...");
	const [leftTeamHtml, setLeftTeamHtml] = useState("waiting left team...");
	const [rightTeamHtml, setRightTeamHtml] = useState("waiting right team...");
	const [isLeader, setIsLeader] = useState(false);
	const [role, setRole] = useState<string>("spectator");
	const [ready, setReady] = useState(false);
	const [gameStarted, setGameStarted] = useState(false);
	const [canStart, setCanStart] = useState(false);
	const [socket, setSocket] = useState<WebSocket | null>(null);
	const beforeUnload = useRef<(e:BeforeUnloadEvent)=>any>(()=>{});

	useEffect(()=>{ensureClientId();}, []);

	useEffect(() => {
		// initialize room connection for player join
		async function init() {
			const clientId = sessionStorage.getItem("pongClientId") || ensureClientId();
			await roomSetting(roomId, BALLSPEED, PADDLEHEIGHT, PADDLEWIDTH, BALLSIZE); // set all room settings
			let roleLocal = clientId === leaderId ? "left_player1" : "spectator"; // if the player is the leader, assign left_player1 role
			setRole(roleLocal);
			setIsLeader(clientId === leaderId);

			// determine which side to join
			const chooseSide = await determineSide(roomId);
			const ws = new WebSocket(`ws://${window.location.hostname}:4242/ws?id=${clientId}&room=${roomId}&side=${chooseSide}`);
			setSocket(ws);

			ws.onopen = () => console.log("Connected to room lobby");

			ws.onmessage = (ev) => {
				const data = JSON.parse(ev.data);
				if (data.type === "roleUpdate") {
					console.log("Role update:", data);
					setStatusText(`Room: ${roomName} [${roomId}]`);

					//check which role for player
					const leftPlayer = data.gameState.teams.left.find((p:any)=>p.clientId === clientId);
					const rightPlayer = data.gameState.teams.right.find((p:any)=>p.clientId === clientId);
					const newRole = leftPlayer?.role || rightPlayer?.role || "spectator";
					setRole(newRole);
					setPlayerText(`You are: [${clientId}] (${newRole})`);

					// update left and right team display
					setLeftTeamHtml( data.gameState.teams.left.map((p:any)=>`${p.clientId} (${p.role})`).join("\n") );
					setRightTeamHtml( data.gameState.teams.right.map((p:any)=>`${p.clientId} (${p.role})`).join("\n") );

					//check leader status
					if (data.leaderId) {
						leaderId = data.leaderId; // mutate local arg (safe here)
						setIsLeader(clientId === data.leaderId);
						setLeaderText(clientId === data.leaderId ? "leader: yes" : "leader: no");
					}

					//update canStart status
					setCanStart(data.canStart ?? false);
				}

				if (data.type === "state") {
					// update canStart status
					setCanStart(data.canStart ?? false);

					// if game started, transition to Game component
					if (!gameStarted && (data.gameState.countdown > 0 || data.gameState.gameStarted)) {
						setGameStarted(true);
						// transition to Game component by calling onBack -> but we will render Game inline
						// to preserve single-socket, we hand off ws and role
					}
				}
			};

			ws.onclose = () => console.log("Lobby socket closed");
			ws.onerror = (e) => console.error("Lobby socket error", e);

			// event handlers
			const keyhandler = (e:KeyboardEvent) => {
				// disable F5 and Ctrl+R / Cmd+R
				if (e.key === "F5" || ((e.ctrlKey||e.metaKey)&& e.key.toLowerCase()==="r")) { e.preventDefault(); return; }
			};
			// prevent context menu
			const disableContextMenu = (e:Event)=>e.preventDefault();

			window.addEventListener("contextmenu", disableContextMenu);
			window.addEventListener("beforeunload", beforeUnload.current = (e)=>{ e.preventDefault(); e.returnValue = "Are you sure you want to leave the room?"; return e.returnValue; });
			window.addEventListener("keydown", keyhandler);

			return () => {
			//if socket closes, clean up event listeners
			try{ ws.close(); }catch{};
			window.removeEventListener("contextmenu", disableContextMenu);
			window.removeEventListener("beforeunload", beforeUnload.current as any);
			window.removeEventListener("keydown", keyhandler);
			};
		}
		init();
	}, []);

	// Buttons
	function onSwitch() {
		//if already ready or no socker, then can't switch
		if (ready || !socket) return;
		//if is left -> right, else right -> left
		const newSide = role.startsWith("left") ? "right" : "left";
		// send new side to server
		socket.send(JSON.stringify({ type: "switchSide", side: newSide }));
	}

	function onReady() {
		// if is leader or no socket, can't ready
		if (isLeader || !socket) return;
		// toggle ready state
		const newReady = !ready;
		//set it ready and send to server
		setReady(newReady);
		socket.send(JSON.stringify({ type: "ready", ready: newReady }));
	}

	function onStartBtn() {
		// if is not leader or no socket, can't start
		if (!isLeader || !socket) { alert("Only the leader can start the game!"); return; }
		// send start command to server
		socket.send(JSON.stringify({ type: "start" }));
	}

	function onLeave() {
		// close socket and clean up and back to lobby
		try { socket?.close(); } catch {}
		sessionStorage.removeItem("pongRoomName");
		sessionStorage.removeItem("pongRoomId");
		onBack();
	}

	// if game started, render Game component
	if (gameStarted && socket) {
		return <Game
					roomId={roomId}
					roomName={roomName}
					socket={socket}
					clientId={sessionStorage.getItem("pongClientId")||ensureClientId()}
					initialRole={role}
					onBack={onBack}
				/>;
	}

	return (
		<div className="p-6">
			<h2 id="lobbyStatus" className="text-2xl">{statusText}</h2>
			<h3 id="playerStatus">{playerText}</h3>
			<h4 id="leaderStatus">{leaderText}</h4>

			<div id="teamsContainer" className="flex justify-between my-4">
				<div id="leftTeam" className="w-1/2 p-2 border rounded"><strong>Left Team</strong><pre>{leftTeamHtml}</pre></div>
				<div id="rightTeam" className="w-1/2 p-2 border rounded ml-4"><strong>Right Team</strong><pre>{rightTeamHtml}</pre></div>
			</div>

			<div className="space-x-2">
				{role !== "spectator" && (
					<>
						<button
							onClick={onSwitch}
							className={`px-2 py-1 border rounded ${ready ? "text-gray-400 border-gray-300 cursor-not-allowed" : "text-black border-black"}`}
							disabled={ready}
						>
							Switch Side
						</button>

						{!isLeader && (
							<button
								onClick={onReady}
								className="px-2 py-1 border"
							>
								{ready ? "Unready" : "Ready"}
							</button>
						)}
					</>
				)}

				{isLeader && (
					<button
						onClick={onStartBtn}
						className={`px-2 py-1 border rounded ${!canStart ? "text-gray-400 border-gray-300 cursor-not-allowed" : "text-black border-black"}`}
						disabled={!canStart}
					>
						Start Game
					</button>
				)}

				<button
					onClick={onLeave}
					className="px-2 py-1 border"
				>
					Leave Room
				</button>
			</div>

			<Chat />
		</div>
	);
}
