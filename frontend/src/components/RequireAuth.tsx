import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserProvider";
import { isTokenValid } from "../utils/jwt";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { logout } = useUser();
  const location = useLocation();

  const token = localStorage.getItem("authToken");
  if (!isTokenValid(token)) {
    // clear stale token and context
    localStorage.removeItem("authToken");
    logout();
    // location represents the current page the user was on before being redirected
    // replace prevents adding a new history entry
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
