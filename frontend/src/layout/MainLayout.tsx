import React, { useState } from "react";
import { useUser } from "../context/UserProvider";

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

  const { user } = useUser();
  const userId = user?.id ?? 0;

  return (
    <Background>
      <ProfileDropdown
        setShowProfile={setShowProfile}
        setShowBasicInfo={setShowBasicInfo}
        setShowTournamentStats={setShowTournamentStats}
        setShowFriends={setShowFriends}
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
    </Background>
  );
};

export default MainLayout;
