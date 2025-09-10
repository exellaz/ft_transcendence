import db from "./db.ts";

export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Find a user by Google ID
export function findUserByGoogleId(googleId: string): User | undefined {
  const stmt = db.prepare("SELECT * FROM users WHERE google_id = ?");
  return stmt.get(googleId) as User | undefined;
}

// Insert new user
export function createUser(
  googleId: string,
  email: string,
  name: string,
): User {
  const stmt = db.prepare(
    "INSERT INTO users (google_id, email, name) VALUES (?, ?, ?)",
  );
  const info = stmt.run(googleId, email, name);

  return {
    id: info.lastInsertRowid as number,
    google_id: googleId,
    email,
    name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Find or create user
export function findOrCreateUserFromGoogle(
  googleId: string,
  email: string,
  name: string,
): User {
  const user = findUserByGoogleId(googleId);
  if (user) return user;

  return createUser(googleId, email, name);
}
