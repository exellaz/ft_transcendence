import React, { useState } from "react";
import { useUser } from "../context/UserProvider";

import Background from "../components/Background";
import Button from "../components/Button";

import GameSettingsPopup from "../popups/GameSettingsPopup";
import InviteFriendsPopup from "../popups/InviteFriendsPopup";

interface RoomLayoutProps {
  children: React.ReactNode;
}

const RoomLayout: React.FC<RoomLayoutProps> = ({ children }) => {
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showInviteFriends, setShowInviteFriends] = useState(false);

  const { user } = useUser();
  const userUid = user?.id ?? "";

  return (
    <Background>
      <div className="absolute top-10 right-10 flex-col-center gap-6">
      <Button variant="profile" onClick={() => setShowGameSettings(true)}>Game Settings</Button>
      <Button variant="profile" onClick={() => setShowInviteFriends(true)}>Invite Friends</Button>
      
      </div>
      {children}
      <GameSettingsPopup
        open={showGameSettings}
        onClose={() => setShowGameSettings(false)}
      />
      <InviteFriendsPopup
        open={showInviteFriends}
        onClose={() => setShowInviteFriends(false)}
      />
    </Background>
  );
};

export default RoomLayout;
