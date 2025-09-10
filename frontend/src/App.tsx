import { useState } from "react";
import GoogleLoginButton from "./GoogleLoginButton";

function App() {
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

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Google Login Test</h1>
      <GoogleLoginButton onSuccess={handleGoogleSuccess} />
      <pre>{message}</pre>
    </div>
  );
}

export default App;
