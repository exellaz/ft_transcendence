import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "./User";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // todo: update with real user data from backend
  const fakeUser: User = {
    id: "1",
    username: "ghosty",
    email: "ghosty@transcendence.com",
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
      detailed: {
        tournaments: [
          { tournamentId: "t1", date: "2025-08-01", finalRanking: 1 },
          { tournamentId: "t2", date: "2025-08-15", finalRanking: 3 },
        ],
      },
    },
    friends: [
      {
        id: "f1",
        userId: "1",
        friendId: "2",
        status: "accepted",
        createdAt: "2025-02-01",
        updatedAt: "2025-09-01",
      },
    ],
  };

  const [user, setUser] = useState<User | null>(fakeUser);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
};
