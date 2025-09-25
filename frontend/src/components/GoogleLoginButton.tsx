import { useEffect } from "react";

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
  onSuccess: (idToken: string) => void;
}

export default function GoogleLoginButton({ onSuccess }: Props) {
  useEffect(() => {
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response: GoogleCredentialResponse) => {
        console.log("Google response:", response);
        const idToken = response.credential;

        const res = await fetch("http://localhost:4000/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        const data = await res.json();
        console.log("Server response", data);

        if (data.ok) {
          localStorage.setItem("token", data.token); // temporary storage
        }

        onSuccess(idToken); // keep calling the parent handler
      },
    });

    window.google.accounts.id.renderButton(
      document.getElementById("google-button"),
      { theme: "outline", size: "large" },
    );
  }, [onSuccess]);

  return <div id="google-button"></div>;
}
