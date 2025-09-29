import { useState } from "react";
import GoogleLoginButton from "./components/GoogleLoginButton";

function PreviewLogin() {
  const [message, setMessage] = useState("");

  const handleGoogleSuccess = async (idToken: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      console.log("Backend response:", data);
      setMessage(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      setMessage("Login failed");
    }
  };

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("No token found, login first!");
      return;
    }

    const res = await fetch(`${import.meta.env.VITE_API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    setMessage(JSON.stringify(data, null, 2));
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Google Login Test</h1>
      <GoogleLoginButton onSuccess={handleGoogleSuccess} />

      <button
        style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}
        onClick={fetchProfile}
      >
        Get Profile
      </button>

      <pre>{message}</pre>
    </div>
  );
}

export default PreviewLogin;
