import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Profile } from "../types/apiInterfaces";
import { mockProfiles } from "../data/mockUsers";

import Avatar from "./Avatar";
import Medals from "./Medals";
import StatsBadge from "./StatsBadge";

interface ProfileContentsProps {
  userUid: string;
}

const ProfileContents: React.FC<ProfileContentsProps> = ({ userUid }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ProfileContents.${key}`);
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

  if (!user) return <div>{translate("loading")}</div>;

  return (
    <>
      <div className="w-full flex-row-center gap-6">
        <div>
          <Avatar src={user.avatarUrl} size={100} />
        </div>
        <div className="flex flex-col text-white text-xl">
          <p className="font-bold" title={user.username}>
            {user.username.length > 10
              ? user.username.slice(0, 10) + "…"
              : user.username}
          </p>
          <p>ID: {user.uid}</p>
          <p>
            {translate("joined")}: {user.joinDate}
          </p>
        </div>
      </div>
      <Medals
        gold={user.stats.medals.gold}
        silver={user.stats.medals.silver}
        bronze={user.stats.medals.bronze}
      />
      <div className="w-full flex justify-around">
        <StatsBadge
          className="w-[40%]"
          label={translate("tournaments_played")}
          value={user.stats.tournamentsPlayed}
        />
        <StatsBadge
          className="w-[40%]"
          label={translate("average_ranking")}
          value={user.stats.averageRanking}
        />
      </div>
    </>
  );
};

export default ProfileContents;
