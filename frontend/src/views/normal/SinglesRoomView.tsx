import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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

/**
 * @brief Singles Room
 * - Shows players, chat, and room controls
*/
const SinglesRoomView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`SinglesRoomView.${key}`);
  const [players, setPlayers] = useState<WaitingRoomPlayer[]>([]);
  const [showLeaveRoom, setShowLeaveRoom] = useState(false);
  const navigate = useNavigate();

  // TODO: Replace with actual JWT
  const roomId = sessionStorage.getItem("RoomId");
  if (!roomId) return <div>{translate("no_room_id")}</div>;
  const roomName = sessionStorage.getItem("RoomName");
  if (!roomName) return <div>{translate("no_room_name")}</div>;
  const leaderId = sessionStorage.getItem("RoomLeaderId") || "";
  const roomType = sessionStorage.getItem("RoomType") || "";

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
	gameStarted,
  } = useRoomWebSocket({roomId, roomName, leaderId});

  // -------------------------------- Effect --------------------------------
  //navigate to game view if game started
  React.useEffect(() => {
    if (gameStarted) {
      sessionStorage.setItem("playerSide", role.startsWith("left") ? "left" : "right");
      navigate("/game");
    }
  }, [gameStarted, navigate]);


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
    <RoomLayout>
      <Card size="large">
        <div className="w-full h-full flex-row-center gap-10">
          <div className="w-[50%] h-full flex-col-between gap-6">
            <TournamentHeader>
              <div className="flex-row-center gap-2">
                <p>{translate("singles_room")}</p>
                {roomType === "private" && (
                  <>
                    <img
                    src="/assets/link.png"
                    className="w-6 h-6 cursor-pointer hover:scale-110 transition-all duration-200 active:scale-95"
                    onClick={() => {
                      if (roomId) {
                        navigator.clipboard.writeText(roomId).then(() => {
                        // Optional: show toast or alert
                        alert("Room ID copied to clipboard!");
                        }).catch(err => {
                        console.error("Failed to copy:", err);
                        });
                      }
                    }}
                    />
                  </>
                )}
              </div>
                {roomType === "private" && (
                  <>
                    <p>
                      ({translate("room_id")}: {roomId})
                    </p>
                  </>
                )}
            </TournamentHeader>
			{/* player team block: check ready and switch button */}
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
			      {translate("start")}
			    </Button>
			  )}
			  {/* Leave button */}
			  <Button variant="red" onClick={() => setShowLeaveRoom(true)}>
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
	  {/* confirm to leave room */}
      <ConfirmationPopup
        text={translate("leave_confirmation")}
        open={showLeaveRoom}
        onClose={() => {setShowLeaveRoom(false)}}
		onConfirm={() => {
			onLeave();
			navigate("/main-menu");
		}}
      />
    </RoomLayout>
  );
};

export default SinglesRoomView;
