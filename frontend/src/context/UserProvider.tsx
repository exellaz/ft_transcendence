import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User } from "../types/usersApi";
import { decodeJWT, isTokenValid } from "../utils/jwt";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
  token: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (token && isTokenValid(token)) {
      // TODO: Validate token in backend
      const payload = decodeJWT(token);
      if (payload?.userId) {
        // Number() conversion necessary because JWT payload is string
        setUser({ id: Number(payload.userId) } as User);
      } else {
        setUser(null);
      }
    } else {
      // remove stale tokens
      if (token) localStorage.removeItem("authToken");
      setUser(null);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  // compute authenticated from token validity (not solely from user state)
  // important because user state may be null before useEffect is run, which can
  // result in race conditions or UI flicker when logged in user is being redirected.
  const isAuthenticated = isTokenValid(localStorage.getItem("authToken"));

  return (
    <UserContext.Provider
      value={{ user, setUser, isAuthenticated, logout, token }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
};
