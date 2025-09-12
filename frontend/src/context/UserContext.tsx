import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface User {
  id: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // todo: update with real user data from backend
  const fakeUser: User = {
    id: "u0",
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
