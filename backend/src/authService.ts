import { OAuth2Client } from "google-auth-library";
import { authConfig } from "./config/authConfig.ts";

const client = new OAuth2Client(authConfig.googleClientId);

export async function verifyGoogleIdToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: authConfig.googleClientId,
  });

  return ticket.getPayload();
}
