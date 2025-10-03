import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserProvider";

import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Logo from "../components/Logo";
import MainLayout from "../layout/MainLayout";
import Subheader from "../components/Subheader";
import Status from "../components/Status";
import ConfirmationPopup from "../popups/ConfirmationPopup";

//backend API
import { createRoomAPI, fetchRooms } from "../lib/requestBackend.api";
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
  const [status, setStatus] = useState<{ text: string; color: "green" | "red" } | null>(null);


  // ------------------------------- Helper Functions -------------------------------
  //get room path base on team size
  function getRoomPath(teamSize: number, roomId: string) {
	if (teamSize === 1) return `/singles-room/${roomId}`;
	if (teamSize === 2) return `/doubles-room/${roomId}`;
	return "/";
  }

  //private room - owner create room from API and navigate to the room
  async function handleCreateRoom(teamSize: number, isPrivate: boolean) {
    //TODO replace with JWT
    //const userResponse = await getUserById({ id: Number(userId) });
    //let userInfo;
    //if (userResponse.success && userResponse.data) {
    //    userInfo = userResponse.data;
    //}
    //if (!userInfo) return;
    if (!user) return;
    //TODO handle user info
	const scale = Math.min(
	  window.innerWidth / 800,
	  window.innerHeight / 400,
	  1
	);
	const width = 800 * scale;
	const height = 400 * scale;

	const room = await createRoomAPI(
	  teamSize,
	  teamSize === 1 ? "Singles Room" : "Doubles Room",
	  width,
	  height,
	  { leaderId: user.id, isPrivate }
	);
    console.log("user id: ", typeof user?.id); ////debug
    console.log("private room:", room); //// debug
	if (room) {
	  // always handle both id and roomId
	  const roomIdToUse = room.id || room.roomId;
	  navigate(getRoomPath(teamSize, roomIdToUse), { state: { room } });
	} else {
	  setStatus({ text: "❌ Failed to create room", color: "red" });
	}
  }

  //quick join public room - fetch rooms from API, find a suitable room or create one if none available, then navigate to the room
  async function handleQuickJoin(teamSize: number) {
	//find a public room that is not full and not started
	const rooms = await fetchRooms();
	let room = rooms.find(
	  (r: any) =>
		r.teamSize === teamSize &&
		!r.gameStarted &&
		(r.leftPlayers + r.rightPlayers) < r.teamSize * 2 &&
		r.private === false
	);

	// if no room, create one
	if (!room) {
		const scale = Math.min(window.innerWidth / 800, window.innerHeight / 400, 1);
		const width = 800 * scale;
		const height = 400 * scale;
		room = await createRoomAPI(teamSize, `Public ${teamSize}v${teamSize}`, width, height, { isPrivate: false });

		if (!room) {
			alert ("Failed to create public room");
			return;
		}
	}

	//if had room, navigate to it
	const roomIdToUse = room.id || room.roomId;
	// sessionStorage.setItem("RoomId", roomIdToUse);
	// sessionStorage.setItem("RoomName", room.name);
	// sessionStorage.setItem("RoomLeaderId", room.leaderId);
    // sessionStorage.setItem("RoomType", "public");
	navigate(getRoomPath(room.teamSize, roomIdToUse), { state: { room, joinType: "public" } });
  }

  //join private room - fetch rooms from API, find the room by ID, then navigate to the room
  async function handleJoinPrivateRoom() {
	//find room by ID
	const inputId = roomId.trim();
	const rooms = await fetchRooms();
	const room = rooms.find((r: any) =>
			  (r.id && r.id.toString() === inputId) ||
			  (r.roomId && r.roomId.toString() === inputId)
			  && r.private === true
			);

	//if no room, show error
	if (!room) {
	  setStatus({ text: "❌ Room not found", color: "red" });
	  return;
	}
	if (room.leftPlayers + room.rightPlayers >= room.teamSize * 2) {
	  setStatus({ text: "❌ Room is full", color: "red" });
	  return;
	}

	//if found room, navigate to it
	// sessionStorage.setItem("RoomId", room.id);
	// sessionStorage.setItem("RoomName", room.name);
    // sessionStorage.setItem("RoomType", "private");
	navigate(getRoomPath(room.teamSize, room.id), { state: { room, joinType: "private" } });
  }

  // Helper to go back one step
  const handleBack = () => {
	setStatus(null); // reset the error to null to prevent show old error
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
                setStatus(null);
                setMenuStep("createRoom")
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
                <Input
                  placeholder={translate("enter_room_id")}
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
                {status && <Status text={status.text} color={status.color} className="mb-4"/>}
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
        redirectPath="/local-game"
      />
      <ConfirmationPopup
        text={translate("create_singles_game")}
        open={showCreateSinglesGame}
        onClose={() => setShowCreateSinglesGame(false)}
        onConfirm={() => handleCreateRoom(1, true)}
      />
      <ConfirmationPopup
        text={translate("create_doubles_game")}
        open={showCreateDoublesGame}
        onClose={() => setShowCreateDoublesGame(false)}
        onConfirm={() => handleCreateRoom(2, true)}
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
