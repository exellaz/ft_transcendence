import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams} from "react-router-dom";
import { useUser } from "../../context/UserProvider";
import { getUserById } from "../../lib/usersApiClient"; // Import the function
import type { WaitingRoomPlayer } from "../../types/apiInterfaces";
import type { User } from "../../types/usersApi"; // Import the User type
import { toggleRoomPrivacy } from "../../lib/requestBackend.api";

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

import { useBlockLeave }from "../../utils/blockRefresh";

/**
 * @brief Singles Room
 * - Shows players, chat, and room controls
*/
const SinglesRoomView: React.FC = () => {
  useBlockLeave();
  const { t } = useTranslation();
  const translate = (key: string) => t(`SinglesRoomView.${key}`);
  const [players, setPlayers] = useState<WaitingRoomPlayer[]>([]);
  const [showLeaveRoom, setShowLeaveRoom] = useState(false);
  const navigate = useNavigate();
  const [roomInfo, setRoomInfo] = useState<{ name: string; leaderId: number; type: string; id: number } | null>(null);
  const { roomId: paramRoomId } = useParams();
  const roomId = sessionStorage.getItem("RoomId") || "";
  const { user } = useUser();
  const [userInfo, setUserinfo] = useState<User | null>(null);

  //function to toggle private and public room
  const handleTogglePrivacy = async () => {
    if (!roomInfo) return;
    try {
      const updated = await toggleRoomPrivacy(
        roomInfo.id,
        roomInfo.type === "public" // if current is public, make it private
      );

      // Update UI with new type from API response
      setRoomInfo((prev) =>
        prev ? { ...prev, type: updated.private ? "private" : "public" } : prev
      );
    } catch (err) {
      console.error("Failed to toggle room privacy:", err);
      alert("Could not update room privacy");
    }
  };


  // Fetch user info when the component mounts
  React.useEffect(() => {
    if (!user) return; // Ensure `user` is available

    const fetchUserInfo = async () => {
      try {
        const response = await getUserById({ id: Number(user.id) }); // Call the API
        if (response.success && response.data) {
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
        console.log("Fetched room info:", data);
        setRoomInfo({
		  id: Number(data.id),
          name: data.name,
          leaderId: Number(data.leader),
          type: data.private ? "private" : "public",
        });
      }).catch(err => {
        console.error("Failed to fetch room info:", err);
        // If fetching room info fails, navigate back to main menu
        navigate("/main-menu");
      });
  }, [roomId, navigate]);

  //-------------------------------- Websockets --------------------------------

  //live chat websocket
  const {
	chatMessages,
	message,
	setMessage,
	handleSendMsg
  } = useLiveChatWebSocket(roomInfo?.id ?? -1, { id: userInfo?.id ?? -1, name: userInfo?.username ?? "" });

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
  } = useRoomWebSocket({
    roomId: roomInfo?.id ?? -1,
    roomName: roomInfo?.name ?? "",
    leaderId: roomInfo?.leaderId ?? -1,
    player: {
        id: userInfo?.id ?? -1,
        name: userInfo?.username ?? "",
        avatar: userInfo?.avatarUrl ?? "../../assets/green-ghost.png",
    },
  });

//  if (!roomInfo || !userInfo) {
//    return <div>Loading...</div>; // or a spinner
//  }
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

  return (
	<>
	{!roomId ? (
		<h1>no room id</h1>
	) : (
    <RoomLayout isLeader={isLeader}>
	    {/* show countdown */}
	    {countdown !== null && (
          <p className="absolute -top-8 text-6xl font-bold text-white">
           {countdown > 0
             ? countdown
             : translate("game_start")}
          </p>
        )}
		<div className="relative w-full flex justify-center">
          <Card size="large" className="w-full max-w-4xl">
            <div className="w-full h-full flex-row-center gap-10">
              <div className="w-[50%] h-full flex-col-between gap-6">
                <TournamentHeader>
                  <div className="flex-row-center gap-2">
                    <p>{translate("singles_room")}</p>
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
                  </div>
                  <p>
                    ({translate("room_id")}: {roomInfo?.id})
                  </p>
                  {/* toggle private or public */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={roomInfo?.type === "private"}
                      onChange={handleTogglePrivacy}
					  disabled={!isLeader}
                    />
                    {/* Track with both words */}
                    <div className="w-30 h-8 rounded-full bg-card-blue flex text-xs font-bold text-white overflow-hidden">
                      <span className="w-1/2 flex items-center justify-center">Private</span>
                      <span className="w-1/2 flex items-center justify-center">Public</span>
                    </div>
                    {/* Cover the inactive side instead of active */}
                    <div
                      className={`absolute top-1 left-1 w-[calc(50%-0.25rem)] h-6 rounded-full transition-transform duration-300 bg-yellow-400`}
                      style={{
                        transform: roomInfo?.type === "private" ? "translateX(100%)" : "translateX(0)",
                      }}
                    ></div>
                  </label>
                </TournamentHeader>
	    		{/* player team block: check ready and switch button */}
                <ReadyRoomPlayers variant="singles" userId={userInfo?.id || -1} players={players} onSwitchTeam={onSwitch} />
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
	  </div>
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
	)}
	</>
  );
};

export default SinglesRoomView;
