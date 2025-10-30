import { OAuth2Client } from "google-auth-library";
import { userPublicSelect } from "../users/users.select";
import { ApiError } from "../../utils/response";
import { FastifyInstance } from "fastify";
import { TwoFactorService } from "../twoFactor/twoFactor.service";

const clientId: string = process.env.GOOGLE_CLIENT_ID || "";
const client = new OAuth2Client(clientId);

export async function verifyGoogleIdToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  return ticket.getPayload();
}

export async function findOrCreateGoogleUser(
  googleId: string,
  email: string,
  name: string,
  fastify: FastifyInstance,
  twoFactorCode?: string,
) {
  let user = await fastify.db.user.findUnique({
    where: { googleId: googleId },
    select: {
      ...userPublicSelect,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });

  if (user) {
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw ApiError.unauthorized(
          "Two-factor authentication required",
          "TWO_FACTOR_REQUIRED",
        );
      }

      const isValid2FA = TwoFactorService.verifyToken(
        twoFactorCode,
        user.twoFactorSecret,
      );
      if (!isValid2FA) {
        throw ApiError.unauthorized(
          "Invalid two-factor authentication token",
          "INVALID_TWO_FACTOR_TOKEN",
        );
      }
    }
    return user;
  }

  // Check if user exists with this email (regular signup first)
  user = await fastify.db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: userPublicSelect,
  });

  if (user) {
    // Link Google account to existing user
    user = await fastify.db.user.update({
      where: { id: user.id },
      data: { googleId: googleId },
      select: userPublicSelect,
    });
    return user;
  }

  user = await fastify.db.user.findUnique({
    where: { username: name },
    select: userPublicSelect,
  });

  if (user) {
    name = "user_" + googleId.slice(-6);
  }

  // Create new Google user with default settings
  user = await fastify.db.user.create({
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

export function sanitizeUsername(name: string, googleId: string): string {
  // Remove invalid characters - keep only alphanumeric, underscore, and hyphen
  let sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "").trim();

  if (sanitized.length > 15) {
    sanitized = sanitized.substring(0, 15);
  }

  if (sanitized.length < 2) {
    const googleIdSuffix = googleId.slice(-6);
    sanitized = `user_${googleIdSuffix}`;

    if (sanitized.length > 15) {
      sanitized = sanitized.substring(0, 15);
    }
  }

  // Final validation - ensure result matches schema pattern
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    const googleIdSuffix = googleId.slice(-6);
    sanitized = `user_${googleIdSuffix}`.substring(0, 15);
  }

  return sanitized;
}
