import db from "./db.ts";

export interface User {
  id: number;
  googleId: string | null;
  email: string;
  name: string;
  passwordHash: string | null;
  createdAt: string;
  updatedAt: string;
}

// Find a user by Google ID
export function findUserByGoogleId(googleId: string): User | undefined {
  const stmt = db.prepare("SELECT * FROM users WHERE google_id = ?");
  return stmt.get(googleId) as User | undefined;
}

// Insert new user
export function createUserWithGoogle(
  googleId: string,
  email: string,
  name: string,
): User | undefined {
  const stmt = db.prepare(`
    INSERT INTO users (google_id, email, name, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `);
  const info = stmt.run(googleId, email, name);
  return getUserById(info.lastInsertRowid as number);
}

// Find or create user
export function findOrCreateUserFromGoogle(
  googleId: string,
  email: string,
  name: string,
): User {
  const user = findUserByGoogleId(googleId);
  if (user) return user;

  const created = createUserWithGoogle(googleId, email, name);
  if (!created) throw new Error("Failed to create user");
  return created;
}

export function getUserById(id: number): User | undefined {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  return stmt.get(id) as User | undefined;
}

export function getUserByEmail(email: string): User | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
}

export function updateLastLogin(id: number): void {
  const stmt = db.prepare(
    "UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  );
  stmt.run(id);
}

export function createUserWithPassword(email: string, name: string, passwordHash: string) {
  const stmt = db.prepare(`
    INSERT INTO users (email, name, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `);
  const result = stmt.run(email, name, passwordHash);
  return getUserById(result.lastInsertRowid as number);
}