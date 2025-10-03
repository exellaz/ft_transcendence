import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../context/UserProvider";

import Background from "../components/Background";
import Button from "../components/Button";

import FriendsPopup from "../popups/FriendsPopup";
import GameSettingsPopup, { type GameSettings } from "../popups/GameSettingsPopup";

interface RoomLayoutProps {
  gameSettings: GameSettings;
  onGameSettingsChange: (settings: GameSettings) => void;
  children: React.ReactNode;
}

const RoomLayout: React.FC<RoomLayoutProps> = ({ gameSettings, onGameSettingsChange, children }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`RoomLayout.${key}`);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showInviteFriends, setShowInviteFriends] = useState(false);

  const { user } = useUser();
  const userId = user?.id ?? 0;

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
        settings={gameSettings}
        onChange={onGameSettingsChange}
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
