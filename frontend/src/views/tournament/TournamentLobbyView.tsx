import React, { useState } from "react";
import {
  mockTournamentLobbyPlayers,
  mockTournamentLobbyChat,
} from "../../data/mockUsers";

import { formatTimestamp } from "../../utils/date";

import Background from "../../components/Background";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LiveChat from "../../components/LiveChat";
import ReadyPlayers from "../../components/ReadyPlayers";

const TournamentLobbyView: React.FC = () => {
  const [players, setPlayers] = useState(mockTournamentLobbyPlayers["t1"]);
  const [chatMessages, setChatMessages] = useState(
    mockTournamentLobbyChat["t1"]
  );
  const [message, setMessage] = useState("");
  const [stage, setStage] = useState("quarterfinals");

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

  return (
    <Background>
      <Card size="large" className={`flex flex-row gap-8`}>
        <div className="w-1/2 h-full flex flex-col items-center justify-between">
          <div className="w-full flex flex-col bg-yellow-400 text-card-blue rounded font-bold text-2xl text-center py-2">
            <span>Pre-{stage.charAt(0).toUpperCase() + stage.slice(1)}</span>
            <span>Tournament Lobby</span>
          </div>
          <ReadyPlayers players={players} />
          <div className="flex gap-4">
            <Button variant="green">Ready</Button>
            {stage === "quarterfinals" && <Button variant="red">Quit</Button>}
          </div>
        </div>
        <LiveChat
          players={players}
          chatMessages={chatMessages}
          message={message}
          setMessage={setMessage}
          onSendMessage={handleSendMessage}
        />
      </Card>
    </Background>
  );
};

export default TournamentLobbyView;
