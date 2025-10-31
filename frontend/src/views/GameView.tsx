import React, { useState, useRef, useEffect } from "react";
import Background from "../components/Background";
import { useTranslation } from "react-i18next";
import { getUserById } from "../lib/usersApiClient";
import { useGameWebSocket } from "../lib/game-websocket";
import { useBlockLeave } from "../utils/blockRefresh";
import { useUser } from "../context/UserProvider";
import { useNavigate } from "react-router-dom";
import Button from "@/components/Button";
import { useLocation } from "react-router-dom";
import { PongGame } from "@shared/game/pong";
import { Viewport } from "@shared/objects/Viewport";
import { Player } from "@shared/game/Player";
import type { GameObject } from "@shared/objects/GameObject";
import type { User } from "@/types/usersApi";
import {
  createNextTournament,
  getTournamentById,
} from "@/lib/requestBackend.api";
import { closeMatchWebsocket } from "../lib/match-websocket";
import { closeTournamentWebsocket } from "@/lib/tournament-websocket";

import type { NavigateFunction } from "react-router-dom";
import type { TournamentLobby, TournamentDb } from "../../../backend/src/types/interface";

function nextRoundFromTournament(tournament: TournamentLobby) {
  if (!tournament) return null;
  const max =
    typeof tournament.maxPlayer === "number" ? tournament.maxPlayer : undefined;
  if (max === 8) return { code: "SF", size: 4 };
  if (max === 4) return { code: "F", size: 2 };
  const stage = (tournament.stage || "").toString().toLowerCase();
  if (stage.includes("quarter") || stage === "qf")
    return { code: "SF", size: 4 };
  if (stage.includes("semi") || stage === "sf") return { code: "F", size: 2 };
  return null;
}

