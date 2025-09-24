import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// import {
//   mockWaitingSinglesRoomPlayers,
//   mockSinglesRoomLiveChat,
// } from "../../data/mockUsers";
import type {
  WaitingRoomPlayer,
  LiveChatMessage,
} from "../../types/apiInterfaces";
import { useNavigate } from "react-router-dom";

import { formatTimestamp } from "../../utils/date";

import Button from "../../components/Button";
import Card from "../../components/Card";
import TournamentHeader from "../../components/TournamentHeader";
import LiveChat from "../../components/LiveChat";
import ReadyRoomPlayers from "../../components/ReadyRoomPlayers";
import RoomLayout from "../../layout/RoomLayout";

import ConfirmationPopup from "../../popups/ConfirmationPopup";

import { useRoomWebSocket } from "./room-websocket";

const SinglesRoomView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`SinglesRoomView.${key}`);
  const [players, setPlayers] = useState<WaitingRoomPlayer[]>([]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [showLeaveRoom, setShowLeaveRoom] = useState(false);
  const navigate = useNavigate();

  // TODO: Replace with actual room ID from route or context
  const roomId = sessionStorage.getItem("pongRoomId") || "t1";
  const roomName = sessionStorage.getItem("pongRoomName") || "Room 1";
  const leaderId = sessionStorage.getItem("pongRoomLeaderId") || "1";

  ////debug
  //   console.log("Room Leader ID:", leaderId);
  //   console.log("roomId:", roomId);
  //   console.log("roomName:", roomName);
  //   console.log("user id", sessionStorage.getItem("pongClientId"));

  const {
	socket,
	statusText,
	playerText,
	leftTeamHtml,
	rightTeamHtml,
	isLeader,
	role,
	ready,
	setReady,
	gameStarted,
	canStart,
  } = useRoomWebSocket({roomId, roomName, leaderId});

  ////debug
//   console.log("WebSocket:", socket);
//   console.log("status:", statusText);
//   console.log("Player info:", playerText);
//   console.log("Left team HTML:", leftTeamHtml);
//   console.log("Right team HTML:", rightTeamHtml);
//   console.log("Is leader:", isLeader);
//   console.log("Role:", role);
//   console.log("Ready status:", ready);
//   console.log("Set ready function:", setReady);
//   console.log("Game started:", gameStarted);
//   console.log("Can start game:", canStart);

  React.useEffect(() => {
    // Split HTML strings back into arrays
    const leftTeam = leftTeamHtml
      ? leftTeamHtml.split("\n").map((line) => {
          const match = line.match(/(✦?)(.+?) \[(.+?)\] \((.+?)\)/);
          if (!match) return null;
          const [, leaderMark, username, uid, role] = match;
          return {
            leader: !!leaderMark,
            uid,
            username: username.trim(),
            spriteUrl: "/assets/default.png", // TODO: replace with real sprite
            ready: false, // you’ll need to update this based on server info
            team: "left" as const,
          };
        }).filter(Boolean)
      : [];

    const rightTeam = rightTeamHtml
      ? rightTeamHtml.split("\n").map((line) => {
          const match = line.match(/(✦?)(.+?) \[(.+?)\] \((.+?)\)/);
          if (!match) return null;
          const [, leaderMark, username, uid, role] = match;
          return {
            leader: !!leaderMark,
            uid,
            username: username.trim(),
            spriteUrl: "/assets/default.png",
            ready: false,
            team: "right" as const,
          };
        }).filter(Boolean)
      : [];

    setPlayers(
      [...leftTeam, ...rightTeam].filter(Boolean) as WaitingRoomPlayer[]
    );
  }, [leftTeamHtml, rightTeamHtml]);

////debug
// console.log("leftTeamHtml:", leftTeamHtml);
// console.log("rightTeamHtml:", rightTeamHtml);
// console.log("Parsed players:", players);

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
//   React.useEffect(() => {
//     setPlayers(mockWaitingSinglesRoomPlayers["t1"]);
//     setChatMessages(mockSinglesRoomLiveChat["t1"]);
//   }, []);


  function onSwitch() {
    if (ready || !socket) return;
    const newSide = role.startsWith("left") ? "right" : "left";
    socket.send(JSON.stringify({ type: "switchSide", side: newSide }));
  }

  function onReady() {
    if (isLeader || !socket) return;
    const newReady = !ready;
    setReady(newReady);
    socket.send(JSON.stringify({ type: "ready", ready: newReady }));
  }

  function onStartBtn() {
    if (!isLeader || !socket) return;
    socket.send(JSON.stringify({ type: "start", start: true }));
  }

  function onLeave() {
    try { socket?.close(); } catch {}
    sessionStorage.removeItem("pongRoomName");
    sessionStorage.removeItem("pongRoomId");
	navigate("/main-menu");
  }

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
        <div className="w-full h-full flex-row-center gap-10">
          <div className="w-[50%] h-full flex-col-between gap-6">
            <TournamentHeader>
              <div className="flex-row-center gap-2">
                <p>{translate("singles_room")}</p>
                <img
                  src="/assets/link.png"
                  className="w-6 h-6 cursor-pointer hover:scale-110 transition-all duration-200 active:scale-95"
                />
              </div>
              <p>
                ({translate("room_id")}: {roomId})
              </p>
            </TournamentHeader>
            <ReadyRoomPlayers variant="singles" players={players} onSwitchTeam={onSwitch} />
			<div className="flex-row-center gap-6">
			  {/* Ready button (not for leader) */}
			  {!isLeader && (
			    <Button variant="green" onClick={onReady}>
			      {ready ? translate("unready") : translate("ready")}
			    </Button>
			  )}

			  {/* Start button (leader only) */}
			  {isLeader && (
			    <Button
			      variant="green"
			      disabled={!canStart}
			      onClick={onStartBtn}
			    >
			      {translate("start_game")}
			    </Button>
			  )}

			  {/* Leave button */}
			  <Button variant="red" onClick={onLeave}>
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

export default SinglesRoomView;
