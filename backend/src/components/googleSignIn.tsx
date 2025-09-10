import React, { useEffect } from 'react';

declare global {
  interface Window { google: any; }
}

export default function GoogleSignIn() {
  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        const idToken = response.credential;
        const res = await fetch('http://localhost:4000/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        });
        const data = await res.json();
        console.log('Server response', data);
      }
    });

    window.google?.accounts.id.renderButton(
      document.getElementById('google-signin-button'),
      { theme: 'outline', size: 'large' }
    );
  }, []);

  return <div id="google-signin-button"></div>;
}