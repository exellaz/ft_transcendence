import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import ProfileDropdown from "../components/ProfileDropdown";

import CreateGamePopup from "../popups/CreateGamePopup";
import ProfilePopup from "../popups/ProfilePopup";
import BasicInfoPopup from "../popups/BasicInfoPopup";
import TournamentStatsPopup from "../popups/TournamentStatsPopup";
import FriendsPopup from "../popups/FriendsPopup";
import BlockListPopup from "../popups/BlockListPopup";

const MainMenuView: React.FC = () => {
  const [showCreateSinglesGame, setShowCreateSinglesGame] = useState(false);
  const [showCreateDoublesGame, setShowCreateDoublesGame] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showTournamentStats, setShowTournamentStats] = useState(false);
  const [showBlockList, setShowBlockList] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();

  return (
    <Background>
      <ProfileDropdown
        setShowProfile={setShowProfile}
        setShowBasicInfo={setShowBasicInfo}
        setShowTournamentStats={setShowTournamentStats}
        setShowFriends={setShowFriends}
        setShowBlockList={setShowBlockList}
        src={user?.avatarUrl}
      />
      <Card>
        <Logo />
        <Button variant="big" onClick={() => setShowCreateSinglesGame(true)}>
          SINGLES
        </Button>
        <Button variant="big" onClick={() => setShowCreateDoublesGame(true)}>
          DOUBLES
        </Button>
        <Button variant="big" onClick={() => navigate("/main-menu")}>
          BACK
        </Button>
      </Card>
      <CreateGamePopup
        gameType="singles"
        open={showCreateSinglesGame}
        onClose={() => setShowCreateSinglesGame(false)}
      />
      <CreateGamePopup
        gameType="doubles"
        open={showCreateDoublesGame}
        onClose={() => setShowCreateDoublesGame(false)}
      />
      <ProfilePopup
        open={showProfile}
        onClose={() => setShowProfile(false)}
        src={user?.avatarUrl}
      />
      <BasicInfoPopup
        open={showBasicInfo}
        onClose={() => setShowBasicInfo(false)}
        src={user?.avatarUrl}
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
