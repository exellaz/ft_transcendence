import { useEffect } from "react";

export function useBlockLeave() {
  useEffect(() => {
    // Prevent refresh (F5 / Ctrl+R)
    const keyHandler = (e: KeyboardEvent) => {
      if (
        e.key === "F5" ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") ||
        ((e.altKey || e.metaKey) && e.key === "ArrowLeft") ||
        ((e.altKey || e.metaKey) && e.key === "ArrowRight")
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
      sessionStorage.setItem("reloading", "yes");
    };

    // Handle back/forward button - no navigation allowed
    //initialize history to current page when first loaded
    window.history.pushState(window.history.state, "", window.location.href);
    const onPopState = (e: PopStateEvent) => {
      e.preventDefault();
      // Push the current page back onto the history stack so that the user stays on the same page
      window.history.pushState(window.history.state, "", window.location.href);
    };

    window.addEventListener("keydown", keyHandler);
    window.addEventListener("contextmenu", disableContextMenu);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("contextmenu", disableContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
}
