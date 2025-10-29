import React from "react";
import { useTranslation } from "react-i18next";
import { useApiQuery } from "../hooks/useApi";
import {
  getTournamentStatsRequest,
  getTournamentHistoryRequest,
} from "../lib/tournamentApiClient";
import type {
  TournamentStats,
  TournamentHistory,
} from "../types/tournamentApi";

import {
  LoadingState,
  ErrorState,
  NotFoundState,
} from "../components/ApiState";
import Header from "../components/Header";
import Medals from "../components/Medals";
import PopupCard from "../components/PopupCard";
import StatsBadge from "../components/StatsBadge";
import Subheader from "../components/Subheader";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userId: number;
}

const TournamentStatsPopup: React.FC<PopupProps> = ({
  open,
  onClose,
  userId,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`TournamentStatsPopup.${key}`);
  const [expandedIdx, setExpandedIdx] = React.useState<number | null>(null);

  // API query for tournament stats data
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApiQuery<TournamentStats>(
    () => getTournamentStatsRequest({ id: userId }),
    [open],
    userId !== 0,
  );

  // API query for tournament history data
  const {
    data: history,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useApiQuery<TournamentHistory[]>(
    () => getTournamentHistoryRequest({ id: userId }),
    [open],
    userId !== 0,
  );

  function handleClose() {
    onClose();
    setExpandedIdx(null);
  }

  const cellPadding = "py-2 px-4";
  const cellPaddingCollapsible = "py-1 px-2";

  let statsChildren: React.ReactNode;
  if (statsLoading) statsChildren = <LoadingState />;
  else if (statsError) statsChildren = <ErrorState onRetry={refetchStats} />;
  else if (!stats) statsChildren = <NotFoundState />;
  else
    statsChildren = (
      <>
        <Medals
          gold={stats.firstPlace}
          silver={stats.secondPlace}
          bronze={stats.thirdPlace}
        />
        <div className="w-full flex justify-around">
          <StatsBadge
            className="w-2/5"
            label={translate("tournaments_played")}
            value={stats.completedTournaments}
          />
          <StatsBadge
            className="w-2/5"
            label={translate("average_ranking")}
            value={stats.averageRanking}
          />
        </div>
      </>
    );

  let historyChildren: React.ReactNode;
  if (historyLoading) historyChildren = <LoadingState />;
  else if (historyError)
    historyChildren = <ErrorState onRetry={refetchHistory} />;
  else if (!history) historyChildren = <NotFoundState />;
  else if (history.length === 0)
    historyChildren = (
      <>
        <table className="w-full text-center text-xl">
          <thead>
            <tr className="text-yellow-400 font-bold">
              <th className={cellPadding}>{translate("no")}</th>
              <th className={cellPadding}>{translate("date")}</th>
              <th className={cellPadding}>{translate("ranking")}</th>
            </tr>
          </thead>
        </table>
        <div className="h-full flex-col-center">
          <p className="text-gray-400 text-lg font-semibold">
            {translate("no_history_yet")}
          </p>
        </div>
      </>
    );
  else
    historyChildren = (
      <table className="w-full text-center text-xl">
        <thead>
          <tr className="text-yellow-400 font-bold">
            <th className={cellPadding}>{translate("no")}</th>
            <th className={cellPadding}>{translate("date")}</th>
            <th className={cellPadding}>{translate("ranking")}</th>
          </tr>
        </thead>
        <tbody>
          {history.map((t, idx) => (
            <React.Fragment key={t.tournamentId}>
              <tr
                className={`text-white border-b border-input-gray cursor-pointer ${
                  idx % 2 === 0 ? "bg-input-gray" : ""
                }`}
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              >
                <td className={cellPadding}>{idx + 1}</td>
                <td className={cellPadding}>{t.date}</td>
                <td className={`${cellPadding} font-bold`}>
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
                          <th className={cellPaddingCollapsible}>
                            {translate("match")}
                          </th>
                          <th className={cellPaddingCollapsible}>
                            {translate("opponent")}
                          </th>
                          <th className={cellPaddingCollapsible}>
                            {translate("score")}
                          </th>
                          <th className={cellPaddingCollapsible}>
                            {translate("result")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.matches.map((m, mIdx) => (
                          <tr key={mIdx} className="text-white">
                            <td
                              className={cellPaddingCollapsible}
                              title={
                                m.round === "QF"
                                  ? translate("quarterfinals")
                                  : m.round === "SF"
                                    ? translate("semifinals")
                                    : m.round === "F"
                                      ? translate("finals")
                                      : ""
                              }
                            >
                              {m.round}
                            </td>
                            <td
                              className={cellPaddingCollapsible}
                              title={m.opponentUsername}
                            >
                              {m.opponentUsername.length > 10
                                ? m.opponentUsername.slice(0, 10) + "…"
                                : m.opponentUsername}
                            </td>
                            <td className={cellPaddingCollapsible}>
                              {m.score}
                            </td>
                            <td
                              className={`${cellPaddingCollapsible} font-bold`}
                            >
                              {m.result === "win" ? (
                                <span className="text-green-400">
                                  {translate("won")}
                                </span>
                              ) : (
                                <span className="text-red-400">
                                  {translate("lost")}
                                </span>
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
    );

  return (
    <PopupCard open={open} onClose={handleClose}>
      <div className="w-full h-full flex-col-between gap-6 overflow-y-auto scrollbar-hide">
        <Header>{translate("header")}</Header>

        {/* Summary */}
        <Subheader>{translate("summary")}</Subheader>
        {statsChildren}

        {/* History */}
        <Subheader>{translate("history")}</Subheader>
        {historyChildren}
      </div>
    </PopupCard>
  );
};

export default TournamentStatsPopup;
