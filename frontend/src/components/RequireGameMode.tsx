import { Navigate } from "react-router-dom";

// three allowed game modes: local, custom, tournament
// if the current mode is not in the allowed list, redirect to main menu
export default function RequireGameMode({
  allowed,
  children,
}: {
  allowed: (
    | "local"
    | "custom"
    | "remote"
    | "tournament"
    | "local-tournament"
  )[];
  children: React.ReactNode;
}) {
  const mode = sessionStorage.getItem("gameMode") as
    | "local"
    | "custom"
    | "tournament"
    | null;

  if (!mode || !allowed.includes(mode)) {
    sessionStorage.removeItem("gameMode");
    return <Navigate to="/main-menu" replace />;
  }

  return <>{children}</>;
}
