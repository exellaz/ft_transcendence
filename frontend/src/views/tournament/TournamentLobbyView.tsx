import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { mockWaitingTournamentPlayers } from "../../data/mockUsers";
import type {
  WaitingTournamentPlayer,
  LiveChatMessage,
} from "../../types/apiInterfaces";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../context/UserProvider";
import { getUserById } from "../../lib/usersApiClient";
import type { User } from "../../types/usersApi";
import { useTournamentWebSocket } from "../../lib/tournament-websocket";
import { formatTimestamp } from "../../utils/date";

import Background from "../../components/Background";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LiveChat from "../../components/LiveChat";
import ReadyPlayers from "../../components/ReadyPlayers";
import TournamentHeader from "../../components/TournamentHeader";
import ConfirmationPopup from "../../popups/ConfirmationPopup";

const TournamentLobbyView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`TournamentLobbyView.${key}`);
  const [players, setPlayers] = useState<WaitingTournamentPlayer[]>([]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [stage, setStage] = useState<"quarterfinals" | "semifinals" | "finals">(
    "quarterfinals",
  );
  const [showQuitTournament, setShowQuitTournament] = useState(false);
  const navigate = useNavigate();
  const { tournamentId: paramTournamentId } = useParams();
  const tournamentId = parseInt(sessionStorage.getItem("tournamentId") || "");
  console.log("----------------------------------------------------------------Tournament ID:", tournamentId);
  const { user } = useUser();
  const [userinfo, setUserinfo] = useState<User | null>(null); // State to hold user info
  console.log("User info in TournamentLobbyView:", userinfo);

  // Fetch user info when the component mounts
  React.useEffect(() => {
    if (!user) return; // Ensure `user` is available

    const fetchUserInfo = async () => {
      try {
        const response = await getUserById({ id: Number(user.id) }); // Call the API
        if (response.success && response.data) {
          console.log("===================================================Fetched user info:", response.data);
          setUserinfo(response.data); // Store the user info
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

  //update session storage when paramTournamentId change
  React.useEffect(() => {
    if (paramTournamentId) {
      sessionStorage.setItem("tournamentId", paramTournamentId);
    }
  }, [paramTournamentId]);

  // TODO: Fetch real data based on tournamentId
  // React.useEffect(() => {
  //   // Replace with real API calls
  //   fetch(`/api/players?tournamentId=${tournamentId}`)
  //     .then((res) => res.json())
  //     .then(setPlayers);
  //   fetch(`/api/messages?tournamentId=${tournamentId}`)
  //     .then((res) => res.json())
  //     .then(setChatMessages);
  // }, [tournamentId]);

  // TODO: Remove mock data when integrating real API
//  React.useEffect(() => {
//    setPlayers(mockWaitingTournamentPlayers["t1"]);
//    //setChatMessages(mockTournamentLiveChat["t1"]);
//  }, []);

  //need websocket to update players when a new player joins
    //React.useEffect(() => {
    //    setPlayers([
    //        { id: userinfo?.id || 0, username: userinfo?.username || "Guest", spriteUrl: userinfo?.avatarUrl || "", ready: false },
    //    ]);
    //}, [userinfo]);
  const {
    players: currentPlayer,
    ready,
    started,
    startTournament,
    toggleReady,
    onleave
  } = useTournamentWebSocket({
    tournamentId,
    player: {
      id: userinfo?.id || -1,
      username: userinfo?.username || "",
      avatarUrl: userinfo?.avatarUrl || "",
    }
  });
  console.log ("Current players from WebSocket:", currentPlayer);

  React.useEffect(() => {
    setPlayers(currentPlayer);
  }, [currentPlayer]);

  // todo: Replace 1 with current user id
  function handleSendMessage() {
    if (message.trim()) {
      setChatMessages([
        ...chatMessages,
        { id: 0, text: message, timestamp: formatTimestamp(new Date()) },
      ]);
      setMessage("");
    }
  }

  let stageHeader;
  if (stage === "quarterfinals") stageHeader = translate("quarterfinals");
  else if (stage === "semifinals") stageHeader = translate("semifinals");
  else if (stage === "finals") stageHeader = translate("finals");

  return (
    <Background>
      <Card size="large">
        <div className="w-full h-full flex-row-center gap-6">
          <div className="w-[50%] h-full flex-col-between">
            <TournamentHeader>
              <span>{stageHeader}</span>
              <span>{translate("tournament_lobby")}</span>
            </TournamentHeader>
            <ReadyPlayers players={players} />
            <div className="flex-row-center gap-6">
              <Button variant="green" onClick={toggleReady}>
                {ready ? translate("Unready") : translate("ready")}
              </Button>
              {stage === "quarterfinals" && (
                <Button
                  variant="red"
                  onClick={() => setShowQuitTournament(true)}
                >
                  {translate("quit")}
                </Button>
              )}
            </div>
          </div>
          <LiveChat
            players={players}
            chatMessages={chatMessages}
            message={message}
            setMessage={setMessage}
            onSendMessage={handleSendMessage}
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
    </Background>
  );
};

export default TournamentLobbyView;
