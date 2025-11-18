import React, { useState, useRef, useEffect } from "react";
import Background from "../components/Background";
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
import type { GameObject } from "@shared/objects/GameObject";

interface GameViewProps {
  mode?: "local" | "remote"; // or 'multiplayer' vs 'singleplayer', etc.
}

const SKIN_MAPPING: Record<string, number> = {
  "/assets/yellow-ghost.png": 0,
  "/assets/green-ghost.png": 1,
  "/assets/blue-ghost.png": 2,
  "/assets/red-ghost.png": 3,
  "/assets/purple-ghost.png": 4,
  "/assets/starry-ghost.png": 5,
  "/assets/white-ghost.png": 6,
  "/assets/42-ghost.png": 7,
};

const GameView: React.FC<GameViewProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useBlockLeave();

  const { user } = useUser();
  const [userInfo, setUserInfo] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const mode = sessionStorage.getItem("gameMode");
  
  let round = 0;

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
    const playerSprite = sessionStorage.getItem("playerSprite");
    const initialRole = sessionStorage.getItem("playerSide") || "";

    // -------------------------------- Websockets --------------------------------

    const params = {
      roomId,
      roomName,
      clientId,
      initialRole,
      playerName,
      playerSprite,
      callback: () => {},
    };

    const { socket } = useGameWebSocket(params);
    const { gameOver } = useGameRoomWebSocket(params);

    useEffect(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      if (socket.readyState !== WebSocket.OPEN) {
        socket.onopen = () => {
          const gameClient = new GameClient(canvasRef.current, socket);
          gameClient.start();
        };
        return;
      }
      const gameClient = new GameClient(canvasRef.current, socket);

      gameClient.start();
      return () => {
        gameClient.destroy(); // ✅ cleanup
      };
    }, [socket]);

    return (
      <Background variant="plain">
        <div className="w-full h-full flex-col-center gap-10 px-25">
          <canvas
            ref={canvasRef}
            width={1000}
            height={500}
            className="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800"
          />
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
  } else if (mode === "local" || mode === "local-tournament") {
    const location = useLocation();
    const state = location.state;
    const [showNextRound, setShowNextRound] = useState(false);
    const [lastWinnerIdx, setLastWinnerIdx] = useState<number | null>(null);
    const [showTournamentEnd, setShowTournamentEnd] = useState(false);
    const [tournamentWinner, setTournamentWinner] = useState<string | null>(null);

    const tournamentData = JSON.parse(sessionStorage.getItem("tournamentData") || "{}");
    console.log("Tournament Data:", tournamentData);



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

      const settings = location.state?.gameSettings ?? {};
      console.log("new game")
      const game = new PongGame(
        false,
        settings,
        () => {},
        1,
        (winningPlayer: Player | null, winnerSide: "left" | "right" | "draw") => {
          if (mode === "local-tournament") {
            setShowNextRound(true);
            // Find winner index in allPlayers and store it
            const tournamentData = JSON.parse(sessionStorage.getItem("tournamentData") || "{}");
            const allPlayers = tournamentData.allPlayers || [];
            let winnerIdx = null;
            if (winningPlayer && winnerSide !== "draw") {
              winnerIdx = allPlayers.findIndex(
                (p: any) => p.name === winningPlayer.name
              );
            }
            setLastWinnerIdx(winnerIdx);
          }
        }
      );
      const tournamentData = JSON.parse(sessionStorage.getItem("tournamentData") || "{}");


      let player1Settings = location.state?.player1 ?? {};
      let player2Settings = location.state?.player2 ?? {};

      var gameType = "local";

      if (location.state?.type === "tournament") {
        gameType = "tournament";
      }

      const player1Name = player1Settings.name || "Player1";
      const player2Name = player2Settings.name || "Player2";

      game.addPlayer(
        new Player({
          team: 0,
          name: player1Name,
          id: 0,
          skin: SKIN_MAPPING[player1Settings.spriteUrl] ?? 0,
        }),
      );

      game.addPlayer(
        new Player({
          team: 1,
          name: player2Name,
          id: 1,
          skin: SKIN_MAPPING[player2Settings.spriteUrl] ?? 0,
        }),
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

      const FIXED_TIMESTEP = 1 / 60;
      let lastTime = performance.now();
      let accumulator = 0;

      // --- 🎮 Game Loop ---
      function loop(now: number) {
        const frameTime = (now - lastTime) / 1000; // seconds
        lastTime = now;
        accumulator += frameTime;

        while (accumulator >= FIXED_TIMESTEP) {
          if (keysPressed.has("w")) game.movePaddle("ArrowUp", 0);
          if (keysPressed.has("s")) game.movePaddle("ArrowDown", 0);
          if (keysPressed.has("ArrowDown")) game.movePaddle("ArrowDown", 1);
          if (keysPressed.has("ArrowUp")) game.movePaddle("ArrowUp", 1);

          game.update({ deltaOverride: FIXED_TIMESTEP });
          accumulator -= FIXED_TIMESTEP;
        }

        // --- 🎨 Render phase ---
        viewport.ctx.clearRect(0, 0, viewport.width, viewport.height);
        viewport.ctx.fillStyle = "#000";
        viewport.ctx.fillRect(0, 0, viewport.width, viewport.height);

        const renderList = Array.from(game.world.gameObjects.values()).sort(
          (a, b) => a.zIndex - b.zIndex,
        );
        for (const obj of renderList) {
          updateObjectClient(obj);
          obj.draw(viewport);
        }

        requestAnimationFrame(loop);
      }

      requestAnimationFrame(loop);
      // --- 🧹 Cleanup ---
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        game.destroy?.();
      };
    }, [mode, location.state, round]);

    return (
      <Background variant="plain">
        <div className="w-full h-full flex-col-center gap-10 px-25">
          {mode === "local-tournament" && (
            <h1 className="text-4xl font-bold text-yellow-400 mb-4">
              {(state?.player1?.name ?? "Player1") + " vs " + (state?.player2?.name ?? "Player2")}
            </h1>
          )}
          <canvas
            ref={canvasRef}
            width={1200}
            height={500}
            className="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800"
          />
          {/* ✅ Back to Lobby Button */}
          <div className="flex flex-row gap-4">
            <Button
              variant="bigYellow"
              className="px-3 py-4 text-2xl whitespace-nowrap"
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
            {showNextRound && (
              <div className="flex flex-col items-center">
                <Button
                  variant="bigYellow"
                  className="px-8 py-4 text-2xl whitespace-nowrap"
                  onClick={() => {
                    round ++;
                    setShowNextRound(false);

                    const tournamentData = JSON.parse(sessionStorage.getItem("tournamentData") || "{}");
                    tournamentData.round += 1;
                    if (lastWinnerIdx !== null) {
                      tournamentData.winners.push(lastWinnerIdx);
                    }
                    sessionStorage.setItem("tournamentData", JSON.stringify(tournamentData));
                    
                    if (tournamentData.round === 4) {
                      // Tournament ended: show popup
                      const allPlayers = tournamentData.allPlayers || [];
                      const winnerIdx = tournamentData.winners[2]; // Final winner index
                      const winner = allPlayers[winnerIdx];
                      setTournamentWinner(winner?.name ?? "Unknown");
                      setShowTournamentEnd(true);
                    }
                    else if (tournamentData.round === 3) {
                      // Use winner indices to get player objects for the final round
                      const allPlayers = tournamentData.allPlayers || [];
                      const winner1 = allPlayers[tournamentData.winners[0]];
                      const winner2 = allPlayers[tournamentData.winners[1]];
                      navigate("/local-game", {
                        state: {
                          player1: winner1,
                          player2: winner2,
                          gameSettings: state.gameSettings,
                          type: "tournament"
                        }
                      });
                    }
                    else {
                      navigate("/local-game", {
                        state: {
                          player1: tournamentData.rounds[tournamentData.round - 1][0],
                          player2: tournamentData.rounds[tournamentData.round - 1][1],
                          gameSettings: state.gameSettings,
                          type: "tournament"
                        }
                      });
                    }
                  }}
                >
                  {(() => {
                    const tournamentData = JSON.parse(sessionStorage.getItem("tournamentData") || "{}");
                    return tournamentData.round === 3 ? "End Tournament" : "Next Round";
                  })()}
                </Button>
                {(() => {
                  const tournamentData = JSON.parse(sessionStorage.getItem("tournamentData") || "{}");
                  const nextRoundIdx = tournamentData.round;
                  const nextPair = tournamentData.rounds?.[nextRoundIdx];


                  let nextPlayer1;
                  let nextPlayer2;
                  let remainingplayers = tournamentData.allPlayers.filter((_: any, idx: number) => {
                    return tournamentData.winners.includes(idx) || idx === lastWinnerIdx;
                  });

                  
                  if (!nextPair) {
                    tournamentData.winners[0];
                    
                    nextPlayer1 = remainingplayers[0];
                    nextPlayer2 = remainingplayers[1];
                  }
                  else {
                    nextPlayer1 = nextPair[0];
                    nextPlayer2 = nextPair[1];
                  }

                  return (
                    (tournamentData.round !== 3)? <div className="mt-2 text-lg text-gray-200 font-semibold text-center">
                      {nextPlayer1.name} vs {nextPlayer2.name}
                    </div>: null
                  );
                  return null;
                })()}
              </div>
            )}
          </div>
          {/* Tournament End Popup */}
          {showTournamentEnd && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ background: "rgba(0,0,0,0.6)" }}
            >
              <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center border-4 border-yellow-400 min-w-[320px]">
                <h2 className="text-3xl font-bold text-yellow-500 mb-4">Tournament Over</h2>
                <p className="text-xl mb-6">
                  Winner: <span className="font-semibold">{tournamentWinner}</span>
                </p>
                {(() => {
                  const tournamentData = JSON.parse(sessionStorage.getItem("tournamentData") || "{}");
                  const allPlayers = tournamentData.allPlayers || [];
                  const winners = tournamentData.winners || [];
                  const rounds = tournamentData.rounds || [];
                  const finalRound = rounds[rounds.length - 1] || [];
                  const lastWinnerIdx = winners[winners.length - 1]; // winner of last round
                  let rank1Idx = lastWinnerIdx;
                  let rank2Idx = null;

                  let firstTwoRounds = winners.slice(0, 2);

                  if (firstTwoRounds[0] === lastWinnerIdx) {
                    rank2Idx = firstTwoRounds[1];
                  } else {
                    rank2Idx = firstTwoRounds[0];
                  }

                  const rank3Idxs = allPlayers
                    .map((_, idx) => idx)
                    .filter(idx => idx !== rank1Idx && idx !== rank2Idx);

                  return (
                    <div className="mb-6 w-full">
                      <div className="text-lg font-semibold text-gray-700 mb-2 text-center">Final Rankings:</div>
                      <ul className="list-none text-gray-800 text-center">
                        {rank1Idx !== undefined && rank1Idx !== null && (
                          <li className="mb-1">
                            <span className="font-bold text-yellow-600">🥇 1st: {allPlayers[rank1Idx]?.name ?? "Unknown"}</span>
                          </li>
                        )}
                        {rank2Idx !== undefined && rank2Idx !== null && (
                          <li className="mb-1">
                            <span className="font-bold text-gray-600">🥈 2nd: {allPlayers[rank2Idx]?.name ?? "Unknown"}</span>
                          </li>
                        )}
                        {rank3Idxs.map((idx) => (
                          <li key={idx} className="mb-1">
                            <span className="font-bold text-gray-500">🥉 3rd: {allPlayers[idx]?.name ?? "Unknown"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                <Button
                  variant="bigYellow"
                  className="px-6 py-3 text-xl"
                  onClick={() => {
                    setShowTournamentEnd(false);
                    navigate("/main-menu");
                    sessionStorage.removeItem("playerSide");
                    sessionStorage.removeItem("RoomId");
                    sessionStorage.removeItem("RoomLeaderId");
                    sessionStorage.removeItem("RoomName");
                    sessionStorage.removeItem("RoomType");
                    sessionStorage.removeItem("tournamentData");
                  }}
                >
                  Back to Lobby
                </Button>
              </div>
            </div>
          )}
        </div>
      </Background>
    );
  }
};

export default GameView;
