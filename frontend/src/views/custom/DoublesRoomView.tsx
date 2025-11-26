import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserProvider";
import { getUserById } from "../../lib/usersApiClient"; // Import the function
import type { WaitingRoomPlayer } from "../../types/apiInterfaces";
import type { User } from "../../types/usersApi"; // Import the User type

// components
import Background from "../../components/Background";
import Button from "../../components/Button";
import Card from "../../components/Card";
import TournamentHeader from "../../components/TournamentHeader";
import LiveChat from "../../components/LiveChat";
import ReadyRoomPlayers from "../../components/ReadyRoomPlayers";
import RoomLayout from "../../layout/RoomLayout";

// popups
import ConfirmationPopup from "../../popups/ConfirmationPopup";
import ProfilePopup from "../../popups/ProfilePopup";

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
  const [roomInfo, setRoomInfo] = useState<{
    name: string;
    leaderId: number;
    type: string;
    id: number;
  } | null>(null);
  const roomId = sessionStorage.getItem("RoomId") || "";
  const { user } = useUser();
  const [canConnect, setCanConnect] = React.useState(false);
  const userId = user?.id ?? 0;
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [sprite, setSprite] = useState<string>("/assets/yellow-ghost.png");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // If there's no RoomId stored (i.e. user didn't come from the app), force navigation away.
  React.useEffect(() => {
    if (!roomId) {
      navigate("/main-menu");
    }
  }, [roomId, navigate]);

  // prevent player from reloading the page
  React.useEffect(() => {
    if (sessionStorage.getItem("reloading") !== null) {
      sessionStorage.removeItem("reloading");
      navigate("/main-menu");
    }
  }, []);

  //function to toggle private and public room
  const handleTogglePrivacy = () => {
    if (!roomInfo || !isLeader || !socket) return;

    // Determine the new privacy status
    const newPrivate = roomInfo.type === "public"; // true → make private

    // Send WebSocket message to backend
    socket?.send(
      JSON.stringify({
        type: "togglePrivacy",
        private: newPrivate,
      }),
    );

    // Optimistically update the UI
    setRoomInfo((prev) =>
      prev ? { ...prev, type: newPrivate ? "private" : "public" } : prev,
    );
  };

  // function to update sprite change to other users
  function handleSelectSprite(newSprite: string) {
    setSprite(newSprite);
    onChangeSprite?.(newSprite);
  }

  // Fetch user info when the component mounts
  React.useEffect(() => {
    if (!user) return; // Ensure `user` is available

    const fetchUserInfo = async () => {
      try {
        const response = await getUserById({ id: Number(user.id) }); // Call the API
        if (response.success && response.data) {
          setUserInfo(response.data); // Store the user info
        } else {
          //  console.log("Failed to fetch user info"); // Handle API error
        }
      } catch (err) {
        console.error("Error fetching user info:", err);
        console.error("An error occurred while fetching user info"); // Handle fetch error
      }
    };

    fetchUserInfo();
  }, [user]);

  //fetch room info when request roomId change
  React.useEffect(() => {
    if (!roomId) return;
    fetch(`${import.meta.env.VITE_API_URL}/room/${roomId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        //console.log("Fetched room info:", data);
        setRoomInfo({
          id: Number(data.id),
          name: data.name,
          leaderId: Number(data.leader),
          type: data.private ? "private" : "public",
        });
      })
      .catch((err) => {
        console.error("Failed to fetch room info:", err);
        // If fetching room info fails, navigate back to main menu
        navigate("/main-menu");
      });
  }, [roomId, navigate]);

  // perform network check before attempting to connect socket
  React.useEffect(() => {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    if (isOnline) {
      setCanConnect(true);
    }
  }, []);

  //-------------------------------- Websockets --------------------------------
  //live chat websocket
  const { chatMessages, message, setMessage, handleSendMsg } =
    useLiveChatWebSocket(roomInfo?.id || -1, {
      id: userInfo?.id || -1,
      name: userInfo?.username ?? "",
    });

  //room websocket
  const {
    socket,
    leftTeamHtml,
    rightTeamHtml,
    isLeader,
    ready,
    canStart,
    onSwitch,
    onReady,
    onStartBtn,
    onLeave,
    onChangeSprite,
    role,
    countdown,
    roomError,
  } = useRoomWebSocket(
    {
      roomId: roomInfo?.id || -1,
      roomName: roomInfo?.name || "",
      leaderId: roomInfo?.leaderId || -1,
      player: {
        id: userInfo?.id || -1,
        name: userInfo?.username ?? "",
        sprite: sprite,
      },
      setRoomInfo,
    },
    { autoConnect: canConnect },
  );

  // -------------------------------- Effect --------------------------------
  //navigate to game view if game started
  React.useEffect(() => {
    //when count down finish delay 1 sec to start game
    if (countdown === 0) {
      const timer = setTimeout(() => {
        sessionStorage.setItem(
          "playerSide",
          role.startsWith("left") ? "left" : "right",
        );
        sessionStorage.setItem("playerSprite", sprite);
        sessionStorage.setItem("gameMode", "remote");
        navigate("/game");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, navigate, role]);

  //get left and right team players from leftTeamHtml and rightTeamHtml
  React.useEffect(() => {
    type RemotePlayer = {
      clientId?: number;
      id?: number;
      username?: string;
      playerName?: string;
      spriteUrl: string;
      avatarUrl?: string;
      role?: string;
      team?: "left" | "right" | "spectator";
      leader?: boolean;
      ready?: boolean;
      online?: boolean;
    };
    const leftTeam = Array.isArray(leftTeamHtml)
      ? (leftTeamHtml as unknown as RemotePlayer[])
      : [];
    //console.log("leftTeam:", leftTeam); //// debug
    const rightTeam = Array.isArray(rightTeamHtml)
      ? (rightTeamHtml as unknown as RemotePlayer[])
      : [];
    //console.log("rightTeam:", rightTeam); //// debug
    const mapToWaiting = (p: RemotePlayer): WaitingRoomPlayer => ({
      leader: !!p.leader,
      id: p.id || -1,
      username: p.username || p.playerName || "Unknown",
      spriteUrl: p.spriteUrl || p.avatarUrl || "../../assets/green-ghost.png",
      team: p.team === "left" ? "left" : p.team === "right" ? "right" : "right",
      ready: !!p.ready,
    });

    setPlayers([...leftTeam.map(mapToWaiting), ...rightTeam.map(mapToWaiting)]);
  }, [leftTeamHtml, rightTeamHtml]);

  // ---------------------------------- helper functions ----------------------------------
  function renderRoomErrorText(): string | null {
    if (!roomError) return null;

    if (roomError === "Room is full") {
      return translate("room_is_full");
    } else if (roomError === "offline_error") {
      return translate("offline_error");
    } else {
      return roomError;
    }
  }

  // -------------------------------- Render --------------------------------
  return (
    <>
      {!roomId ? (
        <h1>no room id</h1>
      ) : (
        <RoomLayout
          isLeader={isLeader}
          selectedSprite={sprite}
          onSelectSprite={handleSelectSprite}
        >
          <div className="relative w-full flex justify-center">
            <Card size="large">
              {/* show countdown */}
              {countdown !== null && (
                <p className="absolute -top-8 text-6xl font-bold text-white">
                  {countdown > 0 ? countdown : translate("game_start")}
                </p>
              )}
              <div className="w-full h-full flex-row-center gap-10">
                <div className="w-[50%] h-full flex-col-between gap-6">
                  <TournamentHeader>
                    <div className="flex-row-center gap-2">
                      <p>{translate("doubles_room")}</p>
                      <img
                        src="/assets/copy.png"
                        className="w-6 h-6 cursor-pointer hover:scale-110 transition-all duration-200 active:scale-95"
                        onClick={() => {
                          if (roomId) {
                            navigator.clipboard
                              .writeText(roomId)
                              .then(() => {
                                // Optional: show toast or alert
                                alert(translate("copied"));
                              })
                              .catch((err) => {
                                console.error("Failed to copy:", err);
                              });
                          }
                        }}
                      />
                    </div>
                    <p>
                      ({translate("room_id")}: {roomId})
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
                        <span className="w-1/2 flex items-center justify-center">
                          {translate("private")}
                        </span>
                        <span className="w-1/2 flex items-center justify-center">
                          {translate("public")}
                        </span>
                      </div>
                      {/* Cover the inactive side instead of active */}
                      <div
                        className={`absolute top-1 left-1 w-[calc(50%-0.25rem)] h-6 rounded-full transition-transform duration-300 bg-yellow-400`}
                        style={{
                          transform:
                            roomInfo?.type === "private"
                              ? "translateX(100%)"
                              : "translateX(0)",
                        }}
                      ></div>
                    </label>
                  </TournamentHeader>
                  {/* player team block: check ready and switch button */}
                  <ReadyRoomPlayers
                    variant="doubles"
                    userId={userInfo?.id || -1}
                    players={players}
                    onSwitchTeam={onSwitch}
                    onSelect={setSelectedId}
                    countdownStarted={countdown !== null}
                  />
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
                    <Button
                      variant="red"
                      onClick={() => setShowLeaveRoom(true)}
                    >
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

          {/* error popup */}
          {roomError && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Background image using your Background component */}
              <Background variant="grass">
                {/* Optional dark overlay on top of the background */}
                <div className="absolute inset-0 bg-black opacity-70"></div>
                {/* Popup content */}
                <div className="relative flex flex-col items-center gap-6 bg-card-blue border-yellow-600 border-10 rounded-3xl shadow-2xl p-10 z-10">
                  <p className="text-center text-white text-2xl px-4">
                    {renderRoomErrorText()}
                  </p>
                  <Button
                    variant="red"
                    onClick={() => {
                      onLeave();
                      navigate("/main-menu");
                    }}
                  >
                    {translate("close")}
                  </Button>
                </div>
              </Background>
            </div>
          )}

          {/* confirm to leave room */}
          <ConfirmationPopup
            text={translate("leave_confirmation")}
            open={showLeaveRoom}
            onClose={() => setShowLeaveRoom(false)}
            onConfirm={() => {
              onLeave();
              navigate("/main-menu");
            }}
          />
          {selectedId && (
            <ProfilePopup
              open={true}
              onClose={() => setSelectedId(null)}
              selectedId={selectedId}
              variant={selectedId === userId ? "self" : "other"}
            />
          )}
        </RoomLayout>
      )}
    </>
  );
};

export default DoublesRoomView;
