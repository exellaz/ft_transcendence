import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  mockWaitingTournamentPlayers,
  mockTournamentLiveChat,
} from "../../data/mockUsers";
import type {
  WaitingTournamentPlayer,
  LiveChatMessage,
} from "../../types/apiInterfaces";

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
  const [stage, setStage] = useState<"quarterfinals" | "semifinals" | "finals">("quarterfinals");
  const [showQuitTournament, setShowQuitTournament] = useState(false);

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
  React.useEffect(() => {
    setPlayers(mockWaitingTournamentPlayers["t1"]);
    setChatMessages(mockTournamentLiveChat["t1"]);
  }, []);

  // todo: Replace 1 with current user id
  function handleSendMessage() {
    if (message.trim()) {
      setChatMessages([
        ...chatMessages,
        { uid: "0", text: message, timestamp: formatTimestamp(new Date()) },
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
              <Button variant="green">{translate("ready")}</Button>
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
        redirectPath="/main-menu"
      />
    </Background>
  );
};

export default TournamentLobbyView;
