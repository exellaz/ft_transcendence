import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { uploadsDir } from "../../plugins/avatar-upload";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { ApiError } from "src/utils/response";

const prisma = new PrismaClient();

// helper to generate unique user code *DEPRECATED*
export async function generateUniqueUserCode(
  fastify: FastifyInstance,
  username: string,
) {
  let code: string;
  let exists = true;

  console.log("Generating user code for:", username);
  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const user = await fastify.db.user.findUnique({
      where: { usercode: code }, // compound unique
    });
    exists = !!user;
  }

  return code!;
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Helper to generate JWT token
export function generateAuthToken(userId: number, email: string): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET not configured");
  }

  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "1h";

  return jwt.sign({ userId, email }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  } as SignOptions);
}

// Input validation for registration
export function validateRegistrationInput(
  email: string,
  password: string,
  username: string,
) {
  const errors: string[] = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Invalid email format");
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    );
  }

  if (username.trim().length < 2) {
    errors.push("Username must be at least 2 characters long");
  }
  if (username.length > 15) {
    errors.push("Username must be less than 15 characters");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push(
      "Username can only contain letters, numbers, underscores, and hyphens",
    );
  }

  return errors;
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function validateLoginInput(identifier: string, password: string) {
  const errors: string[] = [];

  if (!identifier || identifier.trim().length === 0) {
    errors.push("Username or email is required");
  }

  if (!password || password.length === 0) {
    errors.push("Password is required");
  }

  return errors;
}

export async function doesUserIdExist(userId: number): Promise<boolean> {
  try {
    const user = await prisma.userSettings.findUnique({
      where: { userId },
    });

    return user !== null; // ✅ Return true only if user exists
  } catch (err) {
    console.error("Error checking user existence:", err);
    return false;
  }
}

export async function uploadFileToServerUploadsDir(
  file: any,
  filename: string,
) {
  const filepath = path.join(uploadsDir, filename);
  try {
    await pipeline(file, createWriteStream(filepath));
    console.log(`[avatar upload] Saved uploaded avatar file to ${filepath}`);
  } catch (err) {
    throw ApiError.internal("Failed to save file", "FILE_SAVE_ERROR");
  }
}
