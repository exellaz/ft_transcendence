import React from "react";
import type { UserProfile } from "../context/User";

import Avatar from "./Avatar";
import Medals from "./Medals";
import StatsBadge from "./StatsBadge";

interface ProfileContentsProps {
  user: UserProfile | null;
}

const ProfileContents: React.FC<ProfileContentsProps> = ({ user }) => (
  <div>
    <div className="py-4 w-full flex items-center justify-center gap-6">
      <div>
        <Avatar src={user?.avatarUrl} size={100} />
      </div>
      <div className="text-left">
        <p className="text-white text-xl font-bold" title={user?.username}>
          {user
            ? user?.username.length > 10
              ? user?.username.slice(0, 10) + "…"
              : user?.username
            : "Username"}
        </p>
        <p className="text-white">ID: {user?.id}</p>
        <p className="text-white">Joined: {user?.createdAt}</p>
      </div>
    </div>
    <div className="py-4 w-full flex gap-6 justify-center">
      <Medals
        gold={user?.stats?.medals.gold}
        silver={user?.stats?.medals.silver}
        bronze={user?.stats?.medals.bronze}
      />
    </div>
    <div className="py-4 w-full flex gap-6">
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
  </div>
);

export default ProfileContents;
