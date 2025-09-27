import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Logo from "../components/Logo";
import MainLayout from "../layout/MainLayout";
import Subheader from "../components/Subheader";
import Status from "../components/Status";
import ConfirmationPopup from "../popups/ConfirmationPopup";

//backend API
import { createRoomAPI, fetchRooms, ensureClientId } from "../lib/requestBackend.api";

/**
 * @brief casual game
 * - Create private room
 * - Quick join public room
*/
const NormalModeView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`NormalModeView.${key}`);
  const navigate = useNavigate();
  const [menuStep, setMenuStep] = useState("action");
  const [roomId, setRoomId] = useState("");
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
	const clientId = ensureClientId();
	const scale = Math.min(
	  window.innerWidth / 800,
	  window.innerHeight / 400,
	  1
	);
	const width = 800 * scale;
	const height = 400 * scale;

	const room = await createRoomAPI(
	  teamSize,
	  `Room ${teamSize}v${teamSize}`,
	  width,
	  height,
	  { leaderId: clientId, isPrivate }
	);
	if (room) {
	  // always handle both id and roomId
	  const roomIdToUse = room.id || room.roomId;
	  sessionStorage.setItem("pongRoomId", roomIdToUse);
	  sessionStorage.setItem("pongRoomName", room.name);
	  sessionStorage.setItem("pongRoomLeaderId", room.leaderId); // consistent key
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
	sessionStorage.setItem("pongRoomId", roomIdToUse);
	sessionStorage.setItem("pongRoomName", room.name);
	sessionStorage.setItem("pongRoomLeaderId", room.leaderId);
	navigate(getRoomPath(room.teamSize, roomIdToUse), { state: { room } });
  }

  //join private room - fetch rooms from API, find the room by ID, then navigate to the room
  async function handleJoinPrivateRoom() {
	//find room by ID
	const rooms = await fetchRooms();
	const room = rooms.find((r: any) => r.id === roomId.trim());

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
	sessionStorage.setItem("pongRoomId", room.id);
	sessionStorage.setItem("pongRoomName", room.name);
	navigate(getRoomPath(room.teamSize, room.id), { state: { room } });
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
			  onClick={() => {
				setStatus(null); // reset the error to null to prevent show old error
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
				{status && <Status text={status.text} color={status.color} className="mb-4" />} {/* show error status */}
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
	  <Card>
		<Logo />
		{renderMenu()}
	  </Card>

	  {/* confirm to navigate to the place you request */}
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

export default NormalModeView;
