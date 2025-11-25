import { useEffect } from "react";
import Button from "@/components/Button";

export default function BlockedMultipleTabs() {
  useEffect(() => {
    // Optional: Try to close the tab automatically
    // Note: This only works if the tab was opened via JavaScript
    const attemptClose = () => {
      window.close();
    };

    // Wait a bit before attempting to close
    const timer = setTimeout(attemptClose, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    // Clear the lock and navigate to home to restart the lock acquisition

    const token = localStorage.getItem("authToken");
    const tabLock = localStorage.getItem("appTabLock");

    if (token && tabLock) return;
    localStorage.removeItem("appTabLock");
    window.location.href = "/";
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Multiple Tabs Detected
        </h1>
        <p className="text-gray-300 mb-4">
          This application can only be open in one tab at a time.
        </p>
        <p className="text-gray-400 mb-6">
          Please close this tab and use the existing one, or close the other tab
          to use this one.
        </p>
        <div className="space-y-3">
          <Button variant="longWhite" onClick={handleRetry} className="w-full">
            Retry (Close Other Tabs First)
          </Button>
        </div>
      </div>
    </div>
  );
}
