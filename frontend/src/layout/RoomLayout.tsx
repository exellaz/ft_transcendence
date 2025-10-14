import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../context/UserProvider";

import Background from "../components/Background";
import Button from "../components/Button";

import FriendsPopup from "../popups/FriendsPopup";
import RoomGameSettingsPopup from "../popups/RoomGameSettingsPopup";

interface RoomLayoutProps {
  children: React.ReactNode;
  isLeader: boolean | null;
}

const RoomLayout: React.FC<RoomLayoutProps> = ({ children, isLeader }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`RoomLayout.${key}`);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showInviteFriends, setShowInviteFriends] = useState(false);

  const { user } = useUser();
  const userId = user?.id ?? 0;

  const roomId = sessionStorage.getItem("RoomId");
  if (!roomId) return <div>{translate("no_room")}</div>;

  return (
    <Background>
      <div className="absolute top-10 right-10 flex-col-center gap-6 z-20">
        {isLeader === true && (
          <Button variant="profile" onClick={() => setShowGameSettings(true)}>
            {translate("game_settings")}
          </Button>
        )}
        <Button variant="profile" onClick={() => setShowInviteFriends(true)}>
          {translate("invite_friends")}
        </Button>
      </div>
      {children}
      <RoomGameSettingsPopup
        open={showGameSettings}
        onClose={() => setShowGameSettings(false)}
        roomId={roomId}
      />
      <FriendsPopup
        open={showInviteFriends}
        onClose={() => setShowInviteFriends(false)}
        userId={userId}
      />
    </Background>
  );
};

export default RoomLayout;
