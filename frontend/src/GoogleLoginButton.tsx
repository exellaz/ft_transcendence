import { useEffect } from "react";

declare global {
  interface Window {
    google: any;
  }
}

interface Props {
  onSuccess: (idToken: string) => void;
}

export default function GoogleLoginButton({ onSuccess }: Props) {
  useEffect(() => {
    // Load Google button
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (response: any) => {
        console.log("Google response:", response);
        onSuccess(response.credential); // the ID token
      },
    });

    window.google.accounts.id.renderButton(
      document.getElementById("google-button"),
      { theme: "outline", size: "large" }
    );
  }, [onSuccess]);

  return <div id="google-button"></div>;
}
