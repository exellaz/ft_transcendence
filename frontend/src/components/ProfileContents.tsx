import React from "react";
import { useTranslation } from "react-i18next";
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
  selectedId: number;
}

const ProfileContents: React.FC<ProfileContentsProps> = ({ selectedId }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ProfileContents.${key}`);

  // API query for user data
  const {
    data: user,
    loading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useApiQuery<User>(
    () => getUserById({ id: selectedId }),
    [open],
    selectedId !== 0,
  );

  // API query for tournament stats data
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApiQuery<TournamentStats>(
    () => getTournamentStatsRequest({ id: selectedId }),
    [open],
    selectedId !== 0,
  );

  let contents: React.ReactNode;

  if (userLoading || statsLoading) contents = <LoadingState />;
  else if (userError) contents = <ErrorState onRetry={refetchUser} />;
  else if (statsError) contents = <ErrorState onRetry={refetchStats} />;
  else if (!user || !stats) contents = <NotFoundState />;
  else
    contents = (
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
