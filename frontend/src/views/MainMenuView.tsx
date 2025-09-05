import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import ProfileDropdown from "../components/ProfileDropdown";

import SettingsPopup from "../popups/SettingsPopup";
import JoinTournamentPopup from "../popups/JoinTournamentPopup";
import BasicInfoPopup from "../popups/BasicInfoPopup";
import TournamentStatsPopup from "../popups/TournamentStatsPopup";
import FriendsPopup from "../popups/FriendsPopup";
import BlockListPopup from "../popups/BlockListPopup";

const MainMenuView: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showJoinTournament, setShowJoinTournament] = useState(false);
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showTournamentStats, setShowTournamentStats] = useState(false);
  const [showBlockList, setShowBlockList] = useState(false);
  const navigate = useNavigate();

  return (
    <Background>
      <ProfileDropdown
        setShowBasicInfo={setShowBasicInfo}
        setShowTournamentStats={setShowTournamentStats}
        setShowFriends={setShowFriends}
        setShowBlockList={setShowBlockList}
      />
      <Card>
        <Logo />
        <Button variant="big" onClick={() => setShowJoinTournament(true)}>
          TOURNAMENT MODE
        </Button>
        <Button variant="big" onClick={() => navigate("/normal")}>
          NORMAL MODE
        </Button>
        <Button variant="big" onClick={() => setShowSettings(true)}>
          SETTINGS
        </Button>
      </Card>
      <SettingsPopup
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <JoinTournamentPopup
        open={showJoinTournament}
        onClose={() => setShowJoinTournament(false)}
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

export default MainMenuView;
