import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserProvider";
import { useClearGameMode } from "../hooks/useClearGameMode";

export default function CatchAllRedirect() {
  const { isAuthenticated } = useUser();

  useClearGameMode();

  return <Navigate to={isAuthenticated ? "/main-menu" : "/login"} replace />;
}
