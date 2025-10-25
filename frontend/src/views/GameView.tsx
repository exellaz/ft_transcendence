import React, { useState, useParams, useRef, useEffect } from "react";
import { useTranslation, withSSR } from "react-i18next";
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
import { ImageObject } from "@shared/objects/ImageObject";
import type { GameObject } from "@shared/objects/GameObject";
import { SKIN_PATHS } from "@shared/game/Skins";
import type { User } from "@/types/usersApi";
import { createNextTournament, deleteTournament, getTournamentById, updateTournamentLobby } from "@/lib/requestBackend.api";
import { closeMatchWebsocket } from "../lib/match-websocket";
import { closeTournamentWebsocket } from "@/lib/tournament-websocket";

import type { NavigateFunction } from "react-router-dom";

function nextRoundFromTournament(tournament: any) {
  if (!tournament) return null;
  const max = typeof tournament.maxPlayer === "number" ? tournament.maxPlayer : undefined;
  if (max === 8) return { code: "SF", size: 4 };
  if (max === 4) return { code: "F", size: 2 };
  const stage = (tournament.stage || "").toString().toLowerCase();
  if (stage.includes("quarter") || stage === "qf") return { code: "SF", size: 4 };
  if (stage.includes("semi") || stage === "sf") return { code: "F", size: 2 };
  return null;
}

export async function goToNextRoundExternal(opts: {
  lastTournamentId: number;
  tournamentDb: any | null;
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
      parentTournament = null;
    }
    const next = nextRoundFromTournament(parentTournament);
    if (!next) {
      navigate("/main-menu");
      return;
    }

    const res = await createNextTournament(next.code, lastTournamentId, tournamentDb);
    if (res && res.id) {
      const currentTournamentId = Number(sessionStorage.getItem("tournamentId") ?? lastTournamentId ?? -1);
      if (currentTournamentId > 0) {
        try { closeTournamentWebsocket(currentTournamentId, clientId); } catch {}
      }
      try { closeMatchWebsocket(roomId, clientId); } catch {}
      navigate(`/tournament/${res.id}`, { state: { tournament: res } });
      return;
    }

    // fallback to parent.nextTournamentId if present
    const parent = await getTournamentById(lastTournamentId);
    if (parent && parent.nextTournamentId) {
      navigate(`/tournament/${parent.nextTournamentId}`, { state: { tournament: parent } });
      return;
    }

    navigate("/main-menu");
  } catch (err) {
    console.error("goToNextRoundExternal error:", err);
    try {
      const parent = await getTournamentById(lastTournamentId);
      if (parent && parent.nextTournamentId) {
        navigate(`/tournament/${parent.nextTournamentId}`, { state: { tournament: parent } });
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
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [hasNextStage, setHasNextStage] = useState<boolean | null>(null);
  useBlockLeave();
 const { t } = useTranslation();
 const translate = (key: string) => t(`GameView.${key}`);
//  const [stage, setStage] = useState<"quarterfinals" | "semifinals" | "finals" | "custom">(
//    "quarterfinals",
//  );
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
  }

  //check for reload
  React.useEffect (() => {
    if (sessionStorage.getItem("reloading") !== null) {
        sessionStorage.removeItem("reloading");
        navigate("/main-menu");
        }
  }, []);

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
  const roomId = Number(navState.roomId ?? sessionStorage.getItem("RoomId") ?? "1");
  const roomName = sessionStorage.getItem("RoomName") || "Room 1";
  const clientId = Number(navState.player?.id ?? userInfo?.id ?? -1);
  const playerName = navState.player?.name ?? userInfo?.username ?? "";
  const playerSprite = sessionStorage.getItem("playerSprite") || navState.player?.spriteUrl;
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
  onError: (msg: string) => {
    setDisconnectMessage(msg);
    setRoomError(true);
  },
  };
  // console.log("params", params); ////debug

  const { socket } = useGameWebSocket(params);
  // console.log("socket has been create: ", socket); ////debug

  const { gameOver, isWinner, lastTournamentId, tournamentDb, winnerRank, loserRank } = useGameRoomWebSocket({
    ...params,
    isOffline: delayForGameOver,
  });

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
      if (winnerRank === 1) {
        navigate("/results", { state: { roomId, clientId, lastTournamentId, winnerRank } });
        return;
      }
      navigate("/advance", { state: {
                      playerSprite,
                      lastTournamentId,
                      tournamentDb,
                      clientId,
                      roomId,
                  } });
    }, 1000);
    return () => clearTimeout(timer);
  }, [isWinner, lastTournamentId, tournamentDb, clientId, roomId, playerSprite, winnerRank]); // navigate is safe to omit here (stable)

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
        navigate("/results", { state: { roomId, clientId, lastTournamentId, loserRank } });
      }, 1000); //wait 3 seconds before navigating away
      return () => clearTimeout(timer);
    }
  }, [gameOver, isWinner]);

  React.useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      // console.log("waiting for socket connection..."); ////debug
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
        <div className="w-full h-[500px] flex-col-center border-4 border-yellow-400 text-white text-9xl text-center">
          <canvas
            ref={canvasRef}
            width={1000}
            height={500}
            className="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800"
          />
        </div>

        {gameOver && !isWinner && (
          <div>
            <Button
              variant="bigYellow"
              className="px-3 py-4 text-2xl"
              onClick={() => {
                console.log("loser back to lobby: ", lastTournamentId);
                  // close match socket (room) and tournament lobby socket (if present)
                  closeMatchWebsocket(roomId, clientId);

                  // read persisted tournament id (set by tournament-websocket hook)
                  const tId = Number(sessionStorage.getItem("tournamentId") ?? lastTournamentId ?? -1);
                  if (tId > 0) {
                    try { closeTournamentWebsocket(tId, clientId); } catch (e) { console.warn("failed to close tournament ws", e); }
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

        {/* Winner: button adapts for final vs next-stage */}
        {isWinner && lastTournamentId && (
          <div className="flex items-center gap-4">
            <Button
              variant="bigYellow"
              className="px-3 py-4 text-2xl"
              onClick={() => {
                if (hasNextStage === false) {
                  // final finished — go back to tournament page / results (or main-menu)
                  sessionStorage.removeItem("playerSide");
                  sessionStorage.removeItem("RoomId");
                  sessionStorage.removeItem("RoomLeaderId");
                  sessionStorage.removeItem("RoomName");
                  sessionStorage.removeItem("RoomType");
                  navigate(`/tournament/${lastTournamentId}`);
                  return;
                }
                // otherwise attempt to advance to next round
                //goToNextRound(tournamentDb);
                navigate("/advance", { state: {
                    playerSprite,
                    lastTournamentId,
                    tournamentDb,
                    clientId,
                    roomId,
                    winnerRank,
                } });

              }}
              disabled={isAdvancing || hasNextStage === null}
            >
              {isAdvancing
                ? "Redirecting..."
                : hasNextStage === false
                ? "Back to Lobby"
                : "Next Stage"}
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
 }
}

export default GameView;
