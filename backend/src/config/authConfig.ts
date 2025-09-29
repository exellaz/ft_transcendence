import dotenv from "dotenv";

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("❌ Missing JWT_SECRET in .env file");
}

const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "1h";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
if (!googleClientId) {
  throw new Error("❌ Missing GOOGLE_CLIENT_ID in .env file");
}

export const authConfig = {
  jwtSecret,
  jwtExpiresIn,
  googleClientId,
};
