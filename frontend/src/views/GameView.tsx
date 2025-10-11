import React, { useState, useParams, useRef, useEffect } from "react";
import { useTranslation, withSSR } from "react-i18next";
import Background from "../components/Background";
import TournamentHeader from "../components/TournamentHeader";
import { getUserById } from "../lib/usersApiClient";
import { useGameRoomWebSocket, useGameWebSocket } from "../lib/game-websocket";
import { useBlockLeave } from "../utils/blockRefresh";
import { useUser } from "../context/UserProvider";
import { useNavigate } from "react-router-dom";
import Button from "@/components/Button";
import { GameClient } from "./Gameclient";
import { useLocation } from "react-router-dom";
import { PongGame } from "@shared/game/pong";
import { Viewport } from "@shared/objects/Viewport";
import { Player } from "@shared/game/Player";
import { ImageObject } from "@shared/objects/ImageObject";
import type { GameObject } from "@shared/objects/GameObject";

interface GameViewProps {
  mode?: "local" | "remote"; // or 'multiplayer' vs 'singleplayer', etc.
}



const GameView: React.FC<GameViewProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useBlockLeave();
  const { t } = useTranslation();
  const translate = (key: string) => t(`GameView.${key}`);
  const [stage, setStage] = useState<"quarterfinals" | "semifinals" | "finals">(
    "quarterfinals",
  );
  const { user } = useUser();
  const [userInfo, setUserInfo] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const mode = location.pathname === "/local-game-view" ? "local" : "remote";


  if (mode === "remote") {
    // TODO: Replace with actual JWT
    // console.log("useUser() returned:", user);
    // if (!user) {
    // 	console.log("user not loaded"); ////debug
    // 	return;
    // }
    // Fetch user info when the component mounts
    React.useEffect(() => {
  
    console.log("mode used: ", mode);
  
      if (!user) return; // Ensure `user` is available
  
      const fetchUserInfo = async () => {
        try {
          const response = await getUserById({ id: Number(user.id) }); // Call the API
          if (response.success && response.data) {
            setUserInfo(response.data); // Store the user info
          } else {
            console.log("Failed to fetch user info"); // Handle API error
          }
        } catch (err) {
          console.error("Error fetching user info:", err);
          console.error("An error occurred while fetching user info"); // Handle fetch error
        }
      };
  
      fetchUserInfo();
    }, [user]);
  
    // console.log("user loaded", user); ////debug
    const roomId = Number(sessionStorage.getItem("RoomId") || "1");
    const roomName = sessionStorage.getItem("RoomName") || "Room 1";
    const clientId = userInfo?.id;
    const playerName = userInfo?.username;
    const playerSprite = userInfo?.avatarUrl || "default.png";
    const initialRole = sessionStorage.getItem("playerSide") || "";
  
    // -------------------------------- Websockets --------------------------------
  
    const params = {
      roomId,
      roomName,
      clientId,
      initialRole,
      playerName,
      playerSprite,
      callback: () => { },
    };
  
    const { socket } = useGameWebSocket(params);
    const { gameOver } = useGameRoomWebSocket(params);
  
    useEffect(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
  
      if (socket.readyState !== WebSocket.OPEN) {
        socket.onopen = () => {
          let gameClient = new GameClient(canvasRef.current, socket);
          gameClient.start();
        };
        return;
      }
      let gameClient = new GameClient(canvasRef.current, socket);
  
      gameClient.start();
      return () => {
        gameClient.destroy(); // ✅ cleanup
      };
    }, [socket]);

    return (
      <Background variant="plain">
        <div className="w-full h-full flex-col-center gap-10 px-25">
          <TournamentHeader>
            {stage.charAt(0).toUpperCase() + stage.slice(1)} Match
          </TournamentHeader>
          <div className="w-full h-[500px] flex-col-center border-4 border-yellow-400 text-white text-9xl text-center">
            <canvas ref={canvasRef} width={880} height={500} className="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800"
            />
          </div>
          {gameOver && (
            <div>
              <Button
                variant="bigYellow"
                className="px-3 py-4 text-2xl"
                onClick={() => {
                  navigate("/main-menu");
                  sessionStorage.removeItem("playerSide");
                  sessionStorage.removeItem("RoomId");
                  sessionStorage.removeItem("RoomLeaderId");
                  sessionStorage.removeItem("RoomName");
                  sessionStorage.removeItem("RoomType");
                }}
              >
                Back to Lobby
              </Button>
            </div>
          )}
        </div>
      </Background>
    );
  }

  else if (mode === "local") {
    const location = useLocation();
    const state = location.state

    console.log("state", state);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const viewport = new Viewport({
        ctx,
        width: canvas.width,
        height: canvas.height,
      });

      const game = new PongGame(false, {}, () => { }, 1);

      game.updateSettings(location.state.gameSettings);

      game.addPlayer(
        new Player({
          team: 0,
          name: "Player1",
          id: 0,
        })
      );

      game.addPlayer(
        new Player({
          team: 1,
          name: "Player2",
          id: 1,
        })
      );

      // --- ✅ Track pressed keys for smooth motion ---
      const keysPressed = new Set<string>();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (["w", "s", "ArrowUp", "ArrowDown"].includes(event.key)) {
          keysPressed.add(event.key);
        }
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        keysPressed.delete(event.key);
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      function updateObjectClient(obj: GameObject) {
        obj.clientUpdate();
        for (const children of obj.children) {
          updateObjectClient(children);
        }
      }

      // --- 🎮 Game Loop ---
      function loop() {
        // Move based on held keys
        if (keysPressed.has("w")) {
          game.movePaddle("ArrowUp", 0);
        }
        if (keysPressed.has("s")) {
          game.movePaddle("ArrowDown", 0);
        }
        if (keysPressed.has("ArrowDown")) {
          game.movePaddle("ArrowDown", 1);
        }
        if (keysPressed.has("ArrowUp")) {
          game.movePaddle("ArrowUp", 1);
        }

        // Update and render
        game.update({});
        viewport.ctx.clearRect(0, 0, viewport.width, viewport.height);
        viewport.ctx.fillStyle = "#000000";
        viewport.ctx.fillRect(0, 0, viewport.width, viewport.height);

        const renderList = Array.from(game.world.gameObjects.values()).sort(
          (a, b) => a.zIndex - b.zIndex
        );
        for (const obj of renderList) {
          updateObjectClient(obj);
          obj.draw(viewport);            
        }

        requestAnimationFrame(loop);
      }

      loop();

      // --- 🧹 Cleanup ---
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, []);

    return (
      <Background variant="plain">
        <div className="w-full h-full flex-col-center gap-10 px-25">
          <TournamentHeader>
            {stage.charAt(0).toUpperCase() + stage.slice(1)} Match
          </TournamentHeader>
          <div className="w-full h-[500px] flex-col-center border-4 border-yellow-400 text-white text-9xl text-center">
            <canvas ref={canvasRef} width={880} height={500} className="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800"
            />
          </div>
          {/* ✅ Back to Lobby Button */}
          <div>
            <Button
              variant="bigYellow"
              className="px-3 py-4 text-2xl"
              onClick={() => {
                navigate("/main-menu");
                sessionStorage.removeItem("playerSide");
                sessionStorage.removeItem("RoomId");
                sessionStorage.removeItem("RoomLeaderId");
                sessionStorage.removeItem("RoomName");
                sessionStorage.removeItem("RoomType");
              }}
            >
              Back to Lobby
            </Button>
          </div>
        </div>
      </Background>
    );
  }

};

export default GameView;
