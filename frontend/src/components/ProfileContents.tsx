import React, { useEffect, useState } from "react";
import type { Profile } from "../types/socialTypes";
import { mockProfiles } from "../data/mockUsers";

import Avatar from "./Avatar";
import Medals from "./Medals";
import StatsBadge from "./StatsBadge";

interface ProfileContentsProps {
  userUid: string;
}

const ProfileContents: React.FC<ProfileContentsProps> = ({ userUid }) => {
  const [user, setUser] = useState<Profile | null>(null);

  // TODO: Fetch real data based on userUID
  // useEffect(() => {
  //   // Fetch profile
  //   fetch(`/api/profile?userUid=${userUID}`)
  //     .then((res) => res.json())
  //     .then(setUser);
  // }, [userUID]);

  // TODO: Delete when API is integrated
  function getProfileByUid(
    userUID: string,
    data: Profile[]
  ): Profile | undefined {
    return data.find((user) => user.uid === userUID);
  }
  useEffect(() => {
    setUser(getProfileByUid(userUid, mockProfiles) || null);
  }, [userUid]);

  if (!user) return <div>Loading...</div>;

  return (
  <div>
    <div className="py-4 w-full flex items-center justify-center gap-6">
      <div>
        <Avatar src={user.avatarUrl} size={100} />
      </div>
      <div className="text-left">
        <p className="text-white text-xl font-bold" title={user.username}>
          {user
            ? user.username.length > 10
              ? user.username.slice(0, 10) + "…"
              : user.username
            : "Username"}
        </p>
        <p className="text-white">ID: {user.uid}</p>
        <p className="text-white">Joined: {user.joinDate}</p>
      </div>
    </div>
    <div className="py-4 w-full flex gap-6 justify-center">
      <Medals
        gold={user.stats.medals.gold}
        silver={user.stats.medals.silver}
        bronze={user.stats.medals.bronze}
      />
    </div>
    <div className="py-4 w-full flex gap-6">
      <StatsBadge
        className="flex-1"
        label="Tournaments Played"
        value={user.stats.tournamentsPlayed}
      />
      <StatsBadge
        className="flex-1"
        label="Average Ranking"
        value={user.stats.averageRanking}
      />
    </div>
  </div>
);}

export default ProfileContents;
