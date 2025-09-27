import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../context/UserProvider";

import Background from "../components/Background";
import Button from "../components/Button";

import GameSettingsPopup from "../popups/GameSettingsPopup";
import InviteFriendsPopup from "../popups/InviteFriendsPopup";

interface RoomLayoutProps {
  children: React.ReactNode;
}

const RoomLayout: React.FC<RoomLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`RoomLayout.${key}`);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showInviteFriends, setShowInviteFriends] = useState(false);

  const { user } = useUser();
  const userUid = user?.id ?? "";
  const roomId = sessionStorage.getItem("pongRoomId");
  if (!roomId) return <div>{translate("no_room")}</div>;

  return (
    <Background>
      <div className="absolute top-10 right-10 flex-col-center gap-6">
        <Button variant="profile" onClick={() => setShowGameSettings(true)}>
          {translate("game_settings")}
        </Button>
        <Button variant="profile" onClick={() => setShowInviteFriends(true)}>
          {translate("invite_friends")}
        </Button>
      </div>
      {children}
      <GameSettingsPopup
        open={showGameSettings}
        onClose={() => setShowGameSettings(false)}
        roomId={roomId}
      />
      <InviteFriendsPopup
        open={showInviteFriends}
        onClose={() => setShowInviteFriends(false)}
      />
    </Background>
  );
};

export default RoomLayout;
