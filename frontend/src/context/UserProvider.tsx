import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  status: string;
  joinedAt: string;
  updatedAt: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // todo: update with real user data from backend
  // const [user, ]: User = {
  //   id: "u0",
  // };

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      // TODO: Validate token in backend
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  }

  const isAuthenticated = !!user;

  return (
    <UserContext.Provider value={{ user,
      setUser,
      isAuthenticated,
      logout
      }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
};
