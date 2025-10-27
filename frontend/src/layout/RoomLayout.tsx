import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../context/UserProvider";
import { toast, ToastContainer } from "react-toastify";
import type { FriendChatMessage } from "../types/friendsApi";

import Background from "../components/Background";
import Button from "../components/Button";

import ChooseSpritePopup from "../popups/ChooseSpritePopup";
import FriendsPopup from "../popups/FriendsPopup";
import RoomGameSettingsPopup from "../popups/RoomGameSettingsPopup";

interface RoomLayoutProps {
  children: React.ReactNode;
  isLeader: boolean | null;
  selectedSprite: string;
  onSelectSprite: (sprite: string) => void;
}

const RoomLayout: React.FC<RoomLayoutProps> = ({
  children,
  isLeader,
  selectedSprite,
  onSelectSprite,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`RoomLayout.${key}`);
  const [showChooseSprite, setShowChooseSprite] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showInviteFriends, setShowInviteFriends] = useState(false);

  const { user } = useUser();
  const userId = user?.id ?? 0;

  const roomId = sessionStorage.getItem("RoomId");
  if (!roomId) return <div>{translate("no_room")}</div>;

  const showInviteFriendsRef = useRef(showInviteFriends);
  useEffect(() => {
    const handler = (event: CustomEvent<FriendChatMessage>) => {
      // showInviteFriendsRef.current always holds the latest value of showInviteFriends.
      if (!showInviteFriendsRef.current) {
        toast.info(
          `New message from ${event.detail.senderId}: ${event.detail.message}`
        );
      }
    };

    window.addEventListener("newMessage", handler as EventListener);

    return () => {
      window.removeEventListener("newMessage", handler as EventListener);
    };
  }, []);

  return (
    <Background>
      <ToastContainer />
      <div className="absolute top-10 right-10 flex-col-center gap-6 z-20">
        <Button variant="profile" onClick={() => setShowChooseSprite(true)}>
          {translate("choose_sprite")}
        </Button>
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
      <ChooseSpritePopup
        open={showChooseSprite}
        onClose={() => setShowChooseSprite(false)}
        selected={selectedSprite}
        onSelectSprite={onSelectSprite}
      />
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
