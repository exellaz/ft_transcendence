import React, { createContext, useContext, useState, useMemo } from "react";
import type { ReactNode } from "react";
import type { User, UserProfile } from "./User";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  userProfile: UserProfile | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // todo: update with real user data from backend
  const fakeUser: User = {
    id: "12958433",
    username: "ghostyyyyyyyyyyyy",
    email: "ghosty@gmail.com",
    avatarUrl: "/assets/red-ghost.png",
    isActive: true,
    createdAt: "2025-01-01",
    updatedAt: "2025-09-06",
    result: "online",
    settings: {
      language: "en",
      inGameCameraTracking: "dynamic",
    },
    stats: {
      medals: { gold: 3, silver: 2, bronze: 1 },
      tournamentsPlayed: 10,
      averageRanking: 2.5,
    },
    detailedStats: {
      tournaments: [
        // Winner (ranking: 1)
        {
          tournamentId: "t1",
          date: "2025-08-01",
          ranking: 1,
          matches: [
            {
              match: "QF",
              opponentUsername: "playerA",
              score: "10-7",
              result: "win",
            },
            {
              match: "SF",
              opponentUsername: "playerB",
              score: "8-6",
              result: "win",
            },
            {
              match: "F",
              opponentUsername: "playerC",
              score: "9-8",
              result: "win",
            },
          ],
        },
        // Finals loser (ranking: 2)
        {
          tournamentId: "t2",
          date: "2025-08-15",
          ranking: 2,
          matches: [
            {
              match: "QF",
              opponentUsername: "playerD",
              score: "11-9",
              result: "win",
            },
            {
              match: "SF",
              opponentUsername: "playerE",
              score: "7-6",
              result: "win",
            },
            {
              match: "F",
              opponentUsername: "playerF",
              score: "7-9",
              result: "lost",
            },
          ],
        },
        // Semifinals loser (ranking: 3)
        {
          tournamentId: "t3",
          date: "2025-08-15",
          ranking: 3,
          matches: [
            {
              match: "QF",
              opponentUsername: "playerG",
              score: "9-6",
              result: "win",
            },
            {
              match: "SF",
              opponentUsername: "playerH",
              score: "5-8",
              result: "lost",
            },
            // Did not reach finals
          ],
        },
        // Semifinals loser (ranking: 4)
        {
          tournamentId: "t4",
          date: "2025-08-15",
          ranking: 4,
          matches: [
            {
              match: "QF",
              opponentUsername: "playerI",
              score: "8-7",
              result: "win",
            },
            {
              match: "SF",
              opponentUsername: "playerJ",
              score: "4-9",
              result: "lost",
            },
          ],
        },
        // Quarterfinals loser (ranking: 5)
        {
          tournamentId: "t5",
          date: "2025-08-15",
          ranking: 5,
          matches: [
            {
              match: "QF",
              opponentUsername: "playerK",
              score: "4-10",
              result: "lost",
            },
          ],
        },
        // Quarterfinals loser (ranking: 6)
        {
          tournamentId: "t6",
          date: "2025-08-15",
          ranking: 6,
          matches: [
            {
              match: "QF",
              opponentUsername: "playerL",
              score: "5-9",
              result: "lost",
            },
          ],
        },
        // Quarterfinals loser (ranking: 7)
        {
          tournamentId: "t7",
          date: "2025-08-15",
          ranking: 7,
          matches: [
            {
              match: "QF",
              opponentUsername: "playerM",
              score: "6-8",
              result: "lost",
            },
          ],
        },
        // Quarterfinals loser (ranking: 8)
        {
          tournamentId: "t8",
          date: "2025-08-15",
          ranking: 8,
          matches: [
            {
              match: "QF",
              opponentUsername: "playerN",
              score: "3-10",
              result: "lost",
            },
          ],
        },
      ],
    },
    friends: [
      {
        id: "f1",
        userId: "12958433",
        friendId: "48392017",
        result: "accepted",
        createdAt: "2025-02-01",
        updatedAt: "2025-09-01",
      },
    ],
  };

  const [user, setUser] = useState<User | null>(fakeUser);

  const userProfile = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      stats: user.stats,
    };
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser, userProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
};
