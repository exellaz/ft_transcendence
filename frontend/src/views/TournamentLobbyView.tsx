import React, { useState } from "react";

import Background from "../components/Background";
import Card from "../components/Card";
import LiveChat from "../components/LiveChat";
import ReadyPlayers from "../components/ReadyPlayers";

// Example player data
const players = [
  {
    id: 1,
    username: "Player1",
    skinUrl: "/assets/yellow-ghost.png",
    ready: true,
  },
  {
    id: 2,
    username: "Player2",
    skinUrl: "/assets/green-ghost.png",
    ready: false,
  },
  {
    id: 3,
    username: "Player3",
    skinUrl: "/assets/blue-ghost.png",
    ready: true,
  },
  {
    id: 4,
    username: "Player4",
    skinUrl: "/assets/red-ghost.png",
    ready: true,
  },
  {
    id: 5,
    username: "Player5",
    skinUrl: "/assets/purple-ghost.png",
    ready: false,
  },
  {
    id: 6,
    username: "Player6",
    skinUrl: "/assets/starry-ghost.png",
    ready: true,
  },
  {
    id: 7,
    username: "Player7",
    skinUrl: "/assets/white-ghost.png",
    ready: false,
  },
  {
    id: 8,
    username: "Player8",
    skinUrl: "/assets/42-ghost.png",
    ready: true,
  },
];

const TournamentLobbyView: React.FC = () => {
  const [chatMessages, setChatMessages] = useState([
    { userId: 1, text: "Hello!" },
    { userId: 2, text: "Ready to play!" },
  ]);
  const [message, setMessage] = useState("");

  // Card size class (adjust as needed)
  const sizeClass = "w-[900px] h-[600px]";

  // todo: Replace 1 with current user id
  function handleSendMessage() {
    if (message.trim()) {
      setChatMessages([...chatMessages, { userId: 1, text: message }]);
      setMessage("");
    }
  }

  return (
    <Background>
      <Card className={`flex flex-row gap-8 p-8 ${sizeClass}`}>
        <ReadyPlayers players={players} />
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
