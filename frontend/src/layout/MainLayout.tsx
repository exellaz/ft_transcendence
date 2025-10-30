import React, { useState } from "react";
import { useUser } from "../context/UserProvider";

import Background from "../components/Background";
import ProfileDropdown from "../components/ProfileDropdown";

import BasicInfoPopup from "../popups/BasicInfoPopup";
import FriendsPopup from "../popups/FriendsPopup";
import HowToPlayPopup from "../popups/HowToPlayPopup";
import ProfilePopup from "../popups/ProfilePopup";
import TournamentStatsPopup from "../popups/TournamentStatsPopup";
import TwoFAPopup from "../popups/TwoFAPopup";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  const [showTwoFA, setShowTwoFA] = useState(false);
  const [showTournamentStats, setShowTournamentStats] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const { user } = useUser();
  const userId = user?.id ?? 0;

  return (
    <Background>
      <ProfileDropdown
        setShowProfile={setShowProfile}
        setShowBasicInfo={setShowBasicInfo}
        setShowTwoFA={setShowTwoFA}
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
      <TwoFAPopup
        open={showTwoFA}
        onClose={() => setShowTwoFA(false)}
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
