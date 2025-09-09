import React from "react";
import Avatar from "./Avatar";
import Medals from "./Medals";
import StatsBadge from "./StatsBadge";
import Button from "./Button";
import Header from "./Header";
import type { UserProfile } from "../context/User";

interface ProfileContentsProps {
  user: UserProfile | null;
}

const ProfileContents: React.FC<ProfileContentsProps> = ({
  user,
}) => (
  <>
    
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-6">
        <Avatar src={user?.avatarUrl} size={100} />
        <div className="text-center">
          <p className="text-white font-bold">Username: {user?.username}</p>
          <p className="text-white">ID: {user?.id}</p>
          <p className="text-white">Joined: {user?.createdAt}</p>
        </div>
      </div>
      <Medals
        gold={user?.stats?.medals.gold}
        silver={user?.stats?.medals.silver}
        bronze={user?.stats?.medals.bronze}
      />
      <div className="flex gap-6">
        <StatsBadge
          className="flex-1"
          label="Tournaments Played"
          value={user?.stats?.tournamentsPlayed}
        />
        <StatsBadge
          className="flex-1"
          label="Average Ranking"
          value={user?.stats?.averageRanking}
        />
      </div>
        {/* <div className="flex gap-6">
          <Button variant="yellow" className="flex-1">
            Add Friend
          </Button>
          <Button variant="yellow" className="flex-1">
            Block
          </Button>
        </div> */}
    </div>
  </>
);

export default ProfileContents;
