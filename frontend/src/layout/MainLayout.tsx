import React, { useState, useEffect, useRef } from "react";
import { useUser } from "../context/UserProvider";
import { toast, ToastContainer } from "react-toastify";
import type { FriendChatMessage } from "../types/friendsApi";

import Background from "../components/Background";
import ProfileDropdown from "../components/ProfileDropdown";

import BasicInfoPopup from "../popups/BasicInfoPopup";
import FriendsPopup from "../popups/FriendsPopup";
import HowToPlayPopup from "../popups/HowToPlayPopup";
import ProfilePopup from "../popups/ProfilePopup";
import TournamentStatsPopup from "../popups/TournamentStatsPopup";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  const [showTournamentStats, setShowTournamentStats] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const { user } = useUser();
  const userId = user?.id ?? 0;

  const showFriendsRef = useRef(showFriends);
  useEffect(() => {
    const handler = (event: CustomEvent<FriendChatMessage>) => {
      // showFriendsRef.current always holds the latest value of showFriends.
      if (!showFriendsRef.current) {
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
      <ProfileDropdown
        setShowProfile={setShowProfile}
        setShowBasicInfo={setShowBasicInfo}
        setShowTournamentStats={setShowTournamentStats}
        setShowFriends={setShowFriends}
        setShowHowToPlay={setShowHowToPlay}
        userId={userId}
      />
      {children}
      <ProfilePopup
        open={showProfile}
        onClose={() => setShowProfile(false)}
        selectedId={userId}
      />
      <BasicInfoPopup
        open={showBasicInfo}
        onClose={() => setShowBasicInfo(false)}
        userId={userId}
      />
      <TournamentStatsPopup
        open={showTournamentStats}
        onClose={() => setShowTournamentStats(false)}
        userId={userId}
      />
      <FriendsPopup
        open={showFriends}
        onClose={() => setShowFriends(false)}
        userId={userId}
      />
      <HowToPlayPopup
        open={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />
    </Background>
  );
};

export default MainLayout;
