import { useEffect, useCallback, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import Button from "./Button";

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement | null,
            options: Record<string, unknown>,
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface Props {
  onSuccess?: (idToken: string) => void;
  onError?: (error: string) => void;
}

export default function GoogleLoginButton({ onSuccess, onError }: Props) {
  const { t } = useTranslation();
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const hiddenButtonRef = useRef<HTMLDivElement>(null);

  const translate = (key: string) => t(`LoginView.${key}`);

  const handleGoogleResponse = useCallback(
    async (response: GoogleCredentialResponse) => {
      try {
        const idToken = response.credential;

        if (!idToken) {
          onError?.("no_credential");
          return;
        }
        onSuccess?.(idToken);
      } catch (error) {
        console.error("Google OAuth error:", error);
        onError?.("google_signin_failed");
      }
    },
    [onSuccess, onError],
  );

  const handleGoogleLogin = useCallback(() => {
    if (!isGoogleReady || !window.google) {
      onError?.("Google Sign-In is not ready yet. Please try again.");
      return;
    }

    const googleButton = hiddenButtonRef.current?.querySelector(
      'div[role="button"]',
    ) as HTMLElement;
    if (googleButton) {
      googleButton.click();
    } else {
      console.error("Google button not found");
      onError?.("Failed to trigger Google Sign-In. Please try again.");
    }
  }, [isGoogleReady, onError]);

  useEffect(() => {
    // Prevent re-initialization if already done
    if (isInitialized) return;

    const loadGoogleScript = () => {
      if (window.google) {
        initializeGoogle();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      script.onerror = () => {
        console.error("Failed to load Google script");
        onError?.("Failed to load Google Sign-In");
      };
      document.head.appendChild(script);
    };

    const initializeGoogle = () => {
      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        if (!clientId) {
          console.error("Google Client ID not found");
          onError?.("Google Sign-In configuration error");
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });

        if (hiddenButtonRef.current) {
          window.google.accounts.id.renderButton(hiddenButtonRef.current, {
            theme: "outline",
            size: "large",
            type: "standard",
          });
        }

        setIsGoogleReady(true);
        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing Google:", error);
        onError?.("Failed to initialize Google Sign-In");
      }
    };

    loadGoogleScript();
  }, []); // Remove dependencies to prevent re-initialization

  // Update the callback when props change, but don't re-initialize
  useEffect(() => {
    if (isInitialized && window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
        callback: handleGoogleResponse,
      });
    }
  }, [handleGoogleResponse, isInitialized]);
  return (
    <>
      {/* Hidden Google button */}
      <div
        ref={hiddenButtonRef}
        style={{
          position: "absolute",
          left: "-9999px",
          visibility: "hidden",
          pointerEvents: "none",
        }}
      />

      {/* Custom styled button */}
      <Button
        variant="longWhite"
        className="flex-row-center gap-2"
        onClick={handleGoogleLogin}
        disabled={!isGoogleReady}
      >
        <div>
          <img src="/assets/google.png" alt="google.png" className="w-5" />
        </div>
        {isGoogleReady ? translate("continue_with_google") : "loading"}
      </Button>
    </>
  );
}
