import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TournamentStats } from "../types/apiInterfaces";
// TODO: Remove mock data import when integrating real API
import { mockTournamentStats } from "../data/mockUsers";

import Header from "../components/Header";
import Medals from "../components/Medals";
import PopupCard from "../components/PopupCard";
import StatsBadge from "../components/StatsBadge";
import Subheader from "../components/Subheader";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userUid: string;
}

const TournamentStatsPopup: React.FC<PopupProps> = ({
  open,
  onClose,
  userUid,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`TournamentStatsPopup.${key}`);
  const [user, setUser] = useState<TournamentStats | null>(null);
  const [expandedIdx, setExpandedIdx] = React.useState<number | null>(null);

  // TODO: Fetch real data based on userUid
  // useEffect(() => {
  //   // Fetch user's tournament stats
  //   fetch(`/api/tournament-stats?userUid=${userUid}`)
  //     .then((res) => res.json())
  //     .then(setUser);
  // }, [userUid]);

  // TODO: Delete when API is integrated
  function getTournamentStatsByUid(
    userUid: string,
    data: TournamentStats[]
  ): TournamentStats | undefined {
    return data.find((user) => user.uid === userUid);
  }
  useEffect(() => {
    setUser(getTournamentStatsByUid(userUid, mockTournamentStats) || null);
  }, [userUid]);

  if (!user) return <div>{translate("loading")}</div>;

  function handleClose() {
    onClose();
    setExpandedIdx(null);
  }

  return (
    <PopupCard open={open} onClose={handleClose}>
      <div className="overflow-y-auto scrollbar-hide">
        <Header>{translate("header")}</Header>
        <div className="w-full flex flex-col items-center gap-6">
          <Subheader>{translate("summary")}</Subheader>
          <Medals
            gold={user.medals.gold}
            silver={user.medals.silver}
            bronze={user.medals.bronze}
          />
          <div className="flex gap-6">
            <StatsBadge
              className="flex-1"
              label={translate("tournaments_played")}
              value={user.tournamentsPlayed}
            />
            <StatsBadge
              className="flex-1"
              label={translate("average_ranking")}
              value={user.averageRanking}
            />
          </div>
          <Subheader>{translate("history")}</Subheader>
          <table className="w-full text-center text-xl">
            <thead>
              <tr className="text-yellow-400 font-bold">
                <th className="py-2 px-4">{translate("no")}</th>
                <th className="py-2 px-4">{translate("date")}</th>
                <th className="py-2 px-4">{translate("ranking")}</th>
              </tr>
            </thead>
            <tbody>
              {user.tournaments.map((t, idx) => (
                <React.Fragment key={t.tournamentId}>
                  <tr
                    className={`text-white ${
                      idx % 2 === 0 ? "bg-input-gray" : ""
                    } border-b border-input-gray cursor-pointer`}
                    onClick={() =>
                      setExpandedIdx(expandedIdx === idx ? null : idx)
                    }
                  >
                    <td className="py-2 px-4">{idx + 1}</td>
                    <td className="py-2 px-4">{t.date}</td>
                    <td className="py-2 px-4 font-bold">
                      {t.ranking === 1 ? (
                        <img
                          src="/assets/gold.png"
                          alt="Gold"
                          title={translate("medals.gold")}
                          className="inline-block w-6"
                        />
                      ) : t.ranking === 2 ? (
                        <img
                          src="/assets/silver.png"
                          alt="Silver"
                          title={translate("medals.silver")}
                          className="inline-block w-6"
                        />
                      ) : t.ranking === 3 ? (
                        <img
                          src="/assets/bronze.png"
                          alt="Bronze"
                          title={translate("medals.bronze")}
                          className="inline-block w-6"
                        />
                      ) : (
                        t.ranking
                      )}
                    </td>
                  </tr>
                  {expandedIdx === idx && t.matches && (
                    <tr>
                      <td colSpan={3} className="border-gray-300 border-3 p-4">
                        <table className="w-full text-center text-base">
                          <thead>
                            <tr className="text-yellow-400">
                              <th className="py-1 px-2">{translate("match")}</th>
                              <th className="py-1 px-2">{translate("opponent")}</th>
                              <th className="py-1 px-2">{translate("score")}</th>
                              <th className="py-1 px-2">{translate("result")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.matches.map((m, mIdx) => (
                              <tr key={mIdx} className="text-white">
                                <td
                                  className="py-1 px-2"
                                  title={
                                    m.match === "QF"
                                      ? translate("quarterfinals")
                                      : m.match === "SF"
                                      ? translate("semifinals")
                                      : m.match === "F"
                                      ? translate("finals")
                                      : ""
                                  }
                                >
                                  {m.match}
                                </td>
                                <td
                                  className="py-1 px-2"
                                  title={m.opponentUsername}
                                >
                                  {m.opponentUsername.length > 10
                                    ? m.opponentUsername.slice(0, 10) + "…"
                                    : m.opponentUsername}
                                </td>
                                <td className="py-1 px-2">{m.score}</td>
                                <td className="py-1 px-2 font-bold">
                                  {m.result === "win" ? (
                                    <span className="text-green-400">{translate("won")}</span>
                                  ) : (
                                    <span className="text-red-400">{translate("lost")}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PopupCard>
  );
};

export default TournamentStatsPopup;
