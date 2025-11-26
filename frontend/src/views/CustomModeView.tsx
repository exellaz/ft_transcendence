import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserProvider";
import { useClearGameMode } from "../hooks/useClearGameMode";

import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Logo from "../components/Logo";
import MainLayout from "../layout/MainLayout";
import Subheader from "../components/Subheader";
import Background from "../components/Background";
import ConfirmationPopup from "../popups/ConfirmationPopup";

//backend API
import { createRoomAPI, fetchRooms } from "../lib/requestBackend.api";
import type {
  listRoomsResponse,
  Room,
} from "../../../backend/src/types/interface";
/**
 * @brief casual game
 * - Create private room
 * - Quick join public room
 */
const CustomModeView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`CustomModeView.${key}`);
  const navigate = useNavigate();
  const { user } = useUser();
  //  const userId = user?.id ?? "";
  const [menuStep, setMenuStep] = useState("action");
  const [roomId, setRoomId] = useState("");
  const [showCreateLocalGame, setShowCreateLocalGame] = useState(false);
  const [showCreateSinglesGame, setShowCreateSinglesGame] = useState(false);
  const [showCreateDoublesGame, setShowCreateDoublesGame] = useState(false);
  const [showJoinSinglesGame, setShowJoinSinglesGame] = useState(false);
  const [showJoinDoublesGame, setShowJoinDoublesGame] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  useClearGameMode();

  // ------------------------------- Helper Functions -------------------------------
  //get room path base on team size
  function getRoomPath(teamSize: number, roomId: string) {
    if (teamSize === 1) return `/singles-room/${roomId}`;
    if (teamSize === 2) return `/doubles-room/${roomId}`;
    return "/";
  }

  //private room - owner create room from API and navigate to the room
  async function handleCreateRoom(teamSize: number, isPrivate: boolean) {
    if (!user) return;

    const room = await createRoomAPI(
      teamSize,
      teamSize === 1 ? "Singles Room" : "Doubles Room",
      { leaderId: user.id, isPrivate },
    );
    //console.log("user id: ", typeof user?.id); ////debug
    //console.log("private room:", room); //// debug
    if (room) {
      // always handle both id and roomId
      const roomIdToUse = room.id || room.roomId;
      sessionStorage.setItem("RoomId", roomIdToUse);
      navigate(getRoomPath(teamSize, roomIdToUse), { state: { room } });
    } else {
      alert("Failed to create room");
    }
  }

  //quick join public room - fetch rooms from API, find a suitable room or create one if none available, then navigate to the room
  async function handleQuickJoin(teamSize: number) {
    if (!user) return;
    //find a public room that is not full and not started
    const rooms = await fetchRooms();
    //console.log("all rooms:", rooms); //// debug
    let room = rooms.find(
      (r: listRoomsResponse) =>
        r.teamSize === teamSize &&
        r.leftPlayers + r.rightPlayers < r.teamSize * 2 &&
        r.private === false,
    );

    // if no room, create one
    if (!room) {
      room = await createRoomAPI(
        teamSize,
        teamSize === 1 ? "Singles Room" : "Doubles Room",
        { leaderId: user.id, isPrivate: false },
      );

      if (!room) {
        alert("Failed to create public room");
        return;
      }
    }

    //if had room, navigate to itLiveChat
    const roomIdToUse = room.id || room.roomId || "";
    if (!roomIdToUse || roomIdToUse === "") {
      setRoomError(translate("room_not_found"));
      return;
    }
    sessionStorage.setItem("RoomId", roomIdToUse);
    navigate(getRoomPath(room.teamSize, roomIdToUse), { state: { room } });
  }

  //join private room - fetch rooms from API, find the room by ID, then navigate to the room
  async function handleJoinPrivateRoom() {
    //find room by ID
    const inputId = roomId.trim();
    const rooms = await fetchRooms();
    const room = rooms.find(
      (r: Room) => (r.id && r.id.toString() === inputId) || r.private === true,
    );

    //if no room, show error
    if (!room) {
      setRoomError(translate("room_not_found"));
      return;
    }
    if (room.leftPlayers + room.rightPlayers >= room.teamSize * 2) {
      setRoomError(translate("room_is_full"));
      return;
    }

    //if found room, navigate to it
    const roomIdToUse = room.id || room.roomId;
    sessionStorage.setItem("RoomId", roomIdToUse);
    navigate(getRoomPath(room.teamSize, roomIdToUse), { state: { room } });
  }

  // Helper to go back one step
  const handleBack = () => {
    if (menuStep === "action") {
      navigate("/main-menu");
    } else if (menuStep === "createRoom") {
      setMenuStep("action");
    } else if (menuStep === "joinOptions") {
      setMenuStep("action");
    } else if (menuStep === "quickJoin" || menuStep === "privateJoin") {
      setMenuStep("joinOptions");
      setRoomId(""); // reset room id input
    }
  };

  // ---------------------------------------- Render Menu ---------------------------------------------
  // Render buttons/content based on menuStep
  const renderMenu = () => {
    switch (menuStep) {
      case "action":
        return (
          <>
            <Subheader>{translate("choose_action")}</Subheader>
            <Button
              variant="bigYellow"
              onClick={() => setShowCreateLocalGame(true)}
            >
              {translate("play_locally")}
            </Button>
            <Button
              variant="bigYellow"
              onClick={() => {
                setMenuStep("createRoom");
              }}
            >
              {translate("create_room")}
            </Button>
            <Button
              variant="bigYellow"
              onClick={() => setMenuStep("joinOptions")}
            >
              {translate("join_room")}
            </Button>
            <Button onClick={handleBack}>{translate("back")}</Button>
          </>
        );
      case "createRoom":
        return (
          <>
            <Subheader>{translate("choose_type")}</Subheader>
            <Button
              variant="bigYellow"
              onClick={() => setShowCreateSinglesGame(true)}
            >
              {translate("singles")}
            </Button>
            <Button
              variant="bigYellow"
              onClick={() => setShowCreateDoublesGame(true)}
            >
              {translate("doubles")}
            </Button>
            <Button onClick={handleBack}>{translate("back")}</Button>
          </>
        );
      case "joinOptions":
        return (
          <>
            <Subheader>{translate("choose_join")}</Subheader>
            <Button
              variant="bigYellow"
              onClick={() => setMenuStep("quickJoin")}
            >
              {translate("quick_join")}
            </Button>
            <Button
              variant="bigYellow"
              onClick={() => setMenuStep("privateJoin")}
            >
              {translate("join_private")}
            </Button>
            <Button onClick={handleBack}>{translate("back")}</Button>
          </>
        );
      case "quickJoin":
        return (
          <>
            <Subheader>{translate("choose_type")}</Subheader>
            <Button
              variant="bigYellow"
              onClick={() => setShowJoinSinglesGame(true)}
            >
              {translate("singles")}
            </Button>
            <Button
              variant="bigYellow"
              onClick={() => setShowJoinDoublesGame(true)}
            >
              {translate("doubles")}
            </Button>
            <Button onClick={handleBack}>{translate("back")}</Button>
          </>
        );
      case "privateJoin":
        return (
          <>
            <div className="w-full h-full flex-col-around">
              <div className="w-full h-[300px] flex-col-around rounded-3xl border-gray-300 border-3 p-10">
                <p className="text-white text-xl font-bold">
                  {translate("enter_room_id")}
                </p>
                {/* Room ID input */}
                <Input
                  placeholder={translate("enter_room_id")}
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  maxLength={6}
                />
                {/* error popup for key in room id */}
                {roomError && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <Background variant="grass">
                      <div className="absolute inset-0 bg-black opacity-70"></div>
                      <div className="relative flex flex-col items-center gap-6 bg-card-blue border-yellow-600 border-10 rounded-3xl shadow-2xl p-10 z-10">
                        <p className="text-center text-white text-2xl px-4">
                          {roomError}
                        </p>
                        <Button
                          variant="red"
                          onClick={() => setRoomError(null)}
                        >
                          {translate("close")}
                        </Button>
                      </div>
                    </Background>
                  </div>
                )}
                {/* button for join room */}
                <Button onClick={handleJoinPrivateRoom}>
                  {translate("join_room")}
                </Button>
              </div>

              <Button onClick={handleBack}>{translate("back")}</Button>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // ---------------------------------------- Render the Normal Mode Menu ---------------------------------------------
  return (
    <MainLayout>
      <Card className="gap-6">
        <Logo />
        {renderMenu()}
      </Card>
      <ConfirmationPopup
        text={translate("create_local_game")}
        open={showCreateLocalGame}
        onClose={() => setShowCreateLocalGame(false)}
        redirectPath="/local-game-setup"
      />
      <ConfirmationPopup
        text={translate("create_singles_game")}
        open={showCreateSinglesGame}
        onClose={() => setShowCreateSinglesGame(false)}
        onConfirm={() => handleCreateRoom(1, false)}
      />
      <ConfirmationPopup
        text={translate("create_doubles_game")}
        open={showCreateDoublesGame}
        onClose={() => setShowCreateDoublesGame(false)}
        onConfirm={() => handleCreateRoom(2, false)}
      />
      <ConfirmationPopup
        text={translate("join_singles_game")}
        open={showJoinSinglesGame}
        onClose={() => setShowJoinSinglesGame(false)}
        onConfirm={() => handleQuickJoin(1)}
      />
      <ConfirmationPopup
        text={translate("join_doubles_game")}
        open={showJoinDoublesGame}
        onClose={() => setShowJoinDoublesGame(false)}
        onConfirm={() => handleQuickJoin(2)}
      />
    </MainLayout>
  );
};

export default CustomModeView;
