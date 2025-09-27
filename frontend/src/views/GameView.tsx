import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import TournamentHeader from "../components/TournamentHeader";
import { useGameWebSocket, draw_container } from "./game-websocket";

const GameView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`GameView.${key}`);
  const [stage, setStage] = useState<"quarterfinals" | "semifinals" | "finals">("quarterfinals");
  const navigate = useNavigate();

  const roomId = sessionStorage.getItem("pongRoomId") || "t1";
  const roomName = sessionStorage.getItem("pongRoomName") || "Room 1";
  const playerInfo = JSON.parse(sessionStorage.getItem("playerInfo") || '{}');
  const clientId = playerInfo.id;
	const playerName = playerInfo.name;
	const playerSprite = playerInfo.sprite;
	const initialRole = sessionStorage.getItem("playerSide") || "";
	console.log("GameView - playerInfo:", playerInfo);
	console.log("GameView - initialRole:", initialRole);

  const {
    socket,
	  role,
	  gameOver,
	  playerResult,
	  isSpectator,
	  gameState,
    setting,
	  //winner,
	  scoreText,
	  statusText,
	  settingView,
   } = useGameWebSocket({
      roomId,
      roomName,
      clientId,
      initialRole,
      playerName,
      playerSprite
  });

  //canvas and key
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef({ up: false, down: false });

  //draw
  useEffect(() => {
    if (gameState) {
      draw_container(canvasRef.current!, { ...gameState, setting }, isSpectator, playerResult);
    }
  }, [gameState, setting, isSpectator, playerResult]);

  // key handling
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameOver || role === "spectator") return;
      if (e.type === "keydown") {
        if (e.key === "ArrowUp") keysRef.current.up = true;
        if (e.key === "ArrowDown") keysRef.current.down = true;
      }
      if (e.type === "keyup") {
        if (e.key === "ArrowUp") keysRef.current.up = false;
        if (e.key === "ArrowDown") keysRef.current.down = false;
      }
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", handler);
    };
  }, [gameOver, role]);

  // send keypresses
  useEffect(() => {
    const interval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN && !gameOver && role !== "spectator") {
        const speed = setting?.paddleSpeed || 5;
        if (keysRef.current.up) socket.send(JSON.stringify({ type: "move", role, dy: -speed }));
        if (keysRef.current.down) socket.send(JSON.stringify({ type: "move", role, dy: speed }));
      }
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [socket, gameOver, role, setting]);

  return (
    <Background variant="plain">
      <div className="w-full h-full flex-col-center gap-10 px-25">
        <TournamentHeader>
          {stage.charAt(0).toUpperCase() + stage.slice(1)} Match
          <p className="text-xs">{statusText}</p>
          <p className="text-xs">{scoreText}</p>
          <p className="text-xs">{settingView}</p>
        </TournamentHeader>
        <div className="mx-auto block w-full h-auto max-w-[800px] max-h-[400px] border-4 bg-white border-black aspect-[2/1]">
          {/* game image */}
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="mx-auto block w-full h-auto max-w-[800px] max-h-[400px] border-4 border-black aspect-[2/1]"
          />
        </div>
          {/* button to exit game */}
          {(isSpectator || gameOver) && (
            <button
              onClick={() => navigate("/main-menu")}
              className="mt-4 px-3 py-1 border bg-yellow-400 text-black hover:bg-yellow-500 transition"
            >
              Back to Lobby
            </button>
          )}
      </div>
    </Background>
  );
};
export default GameView;
