import React from "react";
import { useUser } from "../context/UserContext";

import Header from "../components/Header";
import Medals from "../components/Medals";
import PopupCard from "../components/PopupCard";
import StatsBadge from "../components/StatsBadge";
import Subheader from "../components/Subheader";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const TournamentStatsPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  const { user } = useUser();
  const [expandedIdx, setExpandedIdx] = React.useState<number | null>(null);

  function handleClose() {
    onClose();
    setExpandedIdx(null);
  }

  return (
    <PopupCard open={open} onClose={handleClose}>
      <div className="overflow-y-auto scrollbar-hide">
        <Header>Tournament Statistics</Header>
        <div className="w-full flex flex-col items-center gap-6">
          <Subheader>Summary</Subheader>
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
          <Subheader>Tournament History</Subheader>
          <table className="w-full text-center text-xl">
            <thead>
              <tr className="text-yellow-400 font-bold">
                <th className="py-2 px-4">No</th>
                <th className="py-2 px-4">Date</th>
                <th className="py-2 px-4">Ranking</th>
              </tr>
            </thead>
            <tbody>
              {user?.detailedStats?.tournaments.map((t, idx) => (
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
                          title="Gold"
                          className="inline-block w-6"
                        />
                      ) : t.ranking === 2 ? (
                        <img
                          src="/assets/silver.png"
                          alt="Silver"
                          title="Silver"
                          className="inline-block w-6"
                        />
                      ) : t.ranking === 3 ? (
                        <img
                          src="/assets/bronze.png"
                          alt="Bronze"
                          title="Bronze"
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
                              <th className="py-1 px-2">Match</th>
                              <th className="py-1 px-2">Opponent</th>
                              <th className="py-1 px-2">Score</th>
                              <th className="py-1 px-2">Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.matches.map((m, mIdx) => (
                              <tr key={mIdx} className="text-white">
                                <td
                                  className="py-1 px-2"
                                  title={
                                    m.match === "QF"
                                      ? "Quarterfinals"
                                      : m.match === "SF"
                                      ? "Semifinals"
                                      : m.match === "F"
                                      ? "Finals"
                                      : ""
                                  }
                                >
                                  {m.match}
                                </td>
                                <td className="py-1 px-2" title={m.opponentUsername}>
                                  {m.opponentUsername.length > 10 ? m.opponentUsername.slice(0, 10) + "…" : m.opponentUsername}
                                </td>
                                <td className="py-1 px-2">{m.score}</td>
                                <td className="py-1 px-2 font-bold">
                                  {m.result === "win" ? (
                                    <span className="text-green-400">Won</span>
                                  ) : (
                                    <span className="text-red-400">Lost</span>
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
