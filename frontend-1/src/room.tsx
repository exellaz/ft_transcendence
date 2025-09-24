import { ensureClientId } from "./utils";
import Game from "./game";
import Chat from "./chat";
import { useBlockLeave } from "./useBlockLeave.tsx";
import RoomSettingsForm from "./gameSetting.tsx";
import { useRoomWebSocket } from "./room-websocket.ts";


/************************************** Room Component **************************************/
/**
 * @brief Main Room component
 * @param roomId ID of the room
 * @param roomName Name of the room
 * @param leaderId ID of the room leader
 * @param onBack Callback function to handle back to lobby
*/
export default function Room({
		roomId,
		roomName,
		leaderId,
		onBack
}: {
		roomId: string;
		roomName: string;
		leaderId: string;
		onBack: () => void;
}) {
		//prevent accidental refresh or leave
		useBlockLeave();
		// use custom hook to manage room websocket and state
		const {
				socket,
				statusText,
				playerText,
				leftTeamHtml,
				rightTeamHtml,
				isLeader,
				role,
				ready,
				setReady,
				gameStarted,
				canStart,
		} = useRoomWebSocket({ roomId, roomName, leaderId });

	// Buttons
	function onSwitch() {
		//if already ready or no socket, do nothing
		if (ready || !socket) return;
		//switch side
		const newSide = role.startsWith("left") ? "right" : "left";
		//send switch side command to server
		socket.send(JSON.stringify({ type: "switchSide", side: newSide }));
	}

	function onReady() {
		//if is leader or no socket, do nothing
		if (isLeader || !socket) return;
		//toggle ready status
		const newReady = !ready;
		setReady(newReady);
		//send ready command to server
		socket.send(JSON.stringify({ type: "ready", ready: newReady }));
	}

	function onStartBtn() {
		//if not leader or no socket, do nothing
		if (!isLeader || !socket) { alert("Only the leader can start the game!"); return; }
		//send start command
		socket.send(JSON.stringify({ type: "start", start: true }));
	}

	function onLeave() {
		//close socket and go back to lobby
		try { socket?.close(); } catch {}
		sessionStorage.removeItem("pongRoomName");
		sessionStorage.removeItem("pongRoomId");
		onBack();
	}

	// if game started, render Game component
	if (gameStarted) {
		return <Game
			roomId={roomId}
			roomName={roomName}
			clientId={sessionStorage.getItem("pongClientId")||ensureClientId()}
			initialRole={role}
			playerName={sessionStorage.getItem("pongPlayerName") || "Guest"}
			onBack={onBack}
		/>;
	}

	return (
		<div className="p-6">
			<h2 id="lobbyStatus" className="text-2xl">{statusText}</h2>
			<h3 id="playerStatus">{playerText}</h3>

			<div id="teamsContainer" className="flex justify-between my-4">
				<div id="leftTeam" className="w-1/2 p-2 border rounded"><strong>Left Team</strong><pre>{leftTeamHtml}</pre></div>
				<div id="rightTeam" className="w-1/2 p-2 border rounded ml-4"><strong>Right Team</strong><pre>{rightTeamHtml}</pre></div>
			</div>

			<div className="space-x-2">
				{/* if is player */}
				{role !== "spectator" && (
					<>
						{/* Switch Side Button */}
						<button
							onClick={onSwitch}
							className={`px-2 py-1 border rounded ${ready ? "text-gray-400 border-gray-300 cursor-not-allowed" : "text-black border-black"}`}
							disabled={ready}
						>
							Switch Side
						</button>

						{/* Ready/Unready Button */}
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

				{/* Start Game Button only for leader*/}
				{isLeader && (
					<button
						onClick={onStartBtn}
						className={`px-2 py-1 border rounded ${!canStart ? "text-gray-400 border-gray-300 cursor-not-allowed" : "text-black border-black"}`}
						disabled={!canStart}
					>
						Start Game
					</button>
				)}

				{/* Leave Room Button */}
				<button
					onClick={onLeave}
					className="px-2 py-1 border"
				>
					Leave Room
				</button>
			</div>

			{/* Chat Component */}
			<Chat roomId={roomId} />

            <RoomSettingsForm roomId={roomId} isLeader={isLeader}/>
		</div>
	);
}
