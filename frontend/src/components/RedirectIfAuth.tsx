import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserProvider";
import { useOnlineStatus } from "@/context/OnlineStatusProvider";

export default function RedirectIfAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useUser();
  const { isDuplicateLogin } = useOnlineStatus();
  if (isAuthenticated && !isDuplicateLogin) {
    // TODO: add check -> client is not a duplicate login
    // replace prevents adding a new history entry
    return <Navigate to="/main-menu" replace />;
  }
  return children;
}
