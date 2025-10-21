import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserProvider";
import { isTokenValid } from "../utils/jwt";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const { isAuthenticated, logout } = useUser();
  const token = localStorage.getItem("authToken");
  const valid = isAuthenticated && isTokenValid(token);

  useEffect(() => {
    if (!valid) {
      // clear stale token and context
      localStorage.removeItem("authToken");
      logout();
      setShouldRedirect(true);
    }
  }, [valid, logout]);

  // replace prevents adding a new history entry
  if (!valid && shouldRedirect) return <Navigate to="/login" replace />;
  if (!valid) return null; // avoid flicker while effect runs

  return children;
}
