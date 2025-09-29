import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";

// helper to generate unique user code *DEPRECATED*
export async function generateUniqueUserCode(fastify: FastifyInstance, username: string) {
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

  return jwt.sign(
    { userId, email },
    jwtSecret,
    { expiresIn: jwtExpiresIn } as SignOptions
  );
}

// Input validation for registration
export function validateRegistrationInput(email: string, password: string, username: string) {
  const errors: string[] = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Invalid email format");
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push("Password must contain at least one uppercase letter, one lowercase letter, and one number");
  }

  if (username.trim().length < 2) {
    errors.push("Username must be at least 2 characters long");
  }
  if (username.length > 15) {
    errors.push("Username must be less than 15 characters");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push("Username can only contain letters, numbers, underscores, and hyphens");
  }

  return errors;
}