import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import type { WaitingRoomPlayer } from "../../types/apiInterfaces";

// components
import Button from "../../components/Button";
import Card from "../../components/Card";
import TournamentHeader from "../../components/TournamentHeader";
import LiveChat from "../../components/LiveChat";
import ReadyRoomPlayers from "../../components/ReadyRoomPlayers";
import RoomLayout from "../../layout/RoomLayout";
import ConfirmationPopup from "../../popups/ConfirmationPopup";

// hooks
import { useRoomWebSocket } from "../../lib/room-websocket";
import { useLiveChatWebSocket } from "../../lib/liveChat-websocket";

import { useBlockLeave } from "../../utils/blockRefresh";


/**
 * @brief Doubles Room
 * - Shows players, chat, and room controls
*/
const DoublesRoomView: React.FC = () => {
  useBlockLeave();
  const { t } = useTranslation();
  const translate = (key: string) => t(`DoublesRoomView.${key}`);
  const [players, setPlayers] = useState<WaitingRoomPlayer[]>([]);
  const [showLeaveRoom, setShowLeaveRoom] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [roomInfo, setRoomInfo] = useState<{ name: string; leaderId: string; type: string; id: string } | null>(null);
  const { roomId: paramRoomId } = useParams();
  const joinType = (location.state as any)?.joinType || "private";
  const roomId = sessionStorage.getItem("RoomId") || "";

  //update session storage when paramRoomId change
  React.useEffect(() => {
  	if (paramRoomId) {
  		sessionStorage.setItem("RoomId", paramRoomId);
  	}
  }, [paramRoomId]);

  //fetch room info when request roomId change
  React.useEffect(() => {
  if (!roomId) return;
	fetch(`${import.meta.env.VITE_API_URL}/room/${roomId}`)
	.then(res => res.json())
	.then(data => {
		if (joinType === "private" && !data.private) {
			sessionStorage.removeItem("RoomId");
			alert("⚠️ this is a public room");
			navigate("/main-menu");
			return;
		}
		setRoomInfo({
			id: data.id,
			name: data.name,
			leaderId: data.leader,
			type: data.private ? "private" : "public",
		});
	});
  }, [roomId, joinType, navigate]);

  //-------------------------------- Websockets --------------------------------
  //live chat websocket
  const {
    chatMessages,
    message,
    setMessage,
    handleSendMsg
  } = useLiveChatWebSocket(roomId);

  //room websocket
  const {
    leftTeamHtml,
    rightTeamHtml,
    isLeader,
    ready,
    canStart,
    onSwitch,
    onReady,
    onStartBtn,
    onLeave,
    role,
	countdown,
  } = useRoomWebSocket({roomId: roomInfo?.id || "", roomName: roomInfo?.name || "", leaderId: roomInfo?.leaderId || ""});

  // -------------------------------- Effect --------------------------------
  //navigate to game view if game started
  React.useEffect(() => {
	//when count down finish delay 1 sec to start game
	if (countdown === 0) {
	  const timer = setTimeout(() => {
		sessionStorage.setItem("playerSide", role.startsWith("left") ? "left" : "right");
		navigate("/game");
	  }, 1000);
	  return () => clearTimeout(timer);
	}
  }, [countdown, navigate, role]);

  //get left and right team players from leftTeamHtml and rightTeamHtml
  React.useEffect(() => {
    const leftTeam = Array.isArray(leftTeamHtml) ? leftTeamHtml : [];
    console.log("leftTeam:", leftTeam); //// debug
    const rightTeam = Array.isArray(rightTeamHtml) ? rightTeamHtml : [];
    console.log("rightTeam:", rightTeam); //// debug
    setPlayers([...leftTeam, ...rightTeam]);
  }, [leftTeamHtml, rightTeamHtml]);

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

  return (
	<>
	{!roomId ? (
		<h1>no room id</h1>
	) : (
    <RoomLayout isLeader={isLeader}>
		<div className="relative w-full flex justify-center">
			{/* show countdown */}
	        {countdown !== null && (
              <p className="absolute -top-8 text-6xl font-bold text-white">
               {countdown > 0
                 ? countdown
                 : translate("game_start")}
              </p>
            )}
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
					{/* player team block: check ready and switch button */}
					<ReadyRoomPlayers variant="doubles" players={players} onSwitchTeam={onSwitch} />
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
						{translate("start")}
						</Button>
					)}

					{/* Leave button */}
					<Button variant="red" onClick={() => { onLeave(); navigate("/main-menu"); }}>
						{translate("leave_room")}
					</Button>
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
		</div>
	  {/* confirm to leave room */}
      <ConfirmationPopup
        text={translate("leave_confirmation")}
        open={showLeaveRoom}
        onClose={() => setShowLeaveRoom(false)}
        redirectPath="/main-menu"
      />
    </RoomLayout>
	)}
	</>
  );
};

export default DoublesRoomView;
