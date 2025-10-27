import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserProvider";

export default function CatchAllRedirect() {
  const { isAuthenticated } = useUser();
  return (
    <Navigate
      to={isAuthenticated ? "/main-menu" : "/login"}
      replace
    />
  );
}
