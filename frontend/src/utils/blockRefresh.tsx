import { useEffect } from "react";

export function useBlockLeave() {
  useEffect(() => {
    // Prevent refresh (F5 / Ctrl+R)
    const keyHandler = (e: KeyboardEvent) => {
      if (
        e.key === "F5" ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Prevent right-click
    const disableContextMenu = (e: Event) => e.preventDefault();

    // Warn before unload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      sessionStorage.setItem("reloading", "yes"); // Set a flag in sessionStorage
    };

    //beforeUnload.current = handleBeforeUnload;

    window.addEventListener("keydown", keyHandler);
    window.addEventListener("contextmenu", disableContextMenu);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("contextmenu", disableContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
