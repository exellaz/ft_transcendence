import React from "react";
import { useTranslation } from "react-i18next";
// TODO: Delete when API is integrated
// import type { Profile } from "../types/apiInterfaces";
// import { mockProfiles } from "../data/mockUsers";
import { useApiQuery } from "../hooks/useApi";
import { getUserById } from "../lib/usersApiClient";
import type { User } from "../types/usersApi";
import { getTournamentStatsRequest } from "../lib/tournamentApiClient";
import type { TournamentStats } from "../types/tournamentApi";
import { formatDate } from "../utils/date";

import {
  LoadingState,
  ErrorState,
  NotFoundState,
} from "../components/ApiState";
import Avatar from "./Avatar";
import Medals from "./Medals";
import StatsBadge from "./StatsBadge";

interface ProfileContentsProps {
  userId: number;
}

const ProfileContents: React.FC<ProfileContentsProps> = ({ userId }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ProfileContents.${key}`);

  // API query for user data
  const {
    data: user,
    loading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useApiQuery<User>(
    () => getUserById({ id: userId }),
    [open],
    userId !== 0
  );

  // API query for tournament stats data
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApiQuery<TournamentStats>(
    () => getTournamentStatsRequest({ id: userId }),
    [open],
    userId !== 0
  );

  // TODO: Delete when API is integrated
  // const [user, setUser] = useState<Profile | null>(null);
  // function getProfileById(
  //   userId: number,
  //   data: Profile[],
  // ): Profile | undefined {
  //   return data.find((user) => user.id === userId);
  // }
  // useEffect(() => {
  //   setUser(getProfileById(userId, mockProfiles) || null);
  // }, [userId]);

  let contents: React.ReactNode;
  
    if (userLoading || statsLoading) contents = <LoadingState />;
    else if (userError) contents = <ErrorState error={userError} onRetry={refetchUser} />;
    else if (statsError) contents = <ErrorState error={statsError} onRetry={refetchStats} />;
    else if (!user || !stats) contents = <NotFoundState />;
    else
      contents = (<>
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
          <p>ID: {user.id}</p>
          <p>
            {translate("joined")}: {formatDate(user.joinedAt)}
          </p>
        </div>
      </div>
      <Medals
        gold={stats.firstPlace}
        silver={stats.secondPlace}
        bronze={stats.thirdPlace}
      />
      <div className="w-full flex justify-around">
        <StatsBadge
          className="w-[40%]"
          label={translate("tournaments_played")}
          value={stats.completedTournaments}
        />
        <StatsBadge
          className="w-[40%]"
          label={translate("average_ranking")}
          value={stats.averageRanking}
        />
      </div>
    </>
  );
  return contents;
};

export default ProfileContents;
