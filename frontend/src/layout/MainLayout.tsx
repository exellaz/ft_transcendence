import React, { useState } from "react";
import { useUser } from "../context/UserContext";

import Background from "../components/Background";
import ProfileDropdown from "../components/ProfileDropdown";

import ProfilePopup from "../popups/ProfilePopup";
import BasicInfoPopup from "../popups/BasicInfoPopup";
import TournamentStatsPopup from "../popups/TournamentStatsPopup";
import FriendsPopup from "../popups/FriendsPopup";
import BlockListPopup from "../popups/BlockListPopup";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  const [showTournamentStats, setShowTournamentStats] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showBlockList, setShowBlockList] = useState(false);
  const { user } = useUser();

  return (
    <Background>
      <ProfileDropdown
        setShowProfile={setShowProfile}
        setShowBasicInfo={setShowBasicInfo}
        setShowTournamentStats={setShowTournamentStats}
        setShowFriends={setShowFriends}
        setShowBlockList={setShowBlockList}
      />
      {children}
      <ProfilePopup
        open={showProfile}
        onClose={() => setShowProfile(false)}
        src={user?.avatarUrl}
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
      <BlockListPopup
        open={showBlockList}
        onClose={() => setShowBlockList(false)}
      />
    </Background>
  );
};

export default MainLayout;
