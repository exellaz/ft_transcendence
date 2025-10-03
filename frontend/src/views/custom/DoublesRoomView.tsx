import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  mockWaitingDoublesRoomPlayers,
  mockDoublesRoomLiveChat,
} from "../../data/mockUsers";
import type {
  WaitingRoomPlayer,
  LiveChatMessage,
} from "../../types/apiInterfaces";

import { formatTimestamp } from "../../utils/date";

import Button from "../../components/Button";
import Card from "../../components/Card";
import TournamentHeader from "../../components/TournamentHeader";
import LiveChat from "../../components/LiveChat";
import ReadyRoomPlayers from "../../components/ReadyRoomPlayers";
import RoomLayout from "../../layout/RoomLayout";

import ConfirmationPopup from "../../popups/ConfirmationPopup";

const DoublesRoomView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`DoublesRoomView.${key}`);
  const [players, setPlayers] = useState<WaitingRoomPlayer[]>([]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [showLeaveRoom, setShowLeaveRoom] = useState(false);

  // TODO: Replace with actual room ID from route or context
  const roomId = "t1";

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
    setPlayers(mockWaitingDoublesRoomPlayers["t1"]);
    setChatMessages(mockDoublesRoomLiveChat["t1"]);
  }, []);

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

  return (
    <RoomLayout>
      <Card size="large">
        <div className="w-full h-full flex-row-center gap-10">
          <div className="w-[50%] h-full flex-col-between gap-6">
            <TournamentHeader>
              <div className="flex-row-center gap-2">
                <p>{translate("doubles_room")}</p>
                <img
                  src="/assets/link.png"
                  className="w-6 h-6 cursor-pointer hover:scale-110 transition-all duration-200 active:scale-95"
                />
              </div>
              <p>
                ({translate("room_id")}: {roomId})
              </p>
            </TournamentHeader>
            <ReadyRoomPlayers variant="doubles" players={players} />
            <div className="flex-row-center gap-6">
              <Button variant="green">{translate("ready")}</Button>
              <Button variant="red" onClick={() => setShowLeaveRoom(true)}>
                {translate("leave_room")}
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
        text={translate("leave_confirmation")}
        open={showLeaveRoom}
        onClose={() => setShowLeaveRoom(false)}
        redirectPath="/main-menu"
      />
    </RoomLayout>
  );
};

export default DoublesRoomView;
