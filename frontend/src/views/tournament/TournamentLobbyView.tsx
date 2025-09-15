import React, { useState } from "react";
import {
  mockTournamentLobbyPlayers,
  mockTournamentLobbyChat,
} from "../../data/mockUsers";

import Background from "../../components/Background";
import Card from "../../components/Card";
import LiveChat from "../../components/LiveChat";
import ReadyPlayers from "../../components/ReadyPlayers";

const TournamentLobbyView: React.FC = () => {
  const [players, setPlayers] = useState(mockTournamentLobbyPlayers["t1"]);
  const [chatMessages, setChatMessages] = useState(
    mockTournamentLobbyChat["t1"]
  );
  const [message, setMessage] = useState("");

  // todo: Replace 1 with current user id
  function handleSendMessage() {
    if (message.trim()) {
      setChatMessages([...chatMessages, { userId: 1, text: message }]);
      setMessage("");
    }
  }

  return (
    <Background>
      <Card size="large" className={`flex flex-row gap-8`}>
        <div className="w-1/2 h-full flex flex-col items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Tournament Lobby</h1>
          <ReadyPlayers players={players} />
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
