import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import Logo from "../components/Logo";
import MainLayout from "../layout/MainLayout";
import Subheader from "../components/Subheader";

import ConfirmationPopup from "../popups/ConfirmationPopup";

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
    }
  };

  // Render buttons/content based on menuStep
  const renderMenu = () => {
    switch (menuStep) {
      case "action":
        return (
          <>
            <Subheader>{translate("choose_action")}</Subheader>
            <Button
              variant="bigYellow"
              onClick={() => setMenuStep("createRoom")}
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
                <Button>{translate("join_room")}</Button>
              </div>

              <Button onClick={handleBack}>{translate("back")}</Button>
            </div>
          </>
        );
        ``;
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <Card>
        <Logo />
        {renderMenu()}
      </Card>
      <ConfirmationPopup
        text={translate("create_singles_game")}
        open={showCreateSinglesGame}
        onClose={() => setShowCreateSinglesGame(false)}
        redirectPath="/singles-room"
      />
      <ConfirmationPopup
        text={translate("create_doubles_game")}
        open={showCreateDoublesGame}
        onClose={() => setShowCreateDoublesGame(false)}
        redirectPath="/doubles-room"
      />
      <ConfirmationPopup
        text={translate("join_singles_game")}
        open={showJoinSinglesGame}
        onClose={() => setShowJoinSinglesGame(false)}
        redirectPath="/singles-room"
      />
      <ConfirmationPopup
        text={translate("join_doubles_game")}
        open={showJoinDoublesGame}
        onClose={() => setShowJoinDoublesGame(false)}
        redirectPath="/doubles-room"
      />
    </MainLayout>
  );
};

export default NormalModeView;
