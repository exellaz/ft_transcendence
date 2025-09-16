import { OAuth2Client } from "google-auth-library";
import { authConfig } from "./config/authConfig.ts";
import bcrypt from "bcrypt";

const client = new OAuth2Client(authConfig.googleClientId);

export async function verifyGoogleIdToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: authConfig.googleClientId,
  });

  return ticket.getPayload();
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}