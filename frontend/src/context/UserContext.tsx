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
    username: "ghosty",
    email: "ghosty@gmail.com",
    avatarUrl: "/assets/red-ghost.png",
    isActive: true,
    createdAt: "2025-01-01",
    updatedAt: "2025-09-06",
    status: "online",
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
        { tournamentId: "t1", date: "2025-08-01", ranking: 1 },
        { tournamentId: "t2", date: "2025-08-15", ranking: 3 },
        { tournamentId: "t3", date: "2025-08-15", ranking: 2 },
        { tournamentId: "t4", date: "2025-08-15", ranking: 7 },
        { tournamentId: "t5", date: "2025-08-15", ranking: 4 },
        { tournamentId: "t6", date: "2025-08-15", ranking: 3 },
        { tournamentId: "t7", date: "2025-08-15", ranking: 8 },
        { tournamentId: "t8", date: "2025-08-15", ranking: 3 },
      ],
    },
    friends: [
      {
        id: "f1",
        userId: "12958433",
        friendId: "48392017",
        status: "accepted",
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
