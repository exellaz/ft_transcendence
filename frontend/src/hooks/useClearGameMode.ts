import { useEffect } from "react";

export function useClearGameMode() {
  useEffect(() => {
    sessionStorage.removeItem("gameMode");
  }, []);
}
