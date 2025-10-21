// decodes the JWT payload
export function decodeJWT(token: string | null) {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch {
    return null;
  }
}

// checks that JWT has not expired
export function isTokenValid(token: string | null) {
  const payload = decodeJWT(token);
  if (!payload) return false;
  // exp is a NumericDate — the number of seconds since the Unix epoch (Jan 1, 1970).
  if (payload.exp && typeof payload.exp === "number") {
    // Date.now() gives you the current time in milliseconds, so we divide it by 1000 and floor it to get seconds
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  }
  return true;
}