export async function goToNextRoundExternal(opts: {
  lastTournamentId: number;
  tournamentDb: TournamentDb | null;
  clientId: number;
  roomId: number;
  navigate: NavigateFunction;
}) {
  const { lastTournamentId, tournamentDb, clientId, roomId, navigate } = opts;
  if (!lastTournamentId) {
    navigate("/main-menu");
    return;
  }

  try {
    // clear room session storage (same as losers)
    sessionStorage.removeItem("playerSide");
    sessionStorage.removeItem("RoomId");
    sessionStorage.removeItem("RoomLeaderId");
    sessionStorage.removeItem("RoomName");
    sessionStorage.removeItem("RoomType");

    let parentTournament = null;
    try {
      parentTournament = await getTournamentById(lastTournamentId);
    } catch (err) {
      console.error("failed to get parent tournament:", err);
      parentTournament = null;
    }
    const next = nextRoundFromTournament(parentTournament);
    if (!next) {
      navigate("/main-menu");
      return;
    }

    const res = await createNextTournament(
      next.code,
      lastTournamentId,
      tournamentDb,
    );
    if (res && res.id) {
      const currentTournamentId = Number(
        sessionStorage.getItem("tournamentId") ?? lastTournamentId ?? -1,
      );
      if (currentTournamentId > 0) {
        try {
          closeTournamentWebsocket(currentTournamentId, clientId);
        } catch {}
      }
      try {
        closeMatchWebsocket(roomId, clientId);
      } catch {}
      navigate(`/tournament/${res.id}`, { state: { tournament: res } });
      return;
    }

    // fallback to parent.nextTournamentId if present
    const parent = await getTournamentById(lastTournamentId);
    if (parent && parent.nextTournamentId) {
      navigate(`/tournament/${parent.nextTournamentId}`, {
        state: { tournament: parent },
      });
      return;
    }

    navigate("/main-menu");
  } catch (err) {
    console.error("goToNextRoundExternal error:", err);
    try {
      const parent = await getTournamentById(lastTournamentId);
      if (parent && parent.nextTournamentId) {
        navigate(`/tournament/${parent.nextTournamentId}`, {
          state: { tournament: parent },
        });
        return;
      }
    } catch {}
    navigate("/main-menu");
  }
}

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
  const [delayForGameOver, setDelayForGameOver] = useState(false);
  const [roomError, setRoomError] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState("");
  const [hasNextStage, setHasNextStage] = useState<boolean | null>(null);
  useBlockLeave();
  const { t } = useTranslation();
  const translate = (key: string) => t(`GameView.${key}`);
  const { user } = useUser();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const mode = location.pathname === "/local-game" ? "local" : "remote";
  const navState = (location.state ?? {}) as {
    roomId?: number;
    player?: {
      id: number;
      name: string;
      spriteUrl: string;
    };
  };

  //check for reload
  React.useEffect(() => {
    if (sessionStorage.getItem("reloading") !== null) {
      sessionStorage.removeItem("reloading");
      navigate("/main-menu");
    }
  }, []);

  if (mode === "remote") {
    // Fetch user info when the component mounts
    React.useEffect(() => {
      console.log("mode used: ", mode);

      if (!user) return; // Ensure `user` is available

      (async () => {
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
      })();
    }, [user]);

    React.useEffect(() => {
      function handleOnline() {
        setDelayForGameOver(false);
        console.log("Player is back online");
      }

      function handleOffline() {
        setDelayForGameOver(true);

        setTimeout(() => {
          if (!navigator.onLine) {
            console.log("player offline, navigate to main menu");
            setDisconnectMessage("offline_error");
            setRoomError(true);
          }
        }, 5000); //wait 5 second to confirm player is still offline
      }

      if (typeof window !== "undefined") {
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
      }

      return () => {
        if (typeof window !== "undefined") {
          window.removeEventListener("online", handleOnline);
          window.removeEventListener("offline", handleOffline);
        }
      };
    }, [navigate]);

    // console.log("user loaded", user); ////debug
    const roomId = Number(
      navState.roomId ?? sessionStorage.getItem("RoomId") ?? "1",
    );
    const roomName = sessionStorage.getItem("RoomName") || "Room 1";
    const clientId = Number(navState.player?.id ?? userInfo?.id ?? -1);
    const playerName = navState.player?.name ?? userInfo?.username ?? "";
    const playerSprite =
      sessionStorage.getItem("playerSprite") || navState.player?.spriteUrl;
    const initialRole = sessionStorage.getItem("playerSide") || "";
    console.log("room id from session:", roomId); ////debug
    console.log("room name from session:", roomName); ////debug
    console.log("client id from session:", clientId); ////debug
    console.log("player name from session:", playerName); ////debug
    console.log("player sprite from session:", playerSprite); ////debug
    console.log("initial role from session:", initialRole); ////debug

    // -------------------------------- Websockets --------------------------------

    const params = {
      roomId,
      roomName,
      clientId,
      initialRole,
      callback: () => {},
      canvasRef,
    };
    // console.log("params", params); ////debug

    // game websocket
    const {
      gameOver,
      isWinner,
      lastTournamentId,
      tournamentDb,
      winnerRank,
      loserRank,
    } = useGameWebSocket(params);
    //   console.log("socket has been create: ", socket); ////debug

    // -------------------------------- Effect --------------------------------
    // determine if there is a next stage (used to change button text/action for final)
    React.useEffect(() => {
      if (!lastTournamentId) {
        setHasNextStage(null);
        return;
      }
      let mounted = true;
      (async () => {
        try {
          const tournament = await getTournamentById(lastTournamentId || -1);
          const next = nextRoundFromTournament(tournament);
          if (mounted) setHasNextStage(!!next);
        } catch (err) {
          console.error("failed to get next round:", err);
          if (mounted) setHasNextStage(null);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [lastTournamentId]);

    // auto-navigate winners after a timeout (still possible, but user can click the button to jump early)
    React.useEffect(() => {
      if (!isWinner || !lastTournamentId) return;
      const timer = setTimeout(() => {
        //if rank 1 (go to results), else go to advance page
        if (winnerRank === 1) {
          navigate("/results", {
            state: { roomId, clientId, lastTournamentId, winnerRank },
          });
          return;
        }
        navigate("/advance", {
          state: {
            playerSprite,
            lastTournamentId,
            tournamentDb,
            clientId,
            roomId,
          },
        });
      }, 1000);
      return () => clearTimeout(timer);
    }, [
      isWinner,
      lastTournamentId,
      tournamentDb,
      clientId,
      roomId,
      playerSprite,
      winnerRank,
    ]); // navigate is safe to omit here (stable)

    // navigate the player end game rank
    React.useEffect(() => {
      if (lastTournamentId === null) return;
      if (gameOver && !isWinner) {
        const timer = setTimeout(() => {
          console.log("loser back to lobby: ", lastTournamentId); ////debug
          sessionStorage.removeItem("playerSide");
          sessionStorage.removeItem("RoomId");
          sessionStorage.removeItem("RoomLeaderId");
          sessionStorage.removeItem("RoomName");
          sessionStorage.removeItem("RoomType");
          navigate("/results", {
            state: { roomId, clientId, lastTournamentId, loserRank },
          });
        }, 1000); //wait 3 seconds before navigating away
        return () => clearTimeout(timer);
      }
    }, [gameOver, isWinner]);

    // -------------------------------- Helper Functions --------------------------------
    function renderRoomErrorText(): string | null {
      if (!disconnectMessage) return null;

      if (disconnectMessage === "offline_error")
        return translate("offline_error");

      return null;
    }

    // -------------------------------- Render --------------------------------
    return (
      <Background variant="plain">
        <div className="w-full h-full flex-col-center gap-10 px-25">
          {/*<TournamentHeader>
          {stage.charAt(0).toUpperCase() + stage.slice(1)} Match
        </TournamentHeader>*/}
          <canvas
            ref={canvasRef}
            width={1000}
            height={500}
            className="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800"
          />

          {gameOver && !isWinner && !lastTournamentId && (
            <div>
              <Button
                variant="bigYellow"
                className="px-3 py-4 text-2xl"
                onClick={() => {
                  console.log("loser back to lobby: ", lastTournamentId);
                  // close match socket (room) and tournament lobby socket (if present)
                  closeMatchWebsocket(roomId, clientId);

                  // read persisted tournament id (set by tournament-websocket hook)
                  const tId = Number(
                    sessionStorage.getItem("tournamentId") ??
                      lastTournamentId ??
                      -1,
                  );
                  if (tId > 0) {
                    try {
                      closeTournamentWebsocket(tId, clientId);
                    } catch (e) {
                      console.warn("failed to close tournament ws", e);
                    }
                  }
                  sessionStorage.removeItem("playerSide");
                  sessionStorage.removeItem("RoomId");
                  sessionStorage.removeItem("RoomLeaderId");
                  sessionStorage.removeItem("RoomName");
                  sessionStorage.removeItem("RoomType");
                  navigate("/main-menu");
                }}
              >
                Back to Lobby
              </Button>
            </div>
          )}

          {/* error popup */}
          {roomError && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Background image using your Background component */}
              <Background variant="grass">
                {/* Optional dark overlay on top of the background */}
                <div className="absolute inset-0 bg-black opacity-70"></div>
                {/* Popup content */}
                <div className="relative flex flex-col items-center gap-6 bg-card-blue border-yellow-600 border-10 rounded-3xl shadow-2xl p-10 z-10">
                  <p className="text-center text-white text-2xl px-4">
                    {renderRoomErrorText()}
                  </p>
                  <Button
                    variant="red"
                    onClick={() => {
                      navigate("/main-menu");
                    }}
                  >
                    {translate("close")}
                  </Button>
                </div>
              </Background>
            </div>
          )}
        </div>
      </Background>
    );
  } else if (mode === "local") {
    const location = useLocation();
    const state = location.state;

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

      const settings = location.state?.gameSettings ?? {};
      const game = new PongGame(false, settings, () => {}, 1);

      const player1Settings = location.state?.player1 ?? {};
      const player2Settings = location.state?.player2 ?? {};

      game.addPlayer(
        new Player({
          team: 0,
          name: "Player1",
          id: 0,
          skin: SKIN_MAPPING[player1Settings.spriteUrl] ?? 0,
        }),
      );

      game.addPlayer(
        new Player({
          team: 1,
          name: "Player2",
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
      };
    }, []);

    return (
      <Background variant="plain">
        <div className="w-full h-full flex-col-center gap-10 px-25">
          <canvas
            ref={canvasRef}
            width={1200}
            height={500}
            className="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800"
          />
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
