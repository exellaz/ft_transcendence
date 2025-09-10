import pkg from "google-auth-library";
const { OAuth2Client } = pkg;
type TokenPayload = import("google-auth-library").TokenPayload;

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<TokenPayload | undefined> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  return ticket.getPayload() || undefined;
}
