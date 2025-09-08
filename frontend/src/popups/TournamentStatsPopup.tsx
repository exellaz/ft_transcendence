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

  return (
    <PopupCard
      open={open}
      onClose={onClose}
      className="overflow-y-auto scrollbar-hide"
    >
      <Header>Tournament Statistics</Header>
      <div className="w-full flex flex-col items-center gap-6">
        <Subheader>Summary</Subheader>
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
            {user?.detailedStats.tournaments.map((t, idx) => (
              <tr
                key={t.tournamentId}
                className={`text-white ${
                  idx % 2 === 0 ? "bg-card-blue-accent" : ""
                } border-b border-input-gray`}
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
            ))}
          </tbody>
        </table>
      </div>
    </PopupCard>
  );
};

export default TournamentStatsPopup;
