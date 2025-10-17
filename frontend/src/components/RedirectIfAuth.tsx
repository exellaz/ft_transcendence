import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserProvider";

export default function RedirectIfAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useUser();
  if (isAuthenticated) {
    // replace prevents adding a new history entry
    return <Navigate to="/main-menu" replace />;
  }
  return children;
}
