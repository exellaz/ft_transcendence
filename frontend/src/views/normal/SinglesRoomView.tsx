import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  mockWaitingSinglesRoomPlayers,
  mockSinglesRoomLiveChat,
} from "../../data/mockUsers";
import type { WaitingPlayer, LiveChatMessage } from "../../types/apiInterfaces";

import { formatTimestamp } from "../../utils/date";

import Button from "../../components/Button";
import Card from "../../components/Card";
import Header from "../../components/Header";
import LiveChat from "../../components/LiveChat";
import ReadyPlayers from "../../components/ReadyPlayers";
import RoomLayout from "../../layout/RoomLayout";

import ConfirmationPopup from "../../popups/ConfirmationPopup";

const SinglesRoomView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`SinglesRoomView.${key}`);
  const [players, setPlayers] = useState<WaitingPlayer[]>([]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [showLeaveRoom, setShowLeaveRoom] = useState(false);

  // TODO: Fetch real data based on roomId
  // React.useEffect(() => {
  //   // Replace with real API calls
  //   fetch(`/api/players?roomId=${roomId}`)
  //     .then((res) => res.json())
  //     .then(setPlayers);
  //   fetch(`/api/messages?roomId=${roomId}`)
  //     .then((res) => res.json())
  //     .then(setChatMessages);
  // }, [roomId]);

  // TODO: Remove mock data when integrating real API
  React.useEffect(() => {
    setPlayers(mockWaitingSinglesRoomPlayers["t1"]);
    setChatMessages(mockSinglesRoomLiveChat["t1"]);
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

  return (
    <RoomLayout>
      <Card size="large">
        <div className="w-full h-full flex-row-center gap-6">
          <div className="w-[50%] h-full flex-col-between">
            <Header>Singles Room</Header>
            <ReadyPlayers players={players} />
            <div className="flex-row-center gap-6">
              <Button variant="green">Ready</Button>
              <Button variant="red" onClick={() => setShowLeaveRoom(true)}>
                Leave Room
              </Button>
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
        text="Are you sure you want to leave the room?"
        open={showLeaveRoom}
        onClose={() => setShowLeaveRoom(false)}
        redirectPath="/main-menu"
      />
    </RoomLayout>
  );
};

export default SinglesRoomView;
