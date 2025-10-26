import { OAuth2Client } from "google-auth-library";
import { userPublicSelect } from "../users/users.select";
import { PrismaClient } from "@prisma/client";

const clientId: string = process.env.GOOGLE_CLIENT_ID || "";
const client = new OAuth2Client(clientId);

export async function verifyGoogleIdToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  return ticket.getPayload();
}

const prisma = new PrismaClient();

export async function findOrCreateGoogleUser(
  googleId: string,
  email: string,
  name: string,
) {
  let user = await prisma.user.findUnique({
    where: { googleId: googleId },
    select: userPublicSelect,
  });

  if (user) {
    return user;
  }

  // Check if user exists with this email (regular signup first)
  user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: userPublicSelect,
  });

  if (user) {
    // Link Google account to existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: googleId },
      select: userPublicSelect,
    });
    return user;
  }

  // Create new Google user with default settings
  user = await prisma.user.create({
    data: {
      googleId: googleId,
      email: email.toLowerCase().trim(),
      username: name,
      password: null,
      settings: { create: {} },
    },
    select: userPublicSelect,
  });

  return user;
}

export async function updateLastLogin(userId: number): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { updatedAt: new Date() },
    });
  } catch (error) {
    console.error(`Failed to update last login for user ${userId}:`, error);
  }
}
