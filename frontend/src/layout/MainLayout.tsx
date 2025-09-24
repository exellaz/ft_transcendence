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
  const userUid = user?.id ?? "";

  return (
    <Background>
      <ProfileDropdown
        setShowProfile={setShowProfile}
        setShowBasicInfo={setShowBasicInfo}
        setShowTournamentStats={setShowTournamentStats}
        setShowFriends={setShowFriends}
        userUid={userUid}
      />
      {children}
      <ProfilePopup
        open={showProfile}
        onClose={() => setShowProfile(false)}
        userUid={userUid}
      />
      <BasicInfoPopup
        open={showBasicInfo}
        onClose={() => setShowBasicInfo(false)}
        userUid={userUid}
      />
      <TournamentStatsPopup
        open={showTournamentStats}
        onClose={() => setShowTournamentStats(false)}
        userUid={userUid}
      />
      <FriendsPopup open={showFriends} onClose={() => setShowFriends(false)} />
    </Background>
  );
};

export default MainLayout;
