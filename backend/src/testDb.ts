import db from "./db.ts";
import {
  createUser,
  findUserByGoogleId,
  findOrCreateUserFromGoogle,
} from "./userModel.ts";

const testGoogleId = "test-google-id-123";
const testEmail = "test@example.com";
const testName = "Test User";

console.log("🔎 Running DB test...");

const newUser = createUser(testGoogleId, testEmail, testName);
console.log("✅ Created user:", newUser);

const fetchedUser = findUserByGoogleId(testGoogleId);
console.log("✅ Fetched user:", fetchedUser);

const userAgain = findOrCreateUserFromGoogle(testGoogleId, testEmail, testName);
console.log("✅ findOrCreateUserFromGoogle:", userAgain);

db.close();
