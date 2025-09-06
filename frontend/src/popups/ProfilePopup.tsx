import React from "react";
import { useUser } from "../context/UserContext";

import Avatar from "../components/Avatar";
import Button from "../components/Button";
import Header from "../components/Header";
import Medals from "../components/Medals";
import PopupCard from "../components/PopupCard";
import StatsBadge from "../components/StatsBadge";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  src?: string;
}

const ProfilePopup: React.FC<PopupProps> = ({ open, onClose, src }) => {
  const { user } = useUser();

  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>Profile</Header>
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-6">
          <Avatar src={src} size={100} />
          <div className="text-center">
            <p className="text-white font-bold">Username: {user?.username}</p>
            <p className="text-white">ID: {user?.id}</p>
            <p className="text-white">Joined: {user?.createdAt}</p>
          </div>
        </div>
        <Medals
          gold={user?.stats.medals.gold}
          silver={user?.stats.medals.silver}
          bronze={user?.stats.medals.bronze}
        />
        <div className="flex gap-6">
          <StatsBadge
          className="flex-1"
            label="Tournaments Played"
            value={user?.stats.tournamentsPlayed}
          />
          <StatsBadge
          className="flex-1"
            label="Average Ranking"
            value={user?.stats.averageRanking}
          />
        </div>
        <div className="flex gap-6">
          <Button variant="yellow" className="flex-1">
            Add Friend
          </Button>
          <Button variant="yellow" className="flex-1">
            Block
          </Button>
        </div>
      </div>
    </PopupCard>
  );
};

export default ProfilePopup;
