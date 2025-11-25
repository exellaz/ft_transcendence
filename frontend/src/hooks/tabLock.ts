import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const LOCK_KEY = "appTabLock";
const HEARTBEAT_INTERVAL = 1000; // 1 second
const STALE_THRESHOLD = HEARTBEAT_INTERVAL * 3; // 3 seconds

interface TabLock {
  tabId: string;
  timestamp: number;
}

export const useTabLock = () => {
  const navigate = useNavigate();
  const tabIdRef = useRef<string>(crypto.randomUUID());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const acquireLock = (): boolean => {
    const lockData = localStorage.getItem(LOCK_KEY);

    if (!lockData) {
      // No lock exists, acquire it
      localStorage.setItem(
        LOCK_KEY,
        JSON.stringify({
          tabId: tabIdRef.current,
          timestamp: Date.now(),
        }),
      );
      return true;
    }

    try {
      const lock: TabLock = JSON.parse(lockData);
      const isStale = Date.now() - lock.timestamp > STALE_THRESHOLD;

      if (isStale || lock.tabId === tabIdRef.current) {
        // Lock is stale or belongs to this tab
        localStorage.setItem(
          LOCK_KEY,
          JSON.stringify({
            tabId: tabIdRef.current,
            timestamp: Date.now(),
          }),
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error parsing tab lock:", error);
      // If lock is corrupted, acquire it
      localStorage.setItem(
        LOCK_KEY,
        JSON.stringify({
          tabId: tabIdRef.current,
          timestamp: Date.now(),
        }),
      );
      return true;
    }
  };

  const releaseLock = () => {
    const lockData = localStorage.getItem(LOCK_KEY);
    if (lockData) {
      try {
        const lock: TabLock = JSON.parse(lockData);
        if (lock.tabId === tabIdRef.current) {
          localStorage.removeItem(LOCK_KEY);
        }
      } catch (error) {
        console.error("Error releasing tab lock:", error);
      }
    }
  };

  useEffect(() => {
    // Try to acquire lock on mount
    if (!acquireLock()) {
      console.warn("Another tab is already active");
      navigate("/blocked-multiple-tabs");
      return;
    }

    console.log(`Tab ${tabIdRef.current} acquired lock`);

    // Start heartbeat to maintain lock
    heartbeatIntervalRef.current = setInterval(() => {
      if (!acquireLock()) {
        console.warn("Lost lock to another tab");
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        navigate("/blocked-multiple-tabs");
      }
    }, HEARTBEAT_INTERVAL);

    // Cleanup function
    const cleanup = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      releaseLock();
      console.log(`Tab ${tabIdRef.current} released lock`);
    };

    // Release lock when tab is closed or refreshed
    window.addEventListener("beforeunload", cleanup);
    window.addEventListener("unload", cleanup);

    return () => {
      cleanup();
      window.removeEventListener("beforeunload", cleanup);
      window.removeEventListener("unload", cleanup);
    };
  }, [navigate]);

  return { tabId: tabIdRef.current };
};
