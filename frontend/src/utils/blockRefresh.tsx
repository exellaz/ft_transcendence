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
      sessionStorage.setItem("reloading", "yes"); // Set a flag in sessionStorage
    };

   // Prevent back/forward by pushing a history entry and restoring it on popstate.
    // Note: this doesn't "disable" the buttons — it makes simple back/forward navigation return here.
    const pushState = () => {
      try {
        history.pushState(null, document.title, window.location.href);
      } catch {
        // some environments may restrict pushState
      }
    };

    const onPopState = (e: PopStateEvent) => {
      // don't create a new history entry here — go forward to restore the blocked state
      try {
        history.go(1);
      } catch {
        // fallback: re-push if go(1) isn't available in some envs
        pushState();
      }
    };

    // initialize
    pushState();

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
