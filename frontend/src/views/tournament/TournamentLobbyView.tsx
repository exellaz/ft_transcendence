import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { WaitingTournamentPlayer } from "../../types/apiInterfaces";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../context/UserProvider";
import { getUserById } from "../../lib/usersApiClient";
import type { User } from "../../types/usersApi";
import { useTournamentWebSocket } from "../../lib/tournament-websocket";

import Background from "../../components/Background";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LiveChat from "../../components/LiveChat";
import ReadyPlayers from "../../components/ReadyPlayers";
import TournamentHeader from "../../components/TournamentHeader";
import ConfirmationPopup from "../../popups/ConfirmationPopup";
import { useLiveChatWebSocket } from "@/lib/liveChat-websocket";
import { useBlockLeave } from "@/utils/blockRefresh";

const TournamentLobbyView: React.FC = () => {
  useBlockLeave();
  const location = useLocation();
  const { t } = useTranslation();
  const translate = (key: string) => t(`TournamentLobbyView.${key}`);
  const navigate = useNavigate();
  const { tournamentId: paramTournamentId } = useParams();
  const tournamentId =
    Number(paramTournamentId ?? location.state?.tournamentId) || -1;
  const { user } = useUser();
  const selectedSprite = location.state?.selectedSprite as string | undefined;
  const [userinfo, setUserinfo] = useState<User | null>(null); // State to hold user info
  const [players, setPlayers] = useState<WaitingTournamentPlayer[]>([]);
  const [stage, setStage] = useState<"QF" | "SF" | "F">("QF");
  const [showQuitTournament, setShowQuitTournament] = useState(false);
  //  console.log("Tournament ID:", tournamentId); ////debug
  //  console.log("User info in TournamentLobbyView:", userinfo); ////debug

  // for remove the session storage reloading flag
  React.useEffect(() => {
    if (sessionStorage.getItem("reloading") !== null) {
      sessionStorage.removeItem("reloading");
    }
  }, []);

  // Redirect to main menu if no location state
  React.useEffect(() => {
    if (!location.state || !location.state.tournament) {
      console.warn("Unauthorized tournament access - missing required data");
      navigate("/main-menu");
    }
  }, [location.state, navigate]);

  // Early return to prevent errors while redirect is pending
  if (!location.state || !location.state.tournament) {
    return null;
  }

  //live chat websocket
  const { chatMessages, message, setMessage, handleSendMsg } =
    useLiveChatWebSocket(tournamentId || -1, {
      id: userinfo?.id || -1,
      name: userinfo?.username || "",
    });

  //tournament websocket
  const {
    players: currentPlayer,
    ready,
    lock,
    countdown,
    toggleReady,
    onleave,
    eliminated,
    //refreshLobby,
    matchAssigned,
    roomError,
  } = useTournamentWebSocket({
    tournamentId,
    player: {
      id: userinfo?.id || -1,
      username: userinfo?.username || "",
      avatarUrl: selectedSprite || "",
    },
  });

  // Fetch user info when the component mounts
  React.useEffect(() => {
    //console.log("TournamentLobbyView init:", { user, tournamentId }); ////debug

    //use context user if available
    if (user) {
      //setUserinfo(user);
      (async () => {
        try {
          const response = await getUserById({ id: Number(user.id) }); // Call the API
          if (response.success && response.data) {
            //console.log("Fetched user info:", response.data); ////debug
            setUserinfo(response.data); // Store the user info
          }
        } catch (err) {
          console.error("Error fetching user info:", err);
          console.error("An error occurred while fetching user info"); // Handle fetch error
        }
      })();
      return;
    }

    //if no context user, navigate to main menu
    console.warn("User context is not available"); ////debug
    navigate("/main-menu");
  }, [user, tournamentId, navigate]);

  //update session storage when TournamentId change
  React.useEffect(() => {
    if (paramTournamentId) {
      sessionStorage.setItem("tournamentId", paramTournamentId);
    }
  }, [paramTournamentId]);

  //navigate to match when start tournament
  React.useEffect(() => {
    if (matchAssigned) {
      navigate(`/match/${matchAssigned.roomId}`, {
        state: {
          players: matchAssigned.players,
          stage: matchAssigned.stage,
          roomId: matchAssigned.roomId,
        },
      });
    }
  });
  //  console.log ("Current players from WebSocket:", currentPlayer); ////debug

  //update players list when websocket data change
  React.useEffect(() => {
    if (Array.isArray(currentPlayer) && currentPlayer.length > 0) {
      //  console.log("Updating players list:", currentPlayer); ////debug
      setPlayers(currentPlayer);
    }
  }, [currentPlayer]);

  //update stage when move to next stage
  React.useEffect(() => {
    if (location.state.tournament.stage) {
      setStage(location.state.tournament.stage);
    }
  }, [location.state.tournament.stage]);

  let stageHeader;
  if (stage === "QF") stageHeader = translate("quarterfinals");
  else if (stage === "SF") stageHeader = translate("semifinals");
  else if (stage === "F") stageHeader = translate("finals");

  // -------------------------------- Helper Functions --------------------------------
  function renderRoomErrorText(): string | null {
    if (!roomError) return null;

    if (roomError === "Room is full") {
      return translate("room_is_full");
    } else if (roomError === "offline_error") {
      return translate("offline_error");
    } else {
      return roomError;
    }
  }

  return (
    <Background>
      <div className="relative w-full flex justify-center">
        <Card size="large">
          <div className="w-full h-full flex-row-center gap-6">
            {/* countdown */}
            {countdown !== null && !lock && (
              <p className="absolute -top-8 text-6xl font-bold text-white">
                {countdown > 0 ? countdown : translate("game_start")}
              </p>
            )}

            {/* Main tournament content */}
            <div className="w-[50%] h-full flex-col-between">
              {/* lobby tittle */}
              <TournamentHeader>
                <span>{stageHeader}</span>
                <span>{translate("tournament_lobby")}</span>
              </TournamentHeader>

              {/* players ready status */}
              <ReadyPlayers players={players} />

              {/* ready and leave button */}
              <div className="flex-row-center gap-6">
                {!eliminated ? (
                  <>
                    <Button variant="green" onClick={toggleReady}>
                      {ready ? translate("unready") : translate("ready")}
                    </Button>
                    <Button
                      variant="red"
                      onClick={() => setShowQuitTournament(true)}
                    >
                      {translate("quit")}
                    </Button>
                  </>
                ) : (
                  // eliminated players get a direct back button
                  <Button
                    variant="bigYellow"
                    onClick={() => navigate("/main-menu")}
                  >
                    {translate("back_to_lobby") || "Back to Lobby"}
                  </Button>
                )}
              </div>
            </div>

            {/* live chat */}
            <LiveChat
              players={players}
              chatMessages={chatMessages}
              message={message}
              setMessage={setMessage}
              onSendMessage={handleSendMsg}
            />
          </div>
        </Card>

        <ConfirmationPopup
          text={translate("quit_confirmation")}
          open={showQuitTournament}
          onClose={() => setShowQuitTournament(false)}
          onConfirm={() => {
            onleave();
            navigate("/main-menu");
          }}
        />

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
};

export default TournamentLobbyView;
