import { useEffect, useRef } from "react";

export function useBlockLeave() {
  const beforeUnload = useRef<(e: BeforeUnloadEvent) => any>(() => {});

  useEffect(() => {
    // Prevent refresh (F5 / Ctrl+R)
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Prevent right-click
    const disableContextMenu = (e: Event) => e.preventDefault();

    // Warn before unload
    window.addEventListener(
      "beforeunload",
      (beforeUnload.current = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
        return "";
      })
    );

    window.addEventListener("keydown", keyHandler);
    window.addEventListener("contextmenu", disableContextMenu);

    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("contextmenu", disableContextMenu);
      window.removeEventListener("beforeunload", beforeUnload.current as any);
    };
  }, []);
}

