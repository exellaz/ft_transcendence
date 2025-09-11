import React, { useState } from "react";

import Background from "../components/Background";
import ProfileDropdown from "../components/ProfileDropdown";

import ProfilePopup from "../popups/ProfilePopup";
import BasicInfoPopup from "../popups/BasicInfoPopup";
import TournamentStatsPopup from "../popups/TournamentStatsPopup";
import FriendsPopup from "../popups/FriendsPopup";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  const [showTournamentStats, setShowTournamentStats] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  return (
    <Background>
      <ProfileDropdown
        setShowProfile={setShowProfile}
        setShowBasicInfo={setShowBasicInfo}
        setShowTournamentStats={setShowTournamentStats}
        setShowFriends={setShowFriends}
      />
      {children}
      <ProfilePopup
        open={showProfile}
        onClose={() => setShowProfile(false)}
      />
      <BasicInfoPopup
        open={showBasicInfo}
        onClose={() => setShowBasicInfo(false)}
      />
      <TournamentStatsPopup
        open={showTournamentStats}
        onClose={() => setShowTournamentStats(false)}
      />
      <FriendsPopup open={showFriends} onClose={() => setShowFriends(false)} />
    </Background>
  );
};

export default MainLayout;
